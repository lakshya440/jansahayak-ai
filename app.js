const $ = s => document.querySelector(s);
const messages = $('#messages'), welcome = $('#welcome'), input = $('#messageInput'), sendBtn = $('#sendBtn'), dialog = $('#profileDialog'), form = $('#profileForm'), applicationDialog=$('#applicationDialog'),draftForm=$('#draftForm');
const authDialog=$('#authDialog'),authForm=$('#authForm');
let busy=false, recorder=null, recognizer=null, voiceStream=null, chunks=[], recording=false, speechText='',voiceCancelled=false,voiceSession=0;
const voiceInline=$('#voiceInline');
const voiceOrb=$('#voiceOrb');
voiceOrb.replaceChildren(...Array.from({length:43},(_,index)=>{const bar=document.createElement('i');bar.style.setProperty('--bar-index',index);return bar;}));
let authToken=sessionStorage.getItem('janSahayakToken')||'',currentUser=null,authMode='signup',afterAuth=null,currentConversationId=null,conversationList=[],chatHistory=[];
function apiHeaders(json=true){const headers={};if(json)headers['content-type']='application/json';if(authToken)headers.authorization=`Bearer ${authToken}`;return headers;}
function requestAuth(callback=null){afterAuth=callback;$('#authError').textContent='';authDialog.showModal();}
function updateAccount(user){currentUser=user;$('#accountName').textContent=user?.name||'Guest';$('#accountStatus').textContent=user?.email||'Exploring schemes';$('#topAccountLabel').textContent=user?'My account':'Log in';$('#logoutBtn').hidden=!user;}

function escapeHTML(s){return String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
function formatText(text){return escapeHTML(text).replace(/(https:\/\/[^\s)]+)/g,'<a href="$1" target="_blank" rel="noopener">$1</a>');}
function cleanVoiceTranscript(value){
  const text=String(value||'').replace(/\s+/g,' ').trim();if(!text)return '';
  const seen=new Set();
  return text.split(/(?<=[.!?।])\s+/u).filter(part=>{const key=part.trim().toLocaleLowerCase();if(!key||seen.has(key))return false;seen.add(key);return true;}).join(' ').slice(0,4000);
}
function wantsApplication(text){const q=String(text).toLowerCase();if(/how (?:do|can|to) i apply|steps? to apply|how to fill|आवेदन कैसे|अप्लाई कैसे/.test(q))return false;return /apply\s+(?:in|for|to)\s+(?:this|it|that)\b|apply for me|apply on my behalf|apply.{0,60}(?:for me|on my behalf)|i\s+(?:want|need|wanna|would like)\s+(?:to\s+)?(?:apply|submit)|(?:can|could) you\s+(?:apply|submit|fill)|please\s+(?:apply|submit|fill)|help me\s+(?:apply|fill)|start (?:an? )?application|submit (?:an? )?application|मेरे लिए आवेदन|मैं आवेदन करना|मुझे आवेदन करना|आवेदन करना (?:चाहता|है)|आवेदन कर दीजिए|अप्लाई कर|मुझे अप्लाई करना|मेरे लिए फॉर्म/.test(q);}
function addMessage(role,text,typing=false){
  welcome.hidden=true;
  const item=document.createElement('div'); item.className=`message ${role}${typing?' typing':''}`;
  item.innerHTML=`<div class="message-avatar">${role==='user'?'●':'✳'}</div><div class="bubble">${formatText(text)}</div>`;
  messages.append(item); item.scrollIntoView({behavior:'smooth',block:'end'}); return item;
}
function addApplicationCTA(container,schemeId=null){
  if(container.querySelector('.application-cta'))return;
  const start=document.createElement('button');start.type='button';start.className='save-profile application-cta';start.textContent='Create demo application draft →';
  start.addEventListener('click',()=>openApplication(schemeId));container.append(document.createElement('br'),start);
}
async function send(text){
  text=(text??input.value).trim(); if(!text||busy)return;
  input.value=''; input.style.height='auto'; addMessage('user',text); const pending=addMessage('assistant','Thinking…',true); busy=true;sendBtn.disabled=true;
  try{
    const response=await fetch('/api/chat',{method:'POST',headers:apiHeaders(),body:JSON.stringify({message:text,language:$('#language').value,conversationId:currentConversationId,history:chatHistory.slice(-10)})});
    const data=await response.json().catch(()=>({})); if(!response.ok)throw new Error(data.error||`Server error (${response.status}). Please try again.`);
    pending.classList.remove('typing');
    const sourceLinks=(data.sources||[]).map(s=>`<a href="${escapeHTML(s.url)}" target="_blank" rel="noopener">${escapeHTML(s.title||s.url)}</a>`);
    const sourcesHtml=sourceLinks.length?`\n\nSources:\n${sourceLinks.map((x,i)=>`${i+1}. ${x}`).join('\n')}`:'';
    pending.querySelector('.bubble').innerHTML=formatText(data.answer||'I could not find an answer. Please try again.')+sourcesHtml;
    chatHistory.push({role:'user',content:text},{role:'assistant',content:data.answer||''});
    if(data.conversationId)currentConversationId=data.conversationId;
    if(data.action?.type==='application_draft'||wantsApplication(text))addApplicationCTA(pending.querySelector('.bubble'),data.action?.schemeId||null);
    if(authToken)await loadConversations(false);
  }catch(e){pending.classList.remove('typing');pending.querySelector('.bubble').textContent=e.message||'Something went wrong. Please try again.';if(wantsApplication(text))addApplicationCTA(pending.querySelector('.bubble'));}
  finally{busy=false;sendBtn.disabled=false;input.focus();}
}
sendBtn.addEventListener('click',()=>send());
input.addEventListener('input',()=>{input.style.height='auto';input.style.height=Math.min(input.scrollHeight,120)+'px';});
input.addEventListener('keydown',e=>{if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();send();}});
document.querySelectorAll('[data-prompt]').forEach(el=>el.addEventListener('click',()=>send(el.dataset.prompt)));
$('#newChat').addEventListener('click',()=>{currentConversationId=null;chatHistory=[];messages.replaceChildren();welcome.hidden=false;input.focus();renderConversations();});
document.addEventListener('keydown',e=>{if((e.metaKey||e.ctrlKey)&&e.key.toLowerCase()==='k'){e.preventDefault();$('#newChat').click();}});
function readSavedProfile(){try{return JSON.parse(sessionStorage.getItem('janSahayakProfile')||'{}')}catch{return {}}}
function fillForm(formElement,values){for(const [key,value] of Object.entries(values||{})){const field=formElement.elements.namedItem(key);if(field&&value!=null)field.value=String(value)}}
function renderConversations(){
  const list=$('#conversationList');$('#newChat').classList.toggle('active',!currentConversationId);list.replaceChildren();if(!authToken){const empty=document.createElement('div');empty.className='history-empty';empty.textContent='Log in to save chat history.';list.append(empty);return;}
  if(!conversationList.length){const empty=document.createElement('div');empty.className='history-empty';empty.textContent='Your saved conversations will appear here.';list.append(empty);return;}
  for(const item of conversationList){const row=document.createElement('div');row.className=`chat-history-row${item.id===currentConversationId?' selected':''}`;const open=document.createElement('button');open.type='button';open.className='chat-history-item';open.textContent=item.title||'Conversation';open.title=item.title||'Conversation';open.addEventListener('click',()=>loadConversation(item.id));const remove=document.createElement('button');remove.type='button';remove.className='chat-history-delete';remove.textContent='×';remove.setAttribute('aria-label',`Delete ${item.title||'conversation'}`);remove.addEventListener('click',async event=>{event.stopPropagation();if(!confirm('Delete this conversation and its messages?'))return;try{const response=await fetch(`/api/conversations/${item.id}`,{method:'DELETE',headers:apiHeaders(false)});const result=await response.json();if(!response.ok)throw new Error(result.error);conversationList=conversationList.filter(chat=>chat.id!==item.id);if(currentConversationId===item.id){currentConversationId=null;chatHistory=[];messages.replaceChildren();welcome.hidden=false;}renderConversations();}catch(error){remove.title=error.message||'Could not delete conversation.';}});row.append(open,remove);list.append(row);}
}
function renderApplicationProgress(applications=[]){
  const list=$('#applicationProgressList');list.replaceChildren();
  if(!authToken){const empty=document.createElement('div');empty.className='history-empty';empty.textContent='Log in to track your applications.';list.append(empty);return;}
  if(!applications.length){const empty=document.createElement('div');empty.className='history-empty';empty.textContent='Your saved application drafts will appear here.';const start=document.createElement('button');start.type='button';start.className='progress-empty-action';start.textContent='Start an application draft';start.addEventListener('click',()=>openApplication());list.append(empty,start);return;}
  for(const item of applications){
    const status=item.status||'draft',card=document.createElement('article');card.className=`application-progress-card status-${status}`;
    const header=document.createElement('div');header.className='application-progress-header';
    const title=document.createElement('strong');title.className='application-progress-title';title.textContent=item.scheme_name||'Scheme application';title.title=title.textContent;
    const badge=document.createElement('span');badge.className='application-status-badge';badge.textContent=status==='submitted'?'Submitted':status==='withdrawn'?'Withdrawn':'Draft';header.append(title,badge);card.append(header);
    const steps=document.createElement('ol');steps.className='application-progress-steps';
    const stages=status==='submitted'?[['Draft saved','done'],['Marked submitted by you','done'],['Check for updates on official portal','current']]:status==='withdrawn'?[['Draft saved','done'],['Withdrawn by you','current']]:[['Draft saved','done'],['Submit on official portal','current']];
    for(const [label,state] of stages){const step=document.createElement('li');step.className=`application-progress-step ${state}`;step.textContent=label;steps.append(step);}card.append(steps);
    const actions=document.createElement('div');actions.className='application-progress-actions';
    const official=String(item.official_website||'');
    try{const parsed=new URL(/^https?:\/\//i.test(official)?official:`https://${official}`);if(parsed.protocol==='https:'&&/(^|\.)(gov\.in|nic\.in)$/.test(parsed.hostname)){const link=document.createElement('a');link.className='progress-portal-link';link.href=parsed.href;link.target='_blank';link.rel='noopener';link.textContent=status==='submitted'?'Check portal ↗':'Open scheme portal ↗';actions.append(link);}}catch{}
    if(status==='draft'){const mark=document.createElement('button');mark.type='button';mark.className='progress-submit-button';mark.textContent='Mark submitted';mark.addEventListener('click',()=>updateApplicationStatus(item));actions.append(mark);}
    if(actions.childElementCount)card.append(actions);
    const updated=document.createElement('small');updated.className='application-progress-updated';updated.textContent=`Updated ${new Date(item.updated_at||item.created_at).toLocaleDateString()}`;card.append(updated);list.append(card);
  }
  const note=document.createElement('p');note.className='application-progress-note';note.textContent='Portal decisions are not synced here. Check the official portal for updates.';list.append(note);
}
async function loadConversations(restoreLatest=false){
  if(!authToken){conversationList=[];renderConversations();return;}
  try{const response=await fetch('/api/conversations',{headers:apiHeaders(false)}),data=await response.json();if(!response.ok)throw new Error(data.error);conversationList=data.conversations||[];renderConversations();if(restoreLatest&&!currentConversationId&&conversationList.length)await loadConversation(conversationList[0].id);}
  catch(error){conversationList=[];renderConversations();console.warn('Could not load chat history:',error.message);}
}
async function loadConversation(id){
  try{const response=await fetch(`/api/conversations/${id}`,{headers:apiHeaders(false)}),data=await response.json();if(!response.ok)throw new Error(data.error);currentConversationId=data.conversation.id;messages.replaceChildren();welcome.hidden=true;const history=data.conversation.messages||[];chatHistory=history.map(({role,content})=>({role,content}));for(let i=0;i<history.length;i++){const message=history[i],item=addMessage(message.role,message.content);if(message.role==='assistant'&&history[i-1]?.role==='user'&&wantsApplication(history[i-1].content))addApplicationCTA(item.querySelector('.bubble'));}renderConversations();input.focus();}
  catch(error){console.warn('Could not open conversation:',error.message);}
}
for(const id of ['profileOpen','profileOpenTop','profileOpenBottom'])$('#'+id).addEventListener('click',async()=>{
  if(!authToken){requestAuth(async()=>{await openProfile();});return;}await openProfile();
});
async function openProfile(){
  try{const r=await fetch('/api/profile',{headers:apiHeaders(false)});const data=await r.json();if(!r.ok)throw new Error(data.error);form.reset();fillForm(form,data);fillForm(draftForm,data);sessionStorage.setItem('janSahayakProfile',JSON.stringify(data));$('#formError').textContent='';dialog.showModal();await loadApplications();}
  catch(error){if(error.message.includes('log in')){authToken='';sessionStorage.removeItem('janSahayakToken');requestAuth(async()=>openProfile());}else $('#formError').textContent=error.message;}
}
function setAuthMode(mode){authMode=mode;const signup=mode==='signup';$('#authTitle').textContent=signup?'Create your account':'Welcome back';$('#authCopy').textContent=signup?'Save your profile and keep your scheme application drafts together.':'Log in to view your saved profile and application drafts.';$('#authSubmit').innerHTML=signup?'Create account <span>→</span>':'Log in <span>→</span>';for(const el of document.querySelectorAll('.auth-signup')){el.hidden=!signup;const field=el.querySelector('input');if(field)field.required=signup;}const password=authForm.elements.password;password.autocomplete=signup?'new-password':'current-password';password.minLength=signup?10:0;document.querySelectorAll('.auth-tab').forEach(tab=>tab.classList.toggle('active',tab.dataset.authMode===mode));$('#authError').textContent='';}
document.querySelectorAll('.auth-tab').forEach(tab=>tab.addEventListener('click',()=>setAuthMode(tab.dataset.authMode)));
$('#closeAuth').addEventListener('click',()=>{authDialog.close();afterAuth=null;});
$('#continueGuest').addEventListener('click',()=>{afterAuth=null;authDialog.close();});
$('#logoutBtn').addEventListener('click',()=>{authToken='';currentUser=null;conversationList=[];currentConversationId=null;chatHistory=[];messages.replaceChildren();welcome.hidden=false;sessionStorage.removeItem('janSahayakToken');sessionStorage.removeItem('janSahayakProfile');updateAccount(null);renderConversations();renderApplicationProgress();requestAuth();});
authForm.addEventListener('submit',async e=>{
  e.preventDefault();$('#authError').textContent='';const values=Object.fromEntries(new FormData(authForm).entries());values.consent=authForm.elements.consent.checked;
  try{const r=await fetch(`/api/auth/${authMode}`,{method:'POST',headers:apiHeaders(),body:JSON.stringify(values)});const result=await r.json();if(!r.ok)throw new Error(result.error||'Could not authenticate.');authToken=result.token;sessionStorage.setItem('janSahayakToken',authToken);sessionStorage.setItem('janSahayakProfile',JSON.stringify(result.user));updateAccount(result.user);authDialog.close();authForm.reset();const next=afterAuth;afterAuth=null;await Promise.all([loadConversations(!next),loadApplications()]);if(next)await next();}
  catch(error){$('#authError').textContent=error.message||'Could not authenticate.';}
});
setAuthMode('signup');
if(authToken){fetch('/api/auth/me',{headers:apiHeaders(false)}).then(async r=>{const data=await r.json();if(!r.ok)throw new Error();sessionStorage.setItem('janSahayakProfile',JSON.stringify(data.user));updateAccount(data.user);await Promise.all([loadConversations(true),loadApplications()]);}).catch(()=>{authToken='';sessionStorage.removeItem('janSahayakToken');updateAccount(null);renderConversations();renderApplicationProgress();});}
else{updateAccount(null);renderConversations();renderApplicationProgress();setTimeout(()=>requestAuth(),0);}
$('#closeProfile').addEventListener('click',()=>dialog.close());
dialog.addEventListener('click',e=>{if(e.target===dialog)dialog.close();});
form.addEventListener('submit',async e=>{
  e.preventDefault();$('#formError').textContent='';const data=Object.fromEntries(new FormData(form).entries());data.consent=form.elements.consent.checked;data.age=data.age?Number(data.age):null;data.land_acres=data.land_acres?Number(data.land_acres):null;
  try{const r=await fetch('/api/profile',{method:'POST',headers:apiHeaders(),body:JSON.stringify(data)});const result=await r.json();if(!r.ok)throw new Error(result.error);const refreshed=await fetch('/api/profile',{headers:apiHeaders(false)}).then(x=>x.json());sessionStorage.setItem('janSahayakProfile',JSON.stringify(refreshed));updateAccount(refreshed);fillForm(draftForm,refreshed);$('#formError').style.color='#36704d';$('#formError').textContent='Your details are saved.';setTimeout(()=>dialog.close(),900);}
  catch(err){$('#formError').style.color='';$('#formError').textContent=err.message||'Could not save details.';}
});

async function openApplication(selectedSchemeId=null){
  if(!authToken){requestAuth(()=>openApplication(selectedSchemeId));return;}
  draftForm.reset();fillForm(draftForm,readSavedProfile());$('#draftPreview').hidden=true;
  if(selectedSchemeId)$('#draftScheme').value=selectedSchemeId;
  applicationDialog.showModal();
  try{const r=await fetch('/api/profile',{headers:apiHeaders(false)});const profile=await r.json();if(r.ok){sessionStorage.setItem('janSahayakProfile',JSON.stringify(profile));fillForm(draftForm,profile);if(selectedSchemeId)$('#draftScheme').value=selectedSchemeId;}}catch{}
}
$('#closeApplication').addEventListener('click',()=>applicationDialog.close());
applicationDialog.addEventListener('click',e=>{if(e.target===applicationDialog)applicationDialog.close();});
$('#clearDraft').addEventListener('click',()=>{draftForm.reset();fillForm(draftForm,readSavedProfile());$('#draftPreview').hidden=true;});
draftForm.addEventListener('submit',e=>{
  e.preventDefault();const values=Object.fromEntries(new FormData(draftForm).entries());const schemeName=String(values.scheme_name||'').trim();if(!schemeName)return;
  const labels={name:'Applicant name',phone:'Mobile number',age:'Age',state:'State',district:'District',category:'Category',annual_income:'Annual family income',land_acres:'Land cultivated (acres)',education_level:'Education level',course:'Course / class',institution:'School / institution'};
  window.currentApplicationDraft=values;
  const lines=[`Application draft: ${schemeName}`,'',...Object.entries(labels).filter(([key])=>String(values[key]||'').trim()).map(([key,label])=>`${label}: ${String(values[key]).trim()}`),'','Review this draft. It has not been submitted.'];
  $('#draftPreviewText').textContent=lines.join('\n');
  let official=String(values.official_website||'').trim();if(official&&!/^https?:\/\//i.test(official))official='https://'+official;
  try{const parsed=new URL(official);if(parsed.protocol==='https:'&&/(^|\.)(gov\.in|nic\.in)$/.test(parsed.hostname)){$('#officialApplyLink').href=parsed.href;$('#officialApplyLink').hidden=false;}else $('#officialApplyLink').hidden=true;}catch{$('#officialApplyLink').hidden=true;}
  $('#draftPreview').hidden=false;$('#draftPreview').scrollIntoView({behavior:'smooth',block:'nearest'});
});
$('#saveApplication').addEventListener('click',async()=>{
  const status=$('#draftSaveStatus');status.textContent='';const values=window.currentApplicationDraft;if(!values)return;
  try{const r=await fetch('/api/applications',{method:'POST',headers:apiHeaders(),body:JSON.stringify(values)});const data=await r.json();if(!r.ok)throw new Error(data.error||'Could not save this draft.');status.style.color='#36704d';status.textContent='Draft saved to your account.';await loadApplications();}
  catch(error){status.style.color='';status.textContent=error.message||'Could not save this draft.';}
});
async function updateApplicationStatus(item){
  if(!confirm('Only mark this submitted after you have completed the application on the official scheme website.'))return;
  try{const response=await fetch(`/api/applications/${item.id}`,{method:'PATCH',headers:apiHeaders(),body:JSON.stringify({status:'submitted'})}),result=await response.json();if(!response.ok)throw new Error(result.error||'Could not update status.');await loadApplications();}
  catch(error){const list=$('#applicationProgressList'),notice=document.createElement('p');notice.className='application-progress-error';notice.textContent=error.message||'Could not update status.';list.prepend(notice);}
}
async function loadApplications(){
  const list=$('#applicationsList');if(!authToken){list.textContent='Log in to view saved drafts.';renderApplicationProgress();return;}
  try{const r=await fetch('/api/applications',{headers:apiHeaders(false)}),data=await r.json();if(!r.ok)throw new Error(data.error);const applications=data.applications||[];renderApplicationProgress(applications);if(!applications.length){list.textContent='No saved applications yet.';return;}list.replaceChildren(...applications.map(item=>{const row=document.createElement('div');row.className='application-row';const name=document.createElement('span');name.textContent=item.scheme_name||item.scheme_id;const status=document.createElement('small');status.textContent=`${item.status} · ${new Date(item.created_at).toLocaleDateString()}`;row.append(name,status);if(item.status==='draft'){const mark=document.createElement('button');mark.type='button';mark.className='application-mark';mark.textContent='Mark submitted';mark.addEventListener('click',()=>updateApplicationStatus(item));row.append(mark);}return row;}));}
  catch(error){list.textContent=error.message||'Could not load saved applications.';renderApplicationProgress();}
}
$('#deleteProfile').addEventListener('click',async()=>{
  if(!confirm('Delete your account, saved profile, chat history, and application drafts? This cannot be undone.'))return;
  try{const r=await fetch('/api/profile',{method:'DELETE',headers:apiHeaders(false)});const data=await r.json();if(!r.ok)throw new Error(data.error);sessionStorage.removeItem('janSahayakProfile');sessionStorage.removeItem('janSahayakToken');authToken='';currentUser=null;conversationList=[];currentConversationId=null;chatHistory=[];messages.replaceChildren();welcome.hidden=false;updateAccount(null);renderConversations();dialog.close();requestAuth();}
  catch(e){$('#formError').style.color='';$('#formError').textContent=e.message||'Could not delete profile.';}
});

function updateVoiceState(title,hint,state='listening'){
  $('#voiceTitle').textContent=title;voiceInline.classList.toggle('processing',state==='processing');voiceInline.classList.toggle('voice-error',state==='error');
}
function setVoiceRetry(transcript='No speech was detected.'){
  updateVoiceState('I didn’t catch that','Try again, or close voice mode.','error');$('#voiceTranscript').textContent=transcript;
  $('#recordBtn').disabled=false;$('#recordBtn').classList.remove('recording');$('#recordBtn').title='Try recording again';$('#recordBtn').setAttribute('aria-label','Try recording again');
  $('#voiceCancel').setAttribute('aria-label','Close voice message');
}
function closeVoiceMode(){
  const button=$('#recordBtn');button.disabled=false;button.classList.remove('recording');button.title='Record a voice note';button.setAttribute('aria-label','Record a voice note');button.innerHTML='<svg viewBox="0 0 24 24"><rect x="9" y="3" width="6" height="12" rx="3"/><path d="M5.5 11a6.5 6.5 0 0 0 13 0M12 17.5V21m-3 0h6"/></svg>';
  voiceInline.hidden=true;input.hidden=false;$('#composer').classList.remove('voice-active');voiceInline.classList.remove('processing','voice-error');
  input.focus();
}
function cancelVoiceMode(){
  voiceSession++;voiceCancelled=true;speechText='';
  if(recognizer){const active=recognizer;recognizer=null;recording=false;try{active.abort();}catch{}closeVoiceMode();}
  else if(recorder&&recording){recording=false;try{recorder.stop();}catch{}voiceStream?.getTracks().forEach(track=>track.stop());voiceStream=null;chunks=[];closeVoiceMode();}
  else closeVoiceMode();
}
function showVoiceFailure(message){
  voiceSession++;voiceCancelled=true;recording=false;recognizer=null;recorder=null;chunks=[];
  voiceStream?.getTracks().forEach(track=>track.stop());voiceStream=null;
  $('#recordBtn').classList.remove('recording');$('#recordBtn').title='Record a voice note';
  closeVoiceMode();const status=$('#recordStatus');status.hidden=false;status.textContent=message;
}
async function startVoiceMode(){
  if(recording)return;
  const session=++voiceSession;voiceCancelled=false;speechText='';chunks=[];$('#recordStatus').hidden=true;$('#voiceCancel').setAttribute('aria-label','Cancel voice message');$('#voiceTranscript').textContent='';updateVoiceState('Listening','Speak naturally in English or Hindi.');input.hidden=true;voiceInline.hidden=false;$('#composer').classList.add('voice-active');
  const SpeechRecognition=window.SpeechRecognition||window.webkitSpeechRecognition;
  if(SpeechRecognition){
    try{
      const active=new SpeechRecognition();recognizer=active;active.continuous=true;active.interimResults=true;
      active.lang=$('#language').value==='hi'?'hi-IN':'en-IN';
      active.onresult=event=>{
        if(session!==voiceSession||voiceCancelled)return;
        const finals=[],seen=new Set();let interim='';
        for(let i=0;i<event.results.length;i++){
          const phrase=String(event.results[i][0].transcript||'').trim();if(!phrase)continue;
          if(event.results[i].isFinal){const key=phrase.toLocaleLowerCase();if(!seen.has(key)){seen.add(key);finals.push(phrase);}}
          else interim+=phrase+' ';
        }
        speechText=cleanVoiceTranscript(finals.join(' '));$('#voiceTranscript').textContent=cleanVoiceTranscript(speechText+' '+interim)||'Listening…';
      };
      active.onerror=event=>{
        if(session!==voiceSession||voiceCancelled)return;
        const message=event.error==='not-allowed'?'Allow microphone access in your browser, then try voice mode again.':event.error==='no-speech'?'I didn’t hear anything. Try speaking a little closer to your microphone.':'Voice capture failed. Try again or type your message.';
        showVoiceFailure(message);
      };
      active.onend=async()=>{
        if(session!==voiceSession)return;
        if(recognizer===active)recognizer=null;recording=false;
        if(voiceCancelled){closeVoiceMode();return;}
        const transcript=cleanVoiceTranscript(speechText);if(transcript){input.value=transcript;closeVoiceMode();}else setVoiceRetry();
      };
      active.start();recording=true;setRecordButtonRecording(true);return;
    }catch(e){recognizer=null;}
  }
  if(!navigator.mediaDevices?.getUserMedia||!window.MediaRecorder){showVoiceFailure('Voice recording is not supported in this browser.');return;}
  try{
    const activeStream=await navigator.mediaDevices.getUserMedia({audio:true});
    if(session!==voiceSession||voiceCancelled){activeStream.getTracks().forEach(track=>track.stop());return;}
    const mime=['audio/webm;codecs=opus','audio/webm','audio/mp4'].find(t=>MediaRecorder.isTypeSupported(t));
    const activeRecorder=new MediaRecorder(activeStream,mime?{mimeType:mime}:undefined);voiceStream=activeStream;recorder=activeRecorder;
    activeRecorder.ondataavailable=e=>{if(session===voiceSession&&e.data.size)chunks.push(e.data);};
    activeRecorder.onstop=async()=>{
      activeStream.getTracks().forEach(t=>t.stop());if(voiceStream===activeStream)voiceStream=null;if(recorder===activeRecorder)recorder=null;
      if(session!==voiceSession)return;
      recording=false;
      if(voiceCancelled){chunks=[];return;}
      const blob=new Blob(chunks,{type:activeRecorder.mimeType||'audio/webm'});chunks=[];if(blob.size>15*1024*1024){showVoiceFailure('That recording is too large. Please try a shorter voice message.');return;}
      setRecordButtonRecording(false);$('#recordBtn').disabled=true;
      updateVoiceState('Transcribing your voice','This usually takes a few seconds.','processing');
      try{
        const r=await fetch('/api/transcribe',{method:'POST',headers:{'content-type':blob.type||'audio/webm'},body:blob});
        const data=await r.json().catch(()=>({}));
        if(session!==voiceSession||voiceCancelled)return;if(!r.ok)throw new Error(data.error||`Transcription failed (HTTP ${r.status}).`);
        const transcript=cleanVoiceTranscript(data.transcript);if(!transcript){setVoiceRetry('No speech could be recognized. Try again.');return;}input.value=transcript;closeVoiceMode();
      }
      catch(e){if(session===voiceSession&&!voiceCancelled)showVoiceFailure(e.message||'Could not transcribe voice note.');}
    };
    recorder.start();recording=true;setRecordButtonRecording(true);
  }catch(e){if(session===voiceSession)showVoiceFailure('Microphone access is needed to use voice mode.');}
}
function setRecordButtonRecording(active){const button=$('#recordBtn');button.disabled=false;button.classList.toggle('recording',active);button.title=active?'Stop recording':'Record a voice note';button.setAttribute('aria-label',active?'Stop recording':'Record a voice note');button.innerHTML=active?'<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="6" y="6" width="12" height="12" rx="2"/></svg>':'<svg viewBox="0 0 24 24"><rect x="9" y="3" width="6" height="12" rx="3"/><path d="M5.5 11a6.5 6.5 0 0 0 13 0M12 17.5V21m-3 0h6"/></svg>';}
function stopVoiceCapture(){if(!recording)return;updateVoiceState('Finishing…','Finishing your message…','processing');if(recognizer)recognizer.stop();else if(recorder)recorder.stop();}
$('#recordBtn').addEventListener('click',()=>recording?stopVoiceCapture():startVoiceMode());
$('#voiceCancel').addEventListener('click',cancelVoiceMode);

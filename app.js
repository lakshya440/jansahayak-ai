const $ = s => document.querySelector(s);
const messages = $('#messages'), welcome = $('#welcome'), input = $('#messageInput'), sendBtn = $('#sendBtn'), dialog = $('#profileDialog'), form = $('#profileForm'), applicationDialog=$('#applicationDialog'),draftForm=$('#draftForm');
const authDialog=$('#authDialog'),authForm=$('#authForm');
let busy=false, recorder=null, recognizer=null, chunks=[], recording=false, speechText='';
let availableSchemes=[];
let authToken=sessionStorage.getItem('janSahayakToken')||'',currentUser=null,authMode='signup',afterAuth=null,currentConversationId=null,conversationList=[];
function apiHeaders(json=true){const headers={};if(json)headers['content-type']='application/json';if(authToken)headers.authorization=`Bearer ${authToken}`;return headers;}
function requestAuth(callback=null){afterAuth=callback;$('#authError').textContent='';authDialog.showModal();}
function updateAccount(user){currentUser=user;$('#accountName').textContent=user?.name||'Guest';$('#accountStatus').textContent=user?.email||'Exploring schemes';$('#topAccountLabel').textContent=user?'My account':'Log in';$('#logoutBtn').hidden=!user;}

function escapeHTML(s){return String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
function formatText(text){return escapeHTML(text).replace(/(https:\/\/[^\s)]+)/g,'<a href="$1" target="_blank" rel="noopener">$1</a>');}
function wantsApplication(text){const q=String(text).toLowerCase();if(/how (?:do|can|to) i apply|steps? to apply|how to fill|आवेदन कैसे|अप्लाई कैसे/.test(q))return false;return /apply for me|apply on my behalf|apply.{0,60}(?:for me|on my behalf)|i\s+(?:want|need|wanna|would like)\s+(?:to\s+)?(?:apply|submit)|(?:can|could) you\s+(?:apply|submit|fill)|please\s+(?:apply|submit|fill)|help me\s+(?:apply|fill)|start (?:an? )?application|submit (?:an? )?application|मेरे लिए आवेदन|मैं आवेदन करना|मुझे आवेदन करना|आवेदन करना (?:चाहता|है)|आवेदन कर दीजिए|अप्लाई कर|मुझे अप्लाई करना|मेरे लिए फॉर्म/.test(q);}
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
    const response=await fetch('/api/chat',{method:'POST',headers:apiHeaders(),body:JSON.stringify({message:text,language:$('#language').value,conversationId:currentConversationId})});
    const data=await response.json().catch(()=>({})); if(!response.ok)throw new Error(data.error||`Server error (${response.status}). Please try again.`);
    pending.classList.remove('typing');
    const sourceLinks=(data.sources||[]).map(s=>`<a href="${escapeHTML(s.url)}" target="_blank" rel="noopener">${escapeHTML(s.title||s.url)}</a>`);
    const sourcesHtml=sourceLinks.length?`\n\nSources:\n${sourceLinks.map((x,i)=>`${i+1}. ${x}`).join('\n')}`:'';
    pending.querySelector('.bubble').innerHTML=formatText(data.answer||'I could not find an answer. Please try again.')+sourcesHtml;
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
$('#newChat').addEventListener('click',()=>{currentConversationId=null;messages.replaceChildren();welcome.hidden=false;input.focus();renderConversations();});
document.addEventListener('keydown',e=>{if((e.metaKey||e.ctrlKey)&&e.key.toLowerCase()==='k'){e.preventDefault();$('#newChat').click();}});
function readSavedProfile(){try{return JSON.parse(sessionStorage.getItem('janSahayakProfile')||'{}')}catch{return {}}}
function fillForm(formElement,values){for(const [key,value] of Object.entries(values||{})){const field=formElement.elements.namedItem(key);if(field&&value!=null)field.value=String(value)}}
function renderConversations(){
  const list=$('#conversationList');$('#newChat').classList.toggle('active',!currentConversationId);list.replaceChildren();if(!authToken){const empty=document.createElement('div');empty.className='history-empty';empty.textContent='Log in to save chat history.';list.append(empty);return;}
  if(!conversationList.length){const empty=document.createElement('div');empty.className='history-empty';empty.textContent='Your saved conversations will appear here.';list.append(empty);return;}
  for(const item of conversationList){const row=document.createElement('div');row.className=`chat-history-row${item.id===currentConversationId?' selected':''}`;const open=document.createElement('button');open.type='button';open.className='chat-history-item';open.textContent=item.title||'Conversation';open.title=item.title||'Conversation';open.addEventListener('click',()=>loadConversation(item.id));const remove=document.createElement('button');remove.type='button';remove.className='chat-history-delete';remove.textContent='×';remove.setAttribute('aria-label',`Delete ${item.title||'conversation'}`);remove.addEventListener('click',async event=>{event.stopPropagation();if(!confirm('Delete this conversation and its messages?'))return;try{const response=await fetch(`/api/conversations/${item.id}`,{method:'DELETE',headers:apiHeaders(false)});const result=await response.json();if(!response.ok)throw new Error(result.error);conversationList=conversationList.filter(chat=>chat.id!==item.id);if(currentConversationId===item.id){currentConversationId=null;messages.replaceChildren();welcome.hidden=false;}renderConversations();}catch(error){remove.title=error.message||'Could not delete conversation.';}});row.append(open,remove);list.append(row);}
}
async function loadConversations(restoreLatest=false){
  if(!authToken){conversationList=[];renderConversations();return;}
  try{const response=await fetch('/api/conversations',{headers:apiHeaders(false)}),data=await response.json();if(!response.ok)throw new Error(data.error);conversationList=data.conversations||[];renderConversations();if(restoreLatest&&!currentConversationId&&conversationList.length)await loadConversation(conversationList[0].id);}
  catch(error){conversationList=[];renderConversations();console.warn('Could not load chat history:',error.message);}
}
async function loadConversation(id){
  try{const response=await fetch(`/api/conversations/${id}`,{headers:apiHeaders(false)}),data=await response.json();if(!response.ok)throw new Error(data.error);currentConversationId=data.conversation.id;messages.replaceChildren();welcome.hidden=true;const history=data.conversation.messages||[];for(let i=0;i<history.length;i++){const message=history[i],item=addMessage(message.role,message.content);if(message.role==='assistant'&&history[i-1]?.role==='user'&&wantsApplication(history[i-1].content))addApplicationCTA(item.querySelector('.bubble'));}renderConversations();input.focus();}
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
$('#logoutBtn').addEventListener('click',()=>{authToken='';currentUser=null;conversationList=[];currentConversationId=null;messages.replaceChildren();welcome.hidden=false;sessionStorage.removeItem('janSahayakToken');sessionStorage.removeItem('janSahayakProfile');updateAccount(null);renderConversations();requestAuth();});
authForm.addEventListener('submit',async e=>{
  e.preventDefault();$('#authError').textContent='';const values=Object.fromEntries(new FormData(authForm).entries());values.consent=authForm.elements.consent.checked;
  try{const r=await fetch(`/api/auth/${authMode}`,{method:'POST',headers:apiHeaders(),body:JSON.stringify(values)});const result=await r.json();if(!r.ok)throw new Error(result.error||'Could not authenticate.');authToken=result.token;sessionStorage.setItem('janSahayakToken',authToken);sessionStorage.setItem('janSahayakProfile',JSON.stringify(result.user));updateAccount(result.user);authDialog.close();authForm.reset();const next=afterAuth;afterAuth=null;await loadConversations(!next);if(next)await next();}
  catch(error){$('#authError').textContent=error.message||'Could not authenticate.';}
});
setAuthMode('signup');
if(authToken){fetch('/api/auth/me',{headers:apiHeaders(false)}).then(async r=>{const data=await r.json();if(!r.ok)throw new Error();sessionStorage.setItem('janSahayakProfile',JSON.stringify(data.user));updateAccount(data.user);await loadConversations(true);}).catch(()=>{authToken='';sessionStorage.removeItem('janSahayakToken');updateAccount(null);renderConversations();});}
else{updateAccount(null);renderConversations();setTimeout(()=>requestAuth(),0);}
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
  const select=$('#draftScheme');select.innerHTML='<option value="">Choose a scheme</option>';
  applicationDialog.showModal();
  try{
    const [r,profileResponse]=await Promise.all([fetch('/api/schemes'),fetch('/api/profile',{headers:apiHeaders(false)})]);availableSchemes=await r.json();const profile=await profileResponse.json();if(!r.ok)throw new Error('Could not load the scheme list.');if(profileResponse.ok){sessionStorage.setItem('janSahayakProfile',JSON.stringify(profile));fillForm(draftForm,profile);}
    for(const scheme of availableSchemes){const option=document.createElement('option');option.value=scheme.id;option.textContent=`${scheme.name}${scheme.short_name?` (${scheme.short_name})`:''}`;select.append(option);}
    if(selectedSchemeId&&availableSchemes.some(s=>s.id===selectedSchemeId))select.value=selectedSchemeId;
  }catch(e){select.innerHTML='<option value="">Could not load schemes</option>';}
}
$('#closeApplication').addEventListener('click',()=>applicationDialog.close());
applicationDialog.addEventListener('click',e=>{if(e.target===applicationDialog)applicationDialog.close();});
$('#clearDraft').addEventListener('click',()=>{draftForm.reset();fillForm(draftForm,readSavedProfile());$('#draftPreview').hidden=true;});
draftForm.addEventListener('submit',e=>{
  e.preventDefault();const values=Object.fromEntries(new FormData(draftForm).entries());const scheme=availableSchemes.find(s=>s.id===values.scheme_id);if(!scheme)return;
  const labels={name:'Applicant name',phone:'Mobile number',age:'Age',state:'State',district:'District',category:'Category',annual_income:'Annual family income',land_acres:'Land cultivated (acres)',education_level:'Education level',course:'Course / class',institution:'School / institution'};
  window.currentApplicationDraft=values;
  const lines=[`Application draft: ${scheme.name}${scheme.short_name?` (${scheme.short_name})`:''}`,'',...Object.entries(labels).filter(([key])=>String(values[key]||'').trim()).map(([key,label])=>`${label}: ${String(values[key]).trim()}`),'','Review this draft. It has not been submitted.'];
  $('#draftPreviewText').textContent=lines.join('\n');
  let official=String(scheme.official_website||'').trim();if(official&&!/^https?:\/\//i.test(official))official='https://'+official;
  try{const parsed=new URL(official);if(parsed.protocol==='https:'){$('#officialApplyLink').href=parsed.href;$('#officialApplyLink').hidden=false;}else $('#officialApplyLink').hidden=true;}catch{$('#officialApplyLink').hidden=true;}
  $('#draftPreview').hidden=false;$('#draftPreview').scrollIntoView({behavior:'smooth',block:'nearest'});
});
$('#saveApplication').addEventListener('click',async()=>{
  const status=$('#draftSaveStatus');status.textContent='';const values=window.currentApplicationDraft;if(!values)return;
  try{const r=await fetch('/api/applications',{method:'POST',headers:apiHeaders(),body:JSON.stringify(values)});const data=await r.json();if(!r.ok)throw new Error(data.error||'Could not save this draft.');status.style.color='#36704d';status.textContent='Draft saved to your account.';await loadApplications();}
  catch(error){status.style.color='';status.textContent=error.message||'Could not save this draft.';}
});
async function loadApplications(){
  const list=$('#applicationsList');if(!authToken){list.textContent='Log in to view saved drafts.';return;}
  try{const r=await fetch('/api/applications',{headers:apiHeaders(false)}),data=await r.json();if(!r.ok)throw new Error(data.error);if(!data.applications.length){list.textContent='No saved applications yet.';return;}list.replaceChildren(...data.applications.map(item=>{const row=document.createElement('div');row.className='application-row';const name=document.createElement('span');name.textContent=item.scheme_name||item.scheme_id;const status=document.createElement('small');status.textContent=`${item.status} · ${new Date(item.created_at).toLocaleDateString()}`;row.append(name,status);if(item.status==='draft'){const mark=document.createElement('button');mark.type='button';mark.className='application-mark';mark.textContent='Mark submitted';mark.addEventListener('click',async()=>{if(!confirm('Only mark this submitted if you completed the application on the official scheme website.'))return;const response=await fetch(`/api/applications/${item.id}`,{method:'PATCH',headers:apiHeaders(),body:JSON.stringify({status:'submitted'})});const result=await response.json();if(!response.ok){status.textContent=result.error||'Could not update status.';return;}await loadApplications();});row.append(mark);}return row;}));}
  catch(error){list.textContent=error.message||'Could not load saved applications.';}
}
$('#deleteProfile').addEventListener('click',async()=>{
  if(!confirm('Delete your account, saved profile, chat history, and application drafts? This cannot be undone.'))return;
  try{const r=await fetch('/api/profile',{method:'DELETE',headers:apiHeaders(false)});const data=await r.json();if(!r.ok)throw new Error(data.error);sessionStorage.removeItem('janSahayakProfile');sessionStorage.removeItem('janSahayakToken');authToken='';currentUser=null;conversationList=[];currentConversationId=null;messages.replaceChildren();welcome.hidden=false;updateAccount(null);renderConversations();dialog.close();requestAuth();}
  catch(e){$('#formError').style.color='';$('#formError').textContent=e.message||'Could not delete profile.';}
});

async function toggleRecording(){
  const btn=$('#recordBtn'), status=$('#recordStatus');
  if(recording){if(recognizer)recognizer.stop();else recorder.stop();return;}
  const SpeechRecognition=window.SpeechRecognition||window.webkitSpeechRecognition;
  if(SpeechRecognition){
    try{
      recognizer=new SpeechRecognition();recognizer.continuous=true;recognizer.interimResults=true;
      recognizer.lang=$('#language').value==='hi'?'hi-IN':'en-IN';speechText='';
      recognizer.onresult=event=>{
        let interim='';
        for(let i=event.resultIndex;i<event.results.length;i++){
          const phrase=event.results[i][0].transcript;
          if(event.results[i].isFinal)speechText+=phrase+' ';else interim+=phrase;
        }
        status.textContent=interim?`Listening: ${interim}`:'Listening… Tap the microphone again when you’re done.';
      };
      recognizer.onerror=event=>{
        recording=false;btn.classList.remove('recording');btn.title='Record a voice note';
        status.textContent=event.error==='not-allowed'?'Microphone access is needed to use voice input.':'Speech recognition failed. Try typing your message or use a supported browser.';
        recognizer=null;
      };
      recognizer.onend=async()=>{
        const transcript=speechText.trim();recording=false;btn.classList.remove('recording');btn.title='Record a voice note';recognizer=null;
        if(transcript){status.hidden=true;input.value=transcript;await send(transcript);}
        else status.textContent='No speech was detected. Tap the microphone and try again.';
      };
      recognizer.start();recording=true;btn.classList.add('recording');btn.title='Stop voice input';status.hidden=false;status.textContent='Listening… Tap the microphone again when you’re done.';return;
    }catch(e){recognizer=null;}
  }
  if(!navigator.mediaDevices?.getUserMedia||!window.MediaRecorder){status.hidden=false;status.textContent='Voice recording is not supported in this browser.';return;}
  try{
    const stream=await navigator.mediaDevices.getUserMedia({audio:true});chunks=[];
    const mime=['audio/webm;codecs=opus','audio/webm','audio/mp4'].find(t=>MediaRecorder.isTypeSupported(t));
    recorder=new MediaRecorder(stream,mime?{mimeType:mime}:undefined);
    recorder.ondataavailable=e=>{if(e.data.size)chunks.push(e.data);};
    recorder.onstop=async()=>{
      stream.getTracks().forEach(t=>t.stop());recording=false;btn.classList.remove('recording');btn.title='Record a voice note';status.hidden=true;
      const blob=new Blob(chunks,{type:recorder.mimeType||'audio/webm'});if(blob.size>15*1024*1024){status.hidden=false;status.textContent='That recording is too large. Please try a shorter voice note.';return;}
      status.hidden=false;status.textContent='Transcribing your voice note…';
      try{
        const r=await fetch('/api/transcribe',{method:'POST',headers:{'content-type':blob.type||'audio/webm'},body:blob});
        const data=await r.json().catch(()=>({}));
        if(!r.ok)throw new Error(data.error||`Transcription failed (HTTP ${r.status}).`);
        status.hidden=true;input.value=data.transcript;await send(data.transcript);
      }
      catch(e){status.textContent=e.message||'Could not transcribe voice note.';}
    };
    recorder.start();recording=true;btn.classList.add('recording');btn.title='Stop recording';status.hidden=false;status.textContent='Listening… Tap the microphone again when you’re done.';
  }catch(e){status.hidden=false;status.textContent='Microphone access is needed to record a voice note.';}
}
$('#recordBtn').addEventListener('click',toggleRecording);

const $ = s => document.querySelector(s);
const messages = $('#messages'), welcome = $('#welcome'), input = $('#messageInput'), sendBtn = $('#sendBtn'), dialog = $('#profileDialog'), form = $('#profileForm'), applicationDialog=$('#applicationDialog'),draftForm=$('#draftForm');
const authDialog=$('#authDialog'),authForm=$('#authForm');
const shouldOpenApplyAssistant=new URLSearchParams(location.search).get('assistant')==='1';
const embeddedAssistant=new URLSearchParams(location.search).get('embedded')==='1';
if(embeddedAssistant)document.body.classList.add('assistant-embed');
let busy=false, recorder=null, recognizer=null, voiceStream=null, chunks=[], recording=false, speechText='',voiceCancelled=false,voiceSession=0;
const voiceInline=$('#voiceInline');
const voiceOrb=$('#voiceOrb');
voiceOrb.replaceChildren(...Array.from({length:43},(_,index)=>{const bar=document.createElement('i');bar.style.setProperty('--bar-index',index);return bar;}));
const uiText={en:{logout:'Log out',openAccount:'Open account',brandTagline:'YOUR SCHEME COMPANION',welcomeKicker:'A LITTLE HELP, A LOT OF POSSIBILITY',schemePlaceholder:'Enter the scheme name from the official source',optional:'Optional',userType:'I am a…',farmer:'Farmer',student:'Student',bothOther:'Both / other',chooseOne:'Choose one',state:'State',district:'District',category:'Category',land:'Land owned / cultivated',years:'Years',acresOptional:'Acres · optional',acresExample:'e.g. 2.5',stateExample:'e.g. Rajasthan',districtExample:'Your district',yourName:'What should we call you?',preferNotToSay:'Prefer not to say',consentProfile:'I agree to save these details for personalized scheme suggestions and to prefill application drafts. I can delete my account at any time.',disclaimer:'Jan Sahayak shares general information, not official eligibility decisions.',verifyOfficial:'Always verify on official portals ↗',chatPrivacy:'Never share Aadhaar, bank details, passwords, or OTPs in chat.',applicationPrivacy:'Never enter Aadhaar numbers, bank details, passwords or OTPs here. If the official portal needs documents, upload them only on that official site.',languageLabel:'Language',accountLabel:'JAN SAHAYAK ACCOUNT',assistantLabel:'YOUR ASSISTANT',newConversation:'New conversation',myAccountApplications:'My account & applications',applicationProgress:'APPLICATION PROGRESS',recentChats:'RECENT CHATS',exploreSchemes:'EXPLORE SCHEMES',forFarmers:'For farmers',forStudents:'For students',allSchemes:'All schemes',privacyTitle:'Your information stays yours',privacyCopy:'We only save details with your consent.',welcomeTitle:'Good things start<br/>with <em>knowing.</em>',welcomeCopy:'Ask me anything. I’ll search the web for current information and explain it clearly.',welcomeHindi:'कुछ भी पूछें—मैं इंटरनेट पर मौजूदा जानकारी खोजकर आसान भाषा में समझाऊँगा।',farmerPrompt:'I’m a farmer',farmerPromptCopy:'Support for crops, credit & more',studentPrompt:'I’m a student',studentPromptCopy:'Scholarships & education support',explorePrompt:'Let’s figure it out together',explorePromptCopy:'Not sure where to start? That’s okay.',askAnything:'Ask anything...',yourMessage:'Your message',composerHint:'Ask in English or हिन्दी · Voice notes welcome',recordVoice:'Record a voice note',sendMessage:'Send message',guest:'Guest',exploring:'Exploring schemes',login:'Log in',signup:'Create account',thinking:'Thinking…',noAnswer:'I could not find an answer. Please try again.',applicationCta:'Start an application plan →',loginHistory:'Log in to save chat history.',emptyChats:'Your saved conversations will appear here.',loginProgress:'Log in to track your applications.',emptyApplications:'Your saved application plans will appear here.',startPlan:'Start an application plan',saved:'Saved',draft:'In progress',submitted:'Submitted',withdrawn:'Withdrawn',stepAccount:'Create or sign in on the official portal',stepPortal:'Open this scheme and check eligibility',stepForm:'Complete the application form',stepDocuments:'Upload required documents on the portal',stepReview:'Review all details',stepSubmit:'Submit the application',stepFollowup:'Save the reference number and track status',portalOpen:'Open scheme portal ↗',portalCheck:'Check portal ↗',markSubmitted:'Mark submitted',updated:'Updated',portalNote:'Portal decisions are not synced here. Check the official portal for updates.',profileTitle:'Create your account',profileSignup:'Save your profile and keep your scheme application plans together.',profileLogin:'Log in to view your saved profile and application plans.',welcomeBack:'Welcome back',name:'Full name',email:'Email',phone:'Phone number',password:'Password',passwordHint:'Use at least 10 characters.',consentAccount:'I agree to store my account details and any application plans I choose to save.',continueGuest:'Continue as guest',detailsTitle:'YOUR DETAILS',aboutYou:'A little about you',detailsCopy:'A few details help us find more relevant schemes. They’re optional, and you’re in control.',saveDetails:'Save my details',deleteAccount:'Delete my account',myApplications:'MY APPLICATIONS',noApplications:'No saved applications yet.',applicationTitle:'APPLICATION ASSISTANT · YOUR PLAN',startApplication:'Start an application plan',applicationCopy:'Save the scheme and your basic details here. We’ll show the steps in your dashboard so you can work through them at the official government portal. Nothing is submitted automatically.',optionalSecure:'Optional · HTTPS .gov.in or .nic.in',chooseIfRelevant:'Choose if relevant',optionalRupees:'Optional · ₹',optionalAcres:'Optional · acres',schemeName:'Scheme name',officialWebsite:'Official government website',applicantName:'Full name',mobile:'Mobile number',age:'Age',category:'Applicant category',state:'State',district:'District',income:'Annual family income',land:'Land cultivated',education:'Education level',course:'Course / class',institution:'School / institution',clearDraft:'Clear plan',prepareDraft:'Prepare my plan',planReady:'Application plan ready',planCopy:'Review your details, save this plan, then follow the checklist in your dashboard. Complete and submit the real form only on the official government portal.',savePlan:'Save plan to my dashboard',openOfficial:'Open official scheme site'},hi:{logout:'लॉग आउट',openAccount:'खाता खोलें',brandTagline:'आपकी योजना का साथी',welcomeKicker:'सही जानकारी, नई संभावनाएँ',schemePlaceholder:'आधिकारिक स्रोत से योजना का नाम लिखें',optional:'वैकल्पिक',userType:'मैं हूँ…',farmer:'किसान',student:'विद्यार्थी',bothOther:'दोनों / अन्य',chooseOne:'एक चुनें',state:'राज्य',district:'ज़िला',category:'श्रेणी',land:'स्वामित्व / खेती की भूमि',years:'वर्ष',acresOptional:'एकड़ · वैकल्पिक',acresExample:'जैसे 2.5',stateExample:'जैसे राजस्थान',districtExample:'आपका ज़िला',yourName:'आपको किस नाम से बुलाएँ?',preferNotToSay:'बताना नहीं चाहते',consentProfile:'मैं योजनाओं के सुझाव और आवेदन फ़ॉर्म भरने में मदद के लिए ये जानकारी सहेजने की सहमति देता/देती हूँ। मैं कभी भी अपना खाता हटा सकता/सकती हूँ।',disclaimer:'जन सहायक सामान्य जानकारी देता है; पात्रता का आधिकारिक निर्णय नहीं।',verifyOfficial:'आधिकारिक पोर्टल पर पुष्टि करें ↗',chatPrivacy:'चैट में आधार, बैंक विवरण, पासवर्ड या OTP साझा न करें।',applicationPrivacy:'यहाँ आधार, बैंक विवरण, पासवर्ड या OTP न भरें। दस्तावेज़ केवल आधिकारिक पोर्टल पर अपलोड करें।',languageLabel:'भाषा',accountLabel:'जन सहायक खाता',assistantLabel:'आपका सहायक',newConversation:'नई बातचीत',myAccountApplications:'मेरा खाता और आवेदन',applicationProgress:'आवेदन की प्रगति',recentChats:'हाल की बातचीत',exploreSchemes:'योजनाएँ देखें',forFarmers:'किसानों के लिए',forStudents:'विद्यार्थियों के लिए',allSchemes:'सभी योजनाएँ',privacyTitle:'आपकी जानकारी आपके नियंत्रण में',privacyCopy:'आपकी सहमति से ही जानकारी सहेजी जाती है।',welcomeTitle:'सही जानकारी से<br/><em>अच्छी शुरुआत।</em>',welcomeCopy:'अपना सवाल पूछें। मैं मौजूदा जानकारी खोजकर आसान भाषा में समझाऊँगा।',welcomeHindi:'Ask me anything—मैं हिंदी या English में मदद कर सकता हूँ।',farmerPrompt:'मैं किसान हूँ',farmerPromptCopy:'फसल, ऋण और अन्य सहायता',studentPrompt:'मैं विद्यार्थी हूँ',studentPromptCopy:'छात्रवृत्ति और शिक्षा सहायता',explorePrompt:'आइए, साथ मिलकर पता करें',explorePromptCopy:'शुरुआत समझ न आए तो कोई बात नहीं।',askAnything:'कुछ भी पूछें...',yourMessage:'आपका संदेश',composerHint:'हिंदी या English में पूछें · वॉइस नोट भी भेजें',recordVoice:'वॉइस नोट रिकॉर्ड करें',sendMessage:'संदेश भेजें',guest:'अतिथि',exploring:'योजनाएँ देख रहे हैं',login:'लॉग इन',signup:'खाता बनाएँ',thinking:'सोच रहा हूँ…',noAnswer:'जवाब नहीं मिला। कृपया फिर कोशिश करें।',applicationCta:'आवेदन योजना शुरू करें →',loginHistory:'चैट इतिहास सहेजने के लिए लॉग इन करें।',emptyChats:'आपकी सहेजी गई बातचीत यहाँ दिखेगी।',loginProgress:'आवेदन की प्रगति देखने के लिए लॉग इन करें।',emptyApplications:'आपकी सहेजी गई आवेदन योजनाएँ यहाँ दिखेंगी।',startPlan:'आवेदन योजना शुरू करें',saved:'सहेजा गया',draft:'प्रक्रिया में',submitted:'जमा किया',withdrawn:'वापस लिया',stepAccount:'आधिकारिक पोर्टल पर खाता बनाएँ या लॉग इन करें',stepPortal:'योजना खोलें और पात्रता जाँचें',stepForm:'आवेदन फ़ॉर्म भरें',stepDocuments:'ज़रूरी दस्तावेज़ पोर्टल पर अपलोड करें',stepReview:'सभी जानकारी जाँचें',stepSubmit:'आवेदन जमा करें',stepFollowup:'संदर्भ संख्या सहेजें और स्थिति देखें',portalOpen:'योजना पोर्टल खोलें ↗',portalCheck:'पोर्टल पर स्थिति देखें ↗',markSubmitted:'जमा किया चिह्नित करें',updated:'अपडेट',portalNote:'पोर्टल की स्थिति यहाँ अपने-आप अपडेट नहीं होती। आधिकारिक पोर्टल देखें।',profileTitle:'अपना खाता बनाएँ',profileSignup:'अपनी प्रोफ़ाइल और आवेदन योजनाएँ सहेजें।',profileLogin:'सहेजी गई प्रोफ़ाइल और आवेदन योजनाएँ देखने के लिए लॉग इन करें।',welcomeBack:'वापस स्वागत है',name:'पूरा नाम',email:'ईमेल',phone:'फ़ोन नंबर',password:'पासवर्ड',passwordHint:'कम से कम 10 अक्षर रखें।',consentAccount:'मैं अपने खाते की जानकारी और चुनी हुई आवेदन योजनाएँ सहेजने की सहमति देता/देती हूँ।',continueGuest:'अतिथि के रूप में जारी रखें',detailsTitle:'आपकी जानकारी',aboutYou:'अपने बारे में बताएँ',detailsCopy:'कुछ जानकारी से योजनाएँ खोजने में मदद मिलती है। यह वैकल्पिक है और आपके नियंत्रण में है।',saveDetails:'जानकारी सहेजें',deleteAccount:'खाता हटाएँ',myApplications:'मेरे आवेदन',noApplications:'अभी कोई आवेदन सहेजा नहीं है।',applicationTitle:'आवेदन सहायक · आपकी योजना',startApplication:'आवेदन योजना शुरू करें',applicationCopy:'योजना और मूल जानकारी सहेजें। डैशबोर्ड में चरण दिखेंगे जिन्हें आप आधिकारिक सरकारी पोर्टल पर पूरा कर सकते हैं। कुछ भी अपने-आप जमा नहीं होगा।',optionalSecure:'वैकल्पिक · HTTPS .gov.in या .nic.in',chooseIfRelevant:'लागू हो तो चुनें',optionalRupees:'वैकल्पिक · ₹',optionalAcres:'वैकल्पिक · एकड़',schemeName:'योजना का नाम',officialWebsite:'आधिकारिक सरकारी वेबसाइट',applicantName:'पूरा नाम',mobile:'मोबाइल नंबर',age:'आयु',category:'श्रेणी',state:'राज्य',district:'ज़िला',income:'परिवार की वार्षिक आय',land:'खेती की भूमि',education:'शिक्षा का स्तर',course:'कोर्स / कक्षा',institution:'विद्यालय / संस्थान',clearDraft:'योजना साफ़ करें',prepareDraft:'मेरी योजना तैयार करें',planReady:'आवेदन योजना तैयार है',planCopy:'जानकारी जाँचें और योजना सहेजें। फिर डैशबोर्ड के चरणों का पालन करें। वास्तविक आवेदन केवल आधिकारिक सरकारी पोर्टल पर जमा करें।',savePlan:'योजना डैशबोर्ड में सहेजें',openOfficial:'आधिकारिक योजना साइट खोलें'}};
let uiLanguage=localStorage.getItem('janSahayakLanguage')==='hi'?'hi':'en';
function t(key){return uiText[uiLanguage][key]||uiText.en[key]||key;}
function applyWebsiteLanguage(language=uiLanguage){uiLanguage=language==='hi'?'hi':'en';localStorage.setItem('janSahayakLanguage',uiLanguage);document.documentElement.lang=uiLanguage;document.querySelectorAll('[data-i18n]').forEach(el=>{const value=t(el.dataset.i18n);if(value)el.textContent=value;});document.querySelectorAll('[data-i18n-html]').forEach(el=>{const value=t(el.dataset.i18nHtml);if(value)el.innerHTML=value;});document.querySelectorAll('[data-i18n-label]').forEach(el=>{const node=[...el.childNodes].find(child=>child.nodeType===Node.TEXT_NODE&&child.textContent.trim());if(node)node.textContent=`${t(el.dataset.i18nLabel)} `;});document.querySelectorAll('[data-i18n-placeholder]').forEach(el=>el.placeholder=t(el.dataset.i18nPlaceholder));document.querySelectorAll('[data-i18n-aria]').forEach(el=>el.setAttribute('aria-label',t(el.dataset.i18nAria)));document.querySelectorAll('[data-i18n-title]').forEach(el=>el.title=t(el.dataset.i18nTitle));$('#language').value=uiLanguage;updateAccount(currentUser);setAuthMode(authMode);renderConversations();loadApplications();}
let authToken=sessionStorage.getItem('janSahayakToken')||'',currentUser=null,authMode='signup',afterAuth=null,currentConversationId=null,conversationList=[],chatHistory=[];
function apiHeaders(json=true){const headers={};if(json)headers['content-type']='application/json';if(authToken)headers.authorization=`Bearer ${authToken}`;return headers;}
function requestAuth(callback=null){afterAuth=callback;$('#authError').textContent='';authDialog.showModal();}
function updateAccount(user){currentUser=user;$('#accountName').textContent=user?.name||t('guest');$('#accountStatus').textContent=user?.email||t('exploring');$('#topAccountLabel').textContent=user?(uiLanguage==='hi'?'मेरा खाता':'My account'):t('login');$('#logoutBtn').hidden=!user;}

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
  const start=document.createElement('button');start.type='button';start.className='save-profile application-cta';start.textContent=t('applicationCta');
  start.addEventListener('click',()=>startApplyAssistant(schemeId));container.append(document.createElement('br'),start);
}
async function send(text){
  text=(text??input.value).trim(); if(!text||busy)return;
  if(activeApplyAssistant&&applyQuestionIndex<applyQuestions.length){input.value='';input.style.height='auto';handleApplyAnswer(text);return;}
  input.value=''; input.style.height='auto'; addMessage('user',text); const pending=addMessage('assistant',t('thinking'),true); busy=true;sendBtn.disabled=true;
  try{
    const response=await fetch('/api/chat',{method:'POST',headers:apiHeaders(),body:JSON.stringify({message:text,language:$('#language').value,conversationId:currentConversationId,history:chatHistory.slice(-10)})});
    const data=await response.json().catch(()=>({})); if(!response.ok)throw new Error(data.error||`Server error (${response.status}). Please try again.`);
    pending.classList.remove('typing');
    const sourceLinks=(data.sources||[]).map(s=>`<a href="${escapeHTML(s.url)}" target="_blank" rel="noopener">${escapeHTML(s.title||s.url)}</a>`);
    const sourcesHtml=sourceLinks.length?`\n\nSources:\n${sourceLinks.map((x,i)=>`${i+1}. ${x}`).join('\n')}`:'';
    pending.querySelector('.bubble').innerHTML=formatText(data.answer||t('noAnswer'))+sourcesHtml;
    chatHistory.push({role:'user',content:text},{role:'assistant',content:data.answer||''});
    if(data.conversationId)currentConversationId=data.conversationId;
    if(data.action?.type==='application_draft'||wantsApplication(text)){applySchemeId=data.action?.schemeId||null;addApplicationCTA(pending.querySelector('.bubble'),applySchemeId);}
    if(authToken)await loadConversations(false);
  }catch(e){pending.classList.remove('typing');pending.querySelector('.bubble').textContent=e.message||'Something went wrong. Please try again.';if(wantsApplication(text))addApplicationCTA(pending.querySelector('.bubble'));}
  finally{busy=false;sendBtn.disabled=false;input.focus();}
}
sendBtn.addEventListener('click',()=>send());
input.addEventListener('input',()=>{input.style.height='auto';input.style.height=Math.min(input.scrollHeight,120)+'px';});
input.addEventListener('keydown',e=>{if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();send();}});
document.querySelectorAll('[data-prompt]').forEach(el=>el.addEventListener('click',()=>send(uiLanguage==='hi'?(el.dataset.promptHi||el.dataset.prompt):el.dataset.prompt)));
$('#newChat').addEventListener('click',()=>{currentConversationId=null;chatHistory=[];messages.replaceChildren();welcome.hidden=false;input.focus();renderConversations();});
document.addEventListener('keydown',e=>{if((e.metaKey||e.ctrlKey)&&e.key.toLowerCase()==='k'){e.preventDefault();$('#newChat').click();}});
function readSavedProfile(){try{return JSON.parse(sessionStorage.getItem('janSahayakProfile')||'{}')}catch{return {}}}
const applyChannel='BroadcastChannel'in window?new BroadcastChannel('jan-sahayak-mock-nsp'):null;
const applyQuestions=[['mobile','What 10-digit mobile number should the mock NSP login use?','tel'],['name','What is your full name, exactly as it appears on your marksheet?','text'],['dob','What is your date of birth? Please use YYYY-MM-DD.','date'],['category','Which category should I enter? (General, OBC, SC, ST, or EWS)','category'],['income','What is your annual family income in rupees?','number'],['marks','What are your Class 12 marks as a percentage?','number'],['accountName','What name appears on the demo bank account? Use fictional details.','text'],['ifsc','What is the demo IFSC code? Use a fictional code such as DEMO0001234.','text'],['account','What fictional account number should the demo form use?','number']];
let activeApplyAssistant=false,applyQuestionIndex=0,applySchemeId=null,applyValues={mobile:'',name:'',dob:'',category:'',income:'',marks:'',accountName:'',ifsc:'',account:''};
let tesseractWorkerPromise=null;
async function getOcrWorker(language='eng+hin'){if(!tesseractWorkerPromise){tesseractWorkerPromise=import('/node_modules/tesseract.js/dist/tesseract.esm.min.js').then(({default:Tesseract})=>Tesseract.createWorker(language,1,{workerPath:'/node_modules/tesseract.js/dist/worker.min.js',corePath:'/node_modules/tesseract.js-core',logger:()=>{}})).catch(error=>{tesseractWorkerPromise=null;throw error;});}return tesseractWorkerPromise;}
async function readUploadedDocument(file,onProgress=()=>{}){if(file.size>10*1024*1024)throw new Error('Choose a document under 10 MB.');const name=file.name.toLowerCase(),pdf=file.type==='application/pdf'||name.endsWith('.pdf'),image=['image/jpeg','image/png','image/webp'].includes(file.type)||/\.(jpe?g|png|webp)$/.test(name);if(!pdf&&!image)throw new Error('Choose a JPG, PNG, WebP image or PDF.');let text='';if(pdf){const pdfjs=await import('/node_modules/pdfjs-dist/build/pdf.mjs');pdfjs.GlobalWorkerOptions.workerSrc='/node_modules/pdfjs-dist/build/pdf.worker.min.mjs';const pdfDoc=await pdfjs.getDocument({data:await file.arrayBuffer()}).promise;const pages=Math.min(pdfDoc.numPages,4);for(let pageNo=1;pageNo<=pages;pageNo++){const page=await pdfDoc.getPage(pageNo),content=await page.getTextContent();text+=content.items.map(item=>item.str).join(' ')+'\n';}if(text.replace(/\s/g,'').length<30){text='';const worker=await getOcrWorker();for(let pageNo=1;pageNo<=pages;pageNo++){const page=await pdfDoc.getPage(pageNo),viewport=page.getViewport({scale:1.7}),canvas=document.createElement('canvas');canvas.width=viewport.width;canvas.height=viewport.height;await page.render({canvasContext:canvas.getContext('2d'),viewport}).promise;const result=await worker.recognize(canvas,{rotateAuto:true});text+=result.data.text+'\n';onProgress(`Reading PDF page ${pageNo} of ${pages} · ${Math.round(result.data.confidence)}% OCR confidence`);canvas.width=0;canvas.height=0;}}}else{const worker=await getOcrWorker();const result=await worker.recognize(file,{rotateAuto:true});text=result.data.text;onProgress(`OCR complete · ${Math.round(result.data.confidence)}% average confidence`);}return text;}
function parseOcrFields(raw){
  const text=String(raw||'').replace(/\r/g,'\n'),flat=text.replace(/\s+/g,' '),result={};
  const find=(patterns,source=text)=>{for(const pattern of patterns){const match=source.match(pattern);if(match?.[1])return match[1].trim();}return '';};
  result.dob=find([/\b(?:DOB|Date of Birth|D\.O\.B)\s*[:\-]?\s*(\d{2}[/-]\d{2}[/-]\d{4})/i,/जन्म\s*तिथि\s*[:\-]?\s*(\d{2}[/-]\d{2}[/-]\d{4})/i,/\b(\d{2}[/-]\d{2}[/-]\d{4})\b/]);
  if(result.dob){const m=result.dob.match(/^(\d{2})[/-](\d{2})[/-](\d{4})$/);if(m)result.dob=`${m[3]}-${m[2]}-${m[1]}`;else result.dob='';}
  result.ifsc=find([/\b([A-Z]{4}0[A-Z0-9]{6})\b/i],flat).toUpperCase();
  result.account=find([/(?:account\s*(?:no|number)?|a\/c\s*(?:no)?|खाता\s*(?:संख्या|नंबर)?)\D{0,15}(\d{9,18})/i],flat);if(!result.account)result.account=find([/\b(\d{9,18})\b/],flat);
  result.marks=find([/(?:percentage|marks|aggregate|total|प्रतिशत|प्राप्तांक|कुल\s*अंक)\D{0,24}(\d{1,3}(?:\.\d{1,2})?)\s*%?/i,/([\d.]{1,6})\s*%/],flat);if(Number(result.marks)>100)result.marks='';
  result.income=find([/(?:annual|family)?\s*income\D{0,24}(?:₹|rs\.?|inr)?\s*([\d,]{4,})/i,/(?:वार्षिक\s*)?आय\D{0,24}(?:₹|रु\.?|रुपये)?\s*([\d,]{4,})/i],flat).replace(/,/g,'');
  result.category=find([/\b(Scheduled Caste|Scheduled Tribe|OBC|SC|ST|EWS|General)\b/i,/(सामान्य|अन्य पिछड़ा वर्ग|अनुसूचित जाति|अनुसूचित जनजाति|ईडब्ल्यूएस)/],flat);
  if(result.category){const norm=result.category.toLowerCase();result.category=/scheduled caste|अनुसूचित जाति/.test(norm)?'SC':/scheduled tribe|अनुसूचित जनजाति/.test(norm)?'ST':/सामान्य/.test(norm)||norm==='general'?'General':/पिछड़ा/.test(norm)?'OBC':/ईडब्ल्यूएस/.test(norm)||norm==='ews'?'EWS':norm.toUpperCase();}
  result.name=find([/(?:student|applicant|candidate)?\s*name\s*[:\-]\s*([A-Z][A-Z .'-]{2,60})/i,/(?:name)\s+([A-Z][A-Z .'-]{2,60})\b/i,/(?:नाम)\s*[:\-]\s*([\u0900-\u097F ]{3,60})/]);
  if(result.name)result.name=result.name.replace(/\s+(?:father|mother|dob|date|gender|category|address).*$/i,'').trim();result.accountName=result.name;
  return Object.fromEntries(Object.entries(result).filter(([,value])=>value));
}
function buildOcrReview(container,values,onChange){container.replaceChildren();const labels={mobile:'Mock login mobile',name:'Full name',dob:'Date of birth',category:'Category',income:'Annual income',marks:'Marks (%)',accountName:'Account holder',ifsc:'IFSC',account:'Account number'};for(const [key,label]of Object.entries(labels)){const row=document.createElement('label');row.className='demo-review-row';const title=document.createElement('span');title.textContent=label;const field=document.createElement('input');field.value=values[key]||'';field.setAttribute('aria-label',label);field.addEventListener('input',()=>onChange(key,field.value));row.append(title,field);container.append(row);}}
function applyDemoDefaults(){const defaults={mobile:'9999999999',name:'DEMO STUDENT',dob:'2000-01-01',category:'General',income:'0',marks:'0',accountName:'DEMO STUDENT',ifsc:'DEMO0001234',account:'000000000001'};const filled=[];for(const [key,value]of Object.entries(defaults)){if(!String(applyValues[key]||'').trim()){applyValues[key]=value;filled.push(key);}}return filled;}
function renderApplyQuestion(){const [key,prompt,type]=applyQuestions[applyQuestionIndex];$('#applyProgressText').textContent=`Step ${applyQuestionIndex+1} of ${applyQuestions.length}`;$('#applyProgressBar').style.width=`${Math.round(applyQuestionIndex/applyQuestions.length*100)}%`;$('#applyQuestion').replaceChildren();const heading=document.createElement('h3');heading.textContent=prompt;const help=document.createElement('p');help.textContent=embeddedAssistant?'Enter your answer below. I’ll ask for the next detail.':'Answer in the chat or use the field below.';$('#applyQuestion').append(heading,help);const answer=$('#applyAnswer');answer.value='';answer.type=type==='category'?'text':type==='date'?'date':type;answer.placeholder=type==='category'?'e.g. OBC':type==='date'?'YYYY-MM-DD':'';}
function startApplyAssistant(schemeId=null){applySchemeId=schemeId;applyValues={mobile:'',name:'',dob:'',category:'',income:'',marks:'',accountName:'',ifsc:'',account:''};const profile=readSavedProfile();if(profile.name)applyValues.name=profile.name;if(profile.category)applyValues.category=profile.category;const mobile=String(profile.phone||'').replace(/\D/g,'').slice(-10);if(mobile.length===10)applyValues.mobile=mobile;$('#applyDocStatus').textContent='';$('#applyDocument').value='';$('#applyFields').replaceChildren();$('#apply-doc-step').hidden=false;$('#apply-questions-step').hidden=true;$('#apply-finish-step').hidden=true;$('#applyProgressBar').style.width='0%';activeApplyAssistant=false;applyQuestionIndex=0;applyAssistantDialog.showModal();}
function startMissingQuestions(){const next=applyQuestions.findIndex(([key])=>!String(applyValues[key]||'').trim());applyQuestionIndex=next<0?applyQuestions.length:next;$('#apply-doc-step').hidden=true;$('#apply-questions-step').hidden=false;activeApplyAssistant=true;if(applyQuestionIndex===applyQuestions.length){finishApplyAssistant();return;}renderApplyQuestion();}
function validateApplyAnswer(key,value){let clean=String(value||'').trim();if(!clean)return null;if(key==='mobile'){clean=clean.replace(/\D/g,'');if(!/^\d{10}$/.test(clean))return null;}if(key==='dob'&&!/^\d{4}-\d{2}-\d{2}$/.test(clean))return null;if(key==='category'&&!/^(general|obc|sc|st|ews)$/i.test(clean))return null;if(key==='income'&&(!/^\d+(?:\.\d{1,2})?$/.test(clean)||Number(clean)<0))return null;if(key==='marks'&&(!/^\d+(?:\.\d{1,2})?$/.test(clean)||Number(clean)<0||Number(clean)>100))return null;if(key==='ifsc'&&!/^[A-Za-z]{4}0[A-Za-z0-9]{6}$/.test(clean))return null;if(key==='account'&&!/^\d{6,18}$/.test(clean))return null;return key==='category'||key==='ifsc'?clean.toUpperCase():clean;}
function handleApplyAnswer(value){const [key,prompt]=applyQuestions[applyQuestionIndex],answer=validateApplyAnswer(key,value);addMessage('user',value);if(answer===null){addMessage('assistant',`That value needs a correction. ${prompt}`);return;}applyValues[key]=answer;applyQuestionIndex=applyQuestions.findIndex(([nextKey],i)=>i>applyQuestionIndex&&!String(applyValues[nextKey]||'').trim());if(applyQuestionIndex<0)applyQuestionIndex=applyQuestions.length;if(applyQuestionIndex===applyQuestions.length){addMessage('assistant','Thanks, all the required demo details are ready. I’ll prepare the mock NSP page.');finishApplyAssistant();}else{const nextPrompt=applyQuestions[applyQuestionIndex][1];addMessage('assistant',nextPrompt);renderApplyQuestion();}}
function finishApplyAssistant(){activeApplyAssistant=false;$('#apply-doc-step').hidden=true;$('#apply-questions-step').hidden=true;$('#apply-finish-step').hidden=false;$('#applyProgressText').textContent='Ready';$('#applyProgressBar').style.width='100%';const hasDemo=Boolean(applyValues.demoDefaults?.length);$('#applyFinishCopy').textContent=`${hasDemo?'Missing fields use clearly labeled fictional demo values. ':''}Login ${applyValues.mobile} · ${applyValues.name} · ${applyValues.category} · ${applyValues.marks}% marks. Review the filled mock form before continuing.`;}
function broadcastApplyValues(autoRun=false){const payload={type:'apply-demo-values',values:applyValues,sentAt:Date.now(),autoRun};sessionStorage.setItem('janSahayakMockApply',JSON.stringify(payload));applyChannel?.postMessage(payload);}
applyChannel?.addEventListener('message',event=>{const message=event.data;if(message?.type==='demo-automation-status'){$('#applyRunStatus').textContent=message.status;$('#applyRunProgress').hidden=false;}if(message?.type==='demo-automation-paused'){$('#applyRunStatus').textContent=message.status;$('#applyRunProgress').hidden=false;$('#applyRunProgress .run-dots').hidden=true;$('#openMockApply').disabled=false;$('#openMockApply').textContent='Retry sandbox run ↻';}if(message?.type==='demo-application-complete'){$('#applyRunProgress').hidden=true;$('#applyFinishTitle').textContent='Your demo receipt is ready';$('#applyFinishCopy').textContent=`The mock portal panel is closed. Demo reference: ${message.reference}. This is a fictional practice receipt; nothing was submitted to a government service.`;$('#openMockApply').hidden=true;}});
$('#closeApplyAssistant').addEventListener('click',()=>{activeApplyAssistant=false;applyAssistantDialog.close();});
applyAssistantDialog.addEventListener('click',event=>{if(event.target===applyAssistantDialog){activeApplyAssistant=false;applyAssistantDialog.close();}});
function prepareApplyHandoff(){applyValues.demoDefaults=applyDemoDefaults();finishApplyAssistant();}
$('#skipApplyDocument').addEventListener('click',prepareApplyHandoff);$('#applyDocContinue').addEventListener('click',prepareApplyHandoff);
$('#applyAnswerNext').addEventListener('click',()=>handleApplyAnswer($('#applyAnswer').value));
$('#openMockApply').addEventListener('click',()=>{broadcastApplyValues(true);$('#applyRunProgress').hidden=false;$('#applyRunStatus').textContent='Opening the mock portal…';$('#openMockApply').disabled=true;if(embeddedAssistant)return;let returnedToSandbox=false;try{returnedToSandbox=Boolean(window.opener&&window.opener.location.origin===location.origin);if(returnedToSandbox)window.opener.focus();}catch{}if(returnedToSandbox)window.close();else window.open('/mock-nsp?assist=1','jan-sahayak-mock-nsp');});
function setOcrStatus(message,loading=false){const status=$('#applyDocStatus');status.replaceChildren(document.createTextNode(message));if(loading){const dots=document.createElement('span');dots.className='run-dots';dots.setAttribute('aria-label','Working');dots.innerHTML='<i></i><i></i><i></i>';status.append(' ',dots);}}
$('#applyDocument').addEventListener('change',async event=>{const files=Array.from(event.target.files||[]);if(!files.length)return;if(files.length>8){setOcrStatus('Choose up to 8 documents at a time.');event.target.value='';return;}const combined={};let totalWords=0;const completed=[],failed=[];for(let index=0;index<files.length;index++){const file=files[index];setOcrStatus(`Reading document ${index+1} of ${files.length}: ${file.name} locally…`,true);try{const text=await readUploadedDocument(file,progress=>setOcrStatus(`Document ${index+1} of ${files.length} · ${file.name}: ${progress}`,true));totalWords+=text.trim().split(/\s+/).filter(Boolean).length;Object.assign(combined,parseOcrFields(text));completed.push(file.name);}catch(error){failed.push(`${file.name}: ${error.message||'could not read'}`);}}applyValues={...applyValues,...combined};buildOcrReview($('#applyFields'),applyValues,(key,value)=>applyValues[key]=value);const result=completed.length?`OCR read ${completed.length} document${completed.length===1?'':'s'} (${totalWords} words): ${completed.join(', ')}. Extracted fields were combined; values from later documents replace duplicates. Review suggestions before continuing.`:'No documents could be read. You can continue with fictional demo values.';setOcrStatus([result,...failed].join(' '));event.target.value='';});
function renderApplyFieldReview(){const container=$('#applyFields');container.replaceChildren();const labels={name:'Full name',dob:'Date of birth',category:'Category',income:'Annual income',marks:'Class 12 marks',accountName:'Account holder',ifsc:'IFSC',account:'Demo account number'};for(const [key,label] of Object.entries(labels)){const row=document.createElement('label');row.className='demo-review-row';const title=document.createElement('span');title.textContent=label;const field=document.createElement('input');field.value=applyValues[key]||'';field.setAttribute('aria-label',label);field.addEventListener('input',()=>applyValues[key]=field.value);row.append(title,field);container.append(row);}}
$('#applyAnswer').addEventListener('input',()=>{if($('#applyAnswer').type==='date')return;});
function fillForm(formElement,values){for(const [key,value] of Object.entries(values||{})){const field=formElement.elements.namedItem(key);if(field&&value!=null)field.value=String(value)}}
function renderConversations(){
  const list=$('#conversationList');$('#newChat').classList.toggle('active',!currentConversationId);list.replaceChildren();if(!authToken){const empty=document.createElement('div');empty.className='history-empty';empty.textContent=t('loginHistory');list.append(empty);return;}
  if(!conversationList.length){const empty=document.createElement('div');empty.className='history-empty';empty.textContent=t('emptyChats');list.append(empty);return;}
  for(const item of conversationList){const row=document.createElement('div');row.className=`chat-history-row${item.id===currentConversationId?' selected':''}`;const open=document.createElement('button');open.type='button';open.className='chat-history-item';open.textContent=item.title||'Conversation';open.title=item.title||'Conversation';open.addEventListener('click',()=>loadConversation(item.id));const remove=document.createElement('button');remove.type='button';remove.className='chat-history-delete';remove.textContent='×';remove.setAttribute('aria-label',`Delete ${item.title||'conversation'}`);remove.addEventListener('click',async event=>{event.stopPropagation();if(!confirm('Delete this conversation and its messages?'))return;try{const response=await fetch(`/api/conversations/${item.id}`,{method:'DELETE',headers:apiHeaders(false)});const result=await response.json();if(!response.ok)throw new Error(result.error);conversationList=conversationList.filter(chat=>chat.id!==item.id);if(currentConversationId===item.id){currentConversationId=null;chatHistory=[];messages.replaceChildren();welcome.hidden=false;}renderConversations();}catch(error){remove.title=error.message||'Could not delete conversation.';}});row.append(open,remove);list.append(row);}
}
function renderApplicationProgress(applications=[]){
  const list=$('#applicationProgressList');list.replaceChildren();
  if(!authToken){const empty=document.createElement('div');empty.className='history-empty';empty.textContent=t('loginProgress');list.append(empty);return;}
  if(!applications.length){const empty=document.createElement('div');empty.className='history-empty';empty.textContent=t('emptyApplications');const start=document.createElement('button');start.type='button';start.className='progress-empty-action';start.textContent=t('startPlan');start.addEventListener('click',()=>openApplication());list.append(empty,start);return;}
  for(const item of applications){
    const status=item.status||'draft',card=document.createElement('article');card.className=`application-progress-card status-${status}`;
    const header=document.createElement('div');header.className='application-progress-header';
    const title=document.createElement('strong');title.className='application-progress-title';title.textContent=item.scheme_name||'Scheme application';title.title=title.textContent;
    const badge=document.createElement('span');badge.className='application-status-badge';badge.textContent=status==='submitted'?t('submitted'):status==='withdrawn'?t('withdrawn'):t('draft');header.append(title,badge);card.append(header);
    const steps=document.createElement('ol');steps.className='application-progress-steps';
    const checklist=[['account',t('stepAccount')],['portal',t('stepPortal')],['form',t('stepForm')],['documents',t('stepDocuments')],['review',t('stepReview')],['submit',t('stepSubmit')],['followup',t('stepFollowup')]];
    const completed=new Set(Array.isArray(item.details?.completed_steps)?item.details.completed_steps:[]);
    if(status==='submitted'){completed.add('account');completed.add('portal');completed.add('form');completed.add('documents');completed.add('review');completed.add('submit');}
    const nextStep=checklist.find(([id])=>!completed.has(id))?.[0];
    for(const [id,label] of checklist){const step=document.createElement('li');step.className=`application-progress-step ${completed.has(id)?'done':id===nextStep?'current':''}`;
      if(status!=='withdrawn'){
        const checkbox=document.createElement('input');checkbox.type='checkbox';checkbox.className='application-step-check';checkbox.checked=completed.has(id);checkbox.disabled=id!==nextStep&&!completed.has(id);checkbox.setAttribute('aria-label',`Mark as done: ${label}`);checkbox.addEventListener('change',()=>updateApplicationSteps(item,id,checkbox.checked));
        const text=document.createElement('span');text.textContent=label;step.append(checkbox,text);
      } else step.textContent=label;
      steps.append(step);
    }card.append(steps);
    const actions=document.createElement('div');actions.className='application-progress-actions';
    const official=String(item.official_website||'');
    try{const parsed=new URL(/^https?:\/\//i.test(official)?official:`https://${official}`);if(parsed.protocol==='https:'&&/(^|\.)(gov\.in|nic\.in)$/.test(parsed.hostname)){const link=document.createElement('a');link.className='progress-portal-link';link.href=parsed.href;link.target='_blank';link.rel='noopener';link.textContent=status==='submitted'?t('portalCheck'):t('portalOpen');actions.append(link);}}catch{}
    if(status==='draft'){const mark=document.createElement('button');mark.type='button';mark.className='progress-submit-button';mark.textContent=t('markSubmitted');mark.addEventListener('click',()=>updateApplicationStatus(item));actions.append(mark);}
    if(actions.childElementCount)card.append(actions);
    const updated=document.createElement('small');updated.className='application-progress-updated';updated.textContent=`${t('updated')} ${new Date(item.updated_at||item.created_at).toLocaleDateString(uiLanguage==='hi'?'hi-IN':'en-IN')}`;card.append(updated);list.append(card);
  }
  const note=document.createElement('p');note.className='application-progress-note';note.textContent=t('portalNote');list.append(note);
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
function setAuthMode(mode){authMode=mode;const signup=mode==='signup';$('#authTitle').textContent=signup?t('profileTitle'):t('welcomeBack');$('#authCopy').textContent=signup?t('profileSignup'):t('profileLogin');$('#authSubmit').innerHTML=signup?`${t('signup')} <span>→</span>`:`${t('login')} <span>→</span>`;for(const el of document.querySelectorAll('.auth-signup')){el.hidden=!signup;const field=el.querySelector('input');if(field)field.required=signup;}const password=authForm.elements.password;password.autocomplete=signup?'new-password':'current-password';password.minLength=signup?10:0;document.querySelectorAll('.auth-tab').forEach(tab=>tab.classList.toggle('active',tab.dataset.authMode===mode));$('#authError').textContent='';}
document.querySelectorAll('.auth-tab').forEach(tab=>tab.addEventListener('click',()=>setAuthMode(tab.dataset.authMode)));
$('#closeAuth').addEventListener('click',()=>{authDialog.close();afterAuth=null;});
$('#continueGuest').addEventListener('click',()=>{afterAuth=null;authDialog.close();if(shouldOpenApplyAssistant)startApplyAssistant();});
$('#logoutBtn').addEventListener('click',()=>{authToken='';currentUser=null;conversationList=[];currentConversationId=null;chatHistory=[];messages.replaceChildren();welcome.hidden=false;sessionStorage.removeItem('janSahayakToken');sessionStorage.removeItem('janSahayakProfile');updateAccount(null);renderConversations();renderApplicationProgress();requestAuth();});
authForm.addEventListener('submit',async e=>{
  e.preventDefault();$('#authError').textContent='';const values=Object.fromEntries(new FormData(authForm).entries());values.consent=authForm.elements.consent.checked;
  try{const r=await fetch(`/api/auth/${authMode}`,{method:'POST',headers:apiHeaders(),body:JSON.stringify(values)});const result=await r.json();if(!r.ok)throw new Error(result.error||'Could not authenticate.');authToken=result.token;sessionStorage.setItem('janSahayakToken',authToken);sessionStorage.setItem('janSahayakProfile',JSON.stringify(result.user));updateAccount(result.user);authDialog.close();authForm.reset();const next=afterAuth;afterAuth=null;await Promise.all([loadConversations(!next),loadApplications()]);if(next)await next();}
  catch(error){$('#authError').textContent=error.message||'Could not authenticate.';}
});
setAuthMode('signup');
$('#language').addEventListener('change',()=>applyWebsiteLanguage($('#language').value));
applyWebsiteLanguage(uiLanguage);
if(authToken){fetch('/api/auth/me',{headers:apiHeaders(false)}).then(async r=>{const data=await r.json();if(!r.ok)throw new Error();sessionStorage.setItem('janSahayakProfile',JSON.stringify(data.user));updateAccount(data.user);await Promise.all([loadConversations(true),loadApplications()]);if(shouldOpenApplyAssistant)startApplyAssistant();}).catch(()=>{authToken='';sessionStorage.removeItem('janSahayakToken');updateAccount(null);renderConversations();renderApplicationProgress();if(embeddedAssistant)startApplyAssistant();else if(shouldOpenApplyAssistant)requestAuth(()=>startApplyAssistant());});}
else{updateAccount(null);renderConversations();renderApplicationProgress();if(embeddedAssistant)startApplyAssistant();else setTimeout(()=>requestAuth(()=>shouldOpenApplyAssistant&&startApplyAssistant()),0);}
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
const automationDialog=$('#automationDialog'),automationForm=$('#automationForm');
let demoStep=0;
const demoScreens=[...document.querySelectorAll('.demo-screen')];
function showDemoStep(step){demoStep=Math.max(0,Math.min(3,step));demoScreens.forEach((screen,index)=>screen.hidden=index!==demoStep);document.querySelectorAll('.demo-steps span').forEach((item,index)=>item.classList.toggle('active',index<=demoStep));$('#demoBack').hidden=demoStep===0||demoStep===3;}
function resetDemo(){automationForm.reset();showDemoStep(0);$('#demoReview').replaceChildren();$('#demoChecks').replaceChildren();$('#demoSummary').replaceChildren();$('#copyAssistFields').replaceChildren();}
$('#automationOpen').addEventListener('click',()=>{resetDemo();automationDialog.showModal();});
$('#closeAutomation').addEventListener('click',()=>automationDialog.close());
automationDialog.addEventListener('click',event=>{if(event.target===automationDialog)automationDialog.close();});
$('#demoBack').addEventListener('click',()=>showDemoStep(demoStep-1));
$('#restartDemo').addEventListener('click',resetDemo);
document.querySelectorAll('.demo-next').forEach(button=>button.addEventListener('click',()=>{
  if(demoStep===0){const mobile=automationForm.elements.mobile,otp=automationForm.elements.otp;if(!mobile.reportValidity()||!otp.reportValidity())return;if(otp.value!=='123456'){otp.setCustomValidity('Use the demo OTP 123456.');otp.reportValidity();otp.setCustomValidity('');return;}showDemoStep(1);return;}
  if(demoStep===1){if(!automationForm.elements.name.reportValidity())return;buildDemoReview();showDemoStep(2);return;}
  if(demoStep===2){if(!runDemoChecks())return;showDemoStep(3);}
}));
$('#demoDigiLocker').addEventListener('click',()=>{automationForm.elements.name.value='Aarav Sharma';automationForm.elements.dob.value='2007-08-14';automationForm.elements.category.value='OBC';automationForm.elements.income.value='180000';automationForm.elements.marks.value='82.4';automationForm.elements.ifsc.value='DEMO0001234';automationForm.elements.account.value='000123456789';});
$('#demoReuseProfile').addEventListener('click',()=>{let profile={};try{profile=JSON.parse(sessionStorage.getItem('janSahayakProfile')||'{}');}catch{};automationForm.elements.name.value=profile.name||'';automationForm.elements.category.value=profile.category||'';automationForm.elements.dob.value='';automationForm.elements.income.value='';automationForm.elements.marks.value='';automationForm.elements.ifsc.value='';automationForm.elements.account.value='';});
$('#demoDocument').addEventListener('change',async event=>{const file=event.target.files?.[0];if(!file)return;const status=event.target.closest('.demo-screen').querySelector('.demo-help');status.textContent=`Reading ${file.name} locally…`;try{const text=await readUploadedDocument(file,value=>status.textContent=value),extracted=parseOcrFields(text),mapping={name:extracted.name,dob:extracted.dob,category:extracted.category,income:extracted.income,marks:extracted.marks,ifsc:extracted.ifsc,account:extracted.account};for(const [key,value]of Object.entries(mapping))if(value)automationForm.elements[key].value=value;if(extracted.accountName)automationForm.elements.account.value=extracted.accountName;status.textContent=`OCR read ${text.trim().split(/\s+/).filter(Boolean).length} words. Extracted values are unverified; review and correct them before continuing.`;}catch(error){status.textContent=error.message||'OCR could not read this file. You can enter details manually.';}});
function demoValues(){return Object.fromEntries(['name','dob','category','income','marks','ifsc','account'].map(key=>[key,automationForm.elements[key].value.trim()]));}
function buildDemoReview(){const values=demoValues(),labels={name:'Full name',dob:'Date of birth',category:'Category',income:'Annual income',marks:'Class 12 marks',ifsc:'IFSC code',account:'Bank account'};const container=$('#demoReview');container.replaceChildren();for(const [key,label] of Object.entries(labels)){const row=document.createElement('label');row.className='demo-review-row';const title=document.createElement('span');title.textContent=label;const input=document.createElement('input');input.name=`review_${key}`;input.value=values[key];input.setAttribute('aria-label',`Confirm ${label}`);row.append(title,input);container.append(row);}}
function runDemoChecks(){const values=Object.fromEntries(['name','dob','category','income','marks','ifsc','account'].map(key=>[key,automationForm.elements[`review_${key}`].value.trim()]));const issues=[];if(!values.name)issues.push('Add the applicant name.');if(values.ifsc&&!/^[A-Z]{4}0[A-Z0-9]{6}$/.test(values.ifsc.toUpperCase()))issues.push('IFSC should match the 11 character bank code format.');if(values.marks&&(Number(values.marks)<0||Number(values.marks)>100))issues.push('Marks must be between 0 and 100.');if(values.income&&Number(values.income)<0)issues.push('Income cannot be negative.');if(values.dob&&new Date(values.dob)>new Date())issues.push('Date of birth cannot be in the future.');if(values.account&&!/^\d{6,18}$/.test(values.account))issues.push('Demo account number should contain 6–18 digits.');const checks=$('#demoChecks');checks.replaceChildren();const items=issues.length?issues:['Basic format checks passed. Scheme age, income, category and marks rules need to be checked against current official criteria.'];for(const issue of items){const row=document.createElement('p');row.className=issues.length?'check-warning':'check-ok';row.textContent=`${issues.length?'!':'✓'} ${issue}`;checks.append(row);}if(issues.length){const note=document.createElement('p');note.className='check-warning';note.textContent='Resolve the flagged issues, then rerun checks before using copy assist.';checks.append(note);return false;}$('#demoSummary').textContent=`${values.name||'Applicant'} · ${values.category||'Category not provided'} · ${values.marks?`${values.marks}% marks`:'Marks not provided'} · Review and submit on the official portal.`;const copies=$('#copyAssistFields');copies.replaceChildren();for(const key of ['name','dob','category','income','marks','ifsc','account']){if(!values[key])continue;const row=document.createElement('div');row.className='copy-row';const value=document.createElement('span');value.textContent=`${key==='dob'?'Date of birth':key==='ifsc'?'IFSC':key[0].toUpperCase()+key.slice(1)} · ${values[key]}`;const copy=document.createElement('button');copy.type='button';copy.textContent='Copy';copy.addEventListener('click',async()=>{try{await navigator.clipboard.writeText(values[key]);copy.textContent='Copied';setTimeout(()=>copy.textContent='Copy',1200);}catch{copy.textContent='Clipboard unavailable';}});row.append(value,copy);copies.append(row);}return true;}
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
async function updateApplicationSteps(item,stepId,checked){
  const completed=new Set(Array.isArray(item.details?.completed_steps)?item.details.completed_steps:[]);if(checked)completed.add(stepId);else completed.delete(stepId);
  try{const response=await fetch(`/api/applications/${item.id}`,{method:'PATCH',headers:apiHeaders(),body:JSON.stringify({completedSteps:[...completed]})}),result=await response.json();if(!response.ok)throw new Error(result.error||'Could not save this step.');await loadApplications();}
  catch(error){const list=$('#applicationProgressList'),notice=document.createElement('p');notice.className='application-progress-error';notice.textContent=error.message||'Could not save this step.';list.prepend(notice);await loadApplications();}
}
async function loadApplications(){
  const list=$('#applicationsList');if(!authToken){list.textContent=t('loginProgress');renderApplicationProgress();return;}
  try{const r=await fetch('/api/applications',{headers:apiHeaders(false)}),data=await r.json();if(!r.ok)throw new Error(data.error);const applications=data.applications||[];renderApplicationProgress(applications);if(!applications.length){list.textContent=t('noApplications');return;}list.replaceChildren(...applications.map(item=>{const row=document.createElement('div');row.className='application-row';const name=document.createElement('span');name.textContent=item.scheme_name||item.scheme_id;const status=document.createElement('small');status.textContent=`${t(item.status)||item.status} · ${new Date(item.created_at).toLocaleDateString(uiLanguage==='hi'?'hi-IN':'en-IN')}`;row.append(name,status);if(item.status==='draft'){const mark=document.createElement('button');mark.type='button';mark.className='application-mark';mark.textContent=t('markSubmitted');mark.addEventListener('click',()=>updateApplicationStatus(item));row.append(mark);}return row;}));}
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

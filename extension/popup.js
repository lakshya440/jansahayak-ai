const $=selector=>document.querySelector(selector);
const status=$('#connectStatus'),ocrStatus=$('#ocrStatus');
let ocrWorkerPromise=null,pdfjsPromise=null,extractedValues={};

function normalizeOrigin(value){
  const url=new URL(String(value||'').trim());
  if(url.protocol!=='https:'&&!(url.protocol==='http:'&&url.hostname==='localhost'))throw new Error('Use an HTTPS site address (HTTP is allowed only for localhost).');
  return url.origin;
}
function permissionPattern(origin){const url=new URL(origin);return `${url.protocol}//${url.host}/*`;}
async function activePageStatus(){
  const [tab]=await chrome.tabs.query({active:true,currentWindow:true}),page=$('#pageStatus');
  if(!tab?.url){page.textContent='Open a supported government website or mock sandbox.';return;}
  try{const url=new URL(tab.url),host=url.hostname.toLowerCase(),official=url.protocol==='https:'&&(host==='gov.in'||host.endsWith('.gov.in')||host==='nic.in'||host.endsWith('.nic.in')),local=url.protocol==='http:'&&host==='localhost'&&url.pathname.startsWith('/mock-nsp');page.textContent=official||local?'Ready to scan and fill matching blank fields on this page.':'Supported pages: HTTPS .gov.in / .nic.in · localhost mock sandbox';}catch{page.textContent='Open a supported government website or mock sandbox.';}
}
async function loadSettings(){
  const saved=await chrome.storage.local.get(['apiOrigin','profileToken','localProfile','allowBankDetails']);
  if(saved.apiOrigin)$('#apiOrigin').value=saved.apiOrigin;
  if(saved.profileToken){status.textContent='Connected · profile access is read-only.';$('#disconnectButton').hidden=false;}
  for(const input of document.querySelectorAll('[data-profile]'))input.value=saved.localProfile?.[input.dataset.profile]||'';
  $('#allowBankDetails').checked=saved.allowBankDetails===true;
  const pending=await chrome.storage.session.get(['pendingDocumentValues','allowDocumentBank']);if(pending.pendingDocumentValues){showReview(pending.pendingDocumentValues);$('#allowDocumentBank').checked=pending.allowDocumentBank===true;ocrStatus.textContent='Your reviewed OCR suggestions are ready for this and the next pages in this browser session.';}
  await activePageStatus();
}
async function getOcrWorker(){
  if(!ocrWorkerPromise)ocrWorkerPromise=import(chrome.runtime.getURL('vendor/tesseract/tesseract.esm.min.js')).then(({default:Tesseract})=>Tesseract.createWorker('eng+hin',1,{workerPath:chrome.runtime.getURL('vendor/tesseract/worker.min.js'),corePath:chrome.runtime.getURL('vendor/tesseract-core'),logger:message=>{if(message.status==='recognizing text')ocrStatus.textContent=`Reading document locally… ${Math.round((message.progress||0)*100)}%`;}})).catch(error=>{ocrWorkerPromise=null;throw error;});
  return ocrWorkerPromise;
}
async function getPdfJs(){if(!pdfjsPromise)pdfjsPromise=import(chrome.runtime.getURL('vendor/pdfjs/pdf.mjs')).then(pdfjs=>{pdfjs.GlobalWorkerOptions.workerSrc=chrome.runtime.getURL('vendor/pdfjs/pdf.worker.min.mjs');return pdfjs;});return pdfjsPromise;}
async function readDocument(file){
  if(file.size>10*1024*1024)throw new Error('Each document must be under 10 MB.');
  const name=file.name.toLowerCase(),pdf=file.type==='application/pdf'||name.endsWith('.pdf'),image=['image/jpeg','image/png','image/webp'].includes(file.type)||/\.(jpe?g|png|webp)$/.test(name);
  if(!pdf&&!image)throw new Error('Use a JPG, PNG, WebP, or PDF file.');
  if(!pdf){const worker=await getOcrWorker();return (await worker.recognize(file,{rotateAuto:true})).data.text;}
  const pdfjs=await getPdfJs(),document=await pdfjs.getDocument({data:await file.arrayBuffer()}).promise,pages=Math.min(document.numPages,4);let text='';
  for(let pageNo=1;pageNo<=pages;pageNo++){const page=await document.getPage(pageNo),content=await page.getTextContent();text+=content.items.map(item=>item.str).join(' ')+'\n';}
  if(text.replace(/\s/g,'').length>=30)return text;
  text='';const worker=await getOcrWorker();
  for(let pageNo=1;pageNo<=pages;pageNo++){const page=await document.getPage(pageNo),viewport=page.getViewport({scale:1.5}),canvas=document.createElement('canvas');canvas.width=viewport.width;canvas.height=viewport.height;await page.render({canvasContext:canvas.getContext('2d'),viewport}).promise;text+=(await worker.recognize(canvas,{rotateAuto:true})).data.text+'\n';canvas.width=0;canvas.height=0;}
  return text;
}
function parseFields(raw){
  const text=String(raw||'').replace(/\r/g,'\n'),flat=text.replace(/\s+/g,' '),result={};
  const find=(patterns,source=flat)=>{for(const pattern of patterns){const match=source.match(pattern);if(match?.[1])return match[1].trim();}return '';};
  let dob=find([/\b(?:DOB|Date of Birth|D\.O\.B)\s*[:\-]?\s*(\d{2}[/-]\d{2}[/-]\d{4})/i,/जन्म\s*तिथि\s*[:\-]?\s*(\d{2}[/-]\d{2}[/-]\d{4})/i]);
  if(dob){const match=dob.match(/^(\d{2})[/-](\d{2})[/-](\d{4})$/);if(match)result.dob=`${match[3]}-${match[2]}-${match[1]}`;}
  result.ifsc=find([/\b([A-Z]{4}0[A-Z0-9]{6})\b/i]).toUpperCase();
  result.account_number=find([/(?:account\s*(?:no|number)?|a\/c\s*(?:no)?|खाता\s*(?:संख्या|नंबर)?)\D{0,15}(\d{9,18})/i]);
  result.marks=find([/(?:percentage|marks|aggregate|total|प्रतिशत|प्राप्तांक|कुल\s*अंक)\D{0,24}(\d{1,3}(?:\.\d{1,2})?)\s*%?/i,/([\d.]{1,6})\s*%/i]);if(Number(result.marks)>100)result.marks='';
  result.annual_income=find([/(?:annual|family)?\s*income\D{0,24}(?:₹|rs\.?|inr)?\s*([\d,]{4,})/i,/(?:वार्षिक\s*)?आय\D{0,24}(?:₹|रु\.?|रुपये)?\s*([\d,]{4,})/i]).replace(/,/g,'');
  result.category=find([/\b(Scheduled Caste|Scheduled Tribe|OBC|SC|ST|EWS|General)\b/i,/(सामान्य|अन्य पिछड़ा वर्ग|अनुसूचित जाति|अनुसूचित जनजाति|ईडब्ल्यूएस)/]);
  if(result.category){const value=result.category.toLowerCase();result.category=/scheduled caste|अनुसूचित जाति/.test(value)?'SC':/scheduled tribe|अनुसूचित जनजाति/.test(value)?'ST':/सामान्य/.test(value)||value==='general'?'General':/पिछड़ा/.test(value)?'OBC':/ईडब्ल्यूएस/.test(value)||value==='ews'?'EWS':value.toUpperCase();}
  result.phone=find([/(?:mobile|phone|contact)\s*(?:number|no)?\D{0,8}(\+?\d[\d\s-]{8,14})/i]);if(result.phone)result.phone=result.phone.replace(/\D/g,'').slice(-10);
  result.name=find([/(?:student|applicant|candidate)?\s*name\s*[:\-]\s*([A-Z][A-Z .'-]{2,60})/i,/(?:नाम)\s*[:\-]\s*([\u0900-\u097F ]{3,60})/]);
  if(result.name)result.name=result.name.replace(/\s+(?:father|mother|dob|date|gender|category|address).*$/i,'').trim();
  return Object.fromEntries(Object.entries(result).filter(([,value])=>value));
}
function showReview(values){
  extractedValues={...values};
  for(const input of document.querySelectorAll('[data-extracted]'))input.value=values[input.dataset.extracted]||'';
  $('#documentReview').hidden=false;
}
$('#chooseDocuments').addEventListener('click',async()=>{
  const button=$('#chooseDocuments');button.disabled=true;ocrStatus.textContent='';
  try{const granted=await chrome.permissions.request({origins:['https://cdn.jsdelivr.net/*']});if(!granted)throw new Error('Allow access to the OCR language files to read English and Hindi documents.');$('#documentFiles').click();}
  catch(error){ocrStatus.textContent=error.message||'Could not start document OCR.';}
  finally{button.disabled=false;}
});
$('#documentFiles').addEventListener('change',async event=>{
  const files=[...event.target.files||[]];if(!files.length)return;
  if(files.length>8){ocrStatus.textContent='Choose up to 8 documents at one time.';event.target.value='';return;}
  const combined={};let words=0;const failures=[];
  for(let index=0;index<files.length;index++){ocrStatus.textContent=`Reading document ${index+1} of ${files.length}: ${files[index].name} · locally…`;try{const text=await readDocument(files[index]);words+=text.trim().split(/\s+/).filter(Boolean).length;Object.assign(combined,parseFields(text));}catch(error){failures.push(`${files[index].name}: ${error.message||'could not read'}`);}}
  showReview(combined);await chrome.storage.session.set({pendingDocumentValues:combined,allowDocumentBank:$('#allowDocumentBank').checked});ocrStatus.textContent=`Read ${files.length-failures.length} of ${files.length} documents (${words} words). Suggestions are unverified; review and correct them. ${failures.join(' ')}`;event.target.value='';
});
$('#documentReview').addEventListener('input',event=>{const input=event.target.closest('[data-extracted]');if(input){extractedValues[input.dataset.extracted]=input.value.trim();chrome.storage.session.set({pendingDocumentValues:extractedValues});}});
$('#allowDocumentBank').addEventListener('change',()=>chrome.storage.session.set({allowDocumentBank:$('#allowDocumentBank').checked}));
$('#fillDocumentFields').addEventListener('click',async()=>{
  const [tab]=await chrome.tabs.query({active:true,currentWindow:true});
  const values={...extractedValues,allow_bank_details:$('#allowDocumentBank').checked};
  try{const response=await chrome.tabs.sendMessage(tab.id,{type:'sahayak-fill-from-documents',values});ocrStatus.textContent=response?.status||'Sent reviewed document values to the page. They remain available as you advance through the form.';await chrome.storage.session.set({pendingDocumentValues:extractedValues,allowDocumentBank:$('#allowDocumentBank').checked});}
  catch{ocrStatus.textContent='The active page is not supported or could not be scanned. Open an HTTPS .gov.in/.nic.in page or localhost mock sandbox, then retry.';}
});
$('#clearDocumentFields').addEventListener('click',async()=>{await chrome.storage.session.remove(['pendingDocumentValues','allowDocumentBank']);extractedValues={};$('#documentReview').hidden=true;const [tab]=await chrome.tabs.query({active:true,currentWindow:true});try{await chrome.tabs.sendMessage(tab.id,{type:'sahayak-clear-document-data'});}catch{}ocrStatus.textContent='Document suggestions cleared from this browser session.';});

$('#connectButton').addEventListener('click',async()=>{
  status.textContent='';const button=$('#connectButton');button.disabled=true;
  try{const origin=normalizeOrigin($('#apiOrigin').value),code=$('#pairCode').value.replace(/\D/g,'');if(!/^\d{9}$/.test(code))throw new Error('Enter the 9-digit code from My account in Jan Sahayak.');const granted=await chrome.permissions.request({origins:[permissionPattern(origin)]});if(!granted)throw new Error('Allow access to your Jan Sahayak address to connect the profile.');const response=await fetch(`${origin}/api/extension/connect`,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({code})});const result=await response.json().catch(()=>({}));if(!response.ok)throw new Error(result.error||'Could not connect. Create a new code and try again.');await chrome.storage.local.set({apiOrigin:origin,profileToken:result.token});$('#pairCode').value='';status.textContent='Connected. Your read-only profile token expires in 7 days.';$('#disconnectButton').hidden=false;}
  catch(error){status.textContent=error.message||'Could not connect the profile.';}finally{button.disabled=false;}
});
$('#disconnectButton').addEventListener('click',async()=>{await chrome.storage.local.remove(['apiOrigin','profileToken']);status.textContent='Profile disconnected. Your optional local details are unchanged.';$('#disconnectButton').hidden=true;});
$('#saveLocalButton').addEventListener('click',async()=>{const localProfile=Object.fromEntries([...document.querySelectorAll('[data-profile]')].map(input=>[input.dataset.profile,input.value.trim()]));await chrome.storage.local.set({localProfile,allowBankDetails:$('#allowBankDetails').checked});$('#localStatus').textContent='Optional details saved only in this browser extension.';});
$('#scanButton')?.addEventListener('click',async()=>{const [tab]=await chrome.tabs.query({active:true,currentWindow:true});try{const response=await chrome.tabs.sendMessage(tab.id,{type:'sahayak-scan-now'});if(response?.status)$('#pageStatus').textContent=response.status;}catch{$('#pageStatus').textContent='Refresh the supported page, then scan again.';}});
loadSettings();

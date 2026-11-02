const $=selector=>document.querySelector(selector);
const status=$('#connectStatus');

function normalizeOrigin(value){
  const url=new URL(String(value||'').trim());
  if(url.protocol!=='https:'&&!(url.protocol==='http:'&&url.hostname==='localhost'))throw new Error('Use an HTTPS site address (HTTP is allowed only for localhost).');
  return url.origin;
}
function permissionPattern(origin){const url=new URL(origin);return `${url.protocol}//${url.host}/*`;}
async function activePageStatus(){
  const [tab]=await chrome.tabs.query({active:true,currentWindow:true}),page=$('#pageStatus');
  if(!tab?.url){page.textContent='Open a supported government website to use autofill.';return;}
  try{const url=new URL(tab.url),host=url.hostname.toLowerCase(),official=url.protocol==='https:'&&(host==='gov.in'||host.endsWith('.gov.in')||host==='nic.in'||host.endsWith('.nic.in')),local=url.protocol==='http:'&&host==='localhost'&&url.pathname.startsWith('/mock-nsp');page.textContent=official||local?'Sahayak can scan this page for blank matching fields.':'Supported pages: HTTPS .gov.in / .nic.in · localhost mock sandbox';}catch{page.textContent='Open a supported government website to use autofill.';}
}
async function loadSettings(){
  const saved=await chrome.storage.local.get(['apiOrigin','profileToken','localProfile','allowBankDetails']);
  if(saved.apiOrigin)$('#apiOrigin').value=saved.apiOrigin;
  if(saved.profileToken){status.textContent='Connected · profile access is read-only.';$('#disconnectButton').hidden=false;}
  for(const input of document.querySelectorAll('[data-profile]'))input.value=saved.localProfile?.[input.dataset.profile]||'';
  $('#allowBankDetails').checked=saved.allowBankDetails===true;
  await activePageStatus();
}

$('#connectButton').addEventListener('click',async()=>{
  status.textContent='';const button=$('#connectButton');button.disabled=true;
  try{
    const origin=normalizeOrigin($('#apiOrigin').value),code=$('#pairCode').value.replace(/\D/g,'');
    if(!/^\d{9}$/.test(code))throw new Error('Enter the 9-digit code from My account in Jan Sahayak.');
    const granted=await chrome.permissions.request({origins:[permissionPattern(origin)]});
    if(!granted)throw new Error('Allow access to your Jan Sahayak address to connect the profile.');
    const response=await fetch(`${origin}/api/extension/connect`,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({code})});
    const result=await response.json().catch(()=>({}));if(!response.ok)throw new Error(result.error||'Could not connect. Create a new code and try again.');
    await chrome.storage.local.set({apiOrigin:origin,profileToken:result.token});
    $('#pairCode').value='';status.textContent='Connected. Your read-only profile token expires in 7 days.';$('#disconnectButton').hidden=false;
  }catch(error){status.textContent=error.message||'Could not connect the profile.';}
  finally{button.disabled=false;}
});

$('#disconnectButton').addEventListener('click',async()=>{await chrome.storage.local.remove(['apiOrigin','profileToken']);status.textContent='Profile disconnected. Your optional local details are unchanged.';$('#disconnectButton').hidden=true;});
$('#saveLocalButton').addEventListener('click',async()=>{const localProfile=Object.fromEntries([...document.querySelectorAll('[data-profile]')].map(input=>[input.dataset.profile,input.value.trim()]));await chrome.storage.local.set({localProfile,allowBankDetails:$('#allowBankDetails').checked});$('#localStatus').textContent='Optional details saved only in this browser extension.';});
$('#scanButton')?.addEventListener('click',async()=>{const [tab]=await chrome.tabs.query({active:true,currentWindow:true});try{const response=await chrome.tabs.sendMessage(tab.id,{type:'sahayak-scan-now'});if(response?.status)$('#pageStatus').textContent=response.status;}catch{$('#pageStatus').textContent='Refresh the supported page, then scan again.';}});
loadSettings();

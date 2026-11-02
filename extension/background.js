function allowedPage(rawUrl='') {
  try {
    const url=new URL(rawUrl),host=url.hostname.toLowerCase();
    return url.protocol==='https:'&&(host==='gov.in'||host.endsWith('.gov.in')||host==='nic.in'||host.endsWith('.nic.in'))
      ||url.protocol==='http:'&&host==='localhost'&&url.pathname.startsWith('/mock-nsp');
  } catch { return false; }
}

async function loadProfile() {
  const saved=await chrome.storage.local.get(['apiOrigin','profileToken','localProfile','allowBankDetails']);
  if(!saved.apiOrigin||!saved.profileToken)return {connected:false};
  let response;
  try {
    response=await fetch(`${saved.apiOrigin}/api/extension/profile`,{headers:{authorization:`Bearer ${saved.profileToken}`},cache:'no-store'});
  } catch { return {connected:true,error:'Can’t reach Jan Sahayak. Check your connection.'}; }
  if(response.status===401){await chrome.storage.local.remove(['profileToken']);return {connected:false,error:'Your connection expired. Pair the extension again from Jan Sahayak.'};}
  if(!response.ok)return {connected:true,error:'Couldn’t read your saved profile. Try again.'};
  const data=await response.json();
  if(data.profile?.consent!==true)return {connected:true,error:'Enable profile storage in Jan Sahayak to use autofill.'};
  return {connected:true,profile:{...data.profile,...(saved.localProfile||{}),allow_bank_details:saved.allowBankDetails===true}};
}

async function playVerificationCue() {
  try {
    const contexts=await chrome.runtime.getContexts({contextTypes:['OFFSCREEN_DOCUMENT']});
    if(!contexts.length)await chrome.offscreen.createDocument({url:'offscreen.html',reasons:['AUDIO_PLAYBACK'],justification:'Play a short cue when a supported government form needs the user to complete verification.'});
    await chrome.runtime.sendMessage({type:'sahayak-play-beep'});
  } catch {}
}

chrome.runtime.onMessage.addListener((message,sender,sendResponse)=>{
  if(message?.type==='sahayak-get-profile'){
    if(!allowedPage(sender.tab?.url||sender.url))return;
    loadProfile().then(sendResponse).catch(()=>sendResponse({connected:false,error:'Couldn’t load the saved profile.'}));
    return true;
  }
  if(message?.type==='sahayak-verification-required'){
    if(!allowedPage(sender.tab?.url||sender.url))return;
    chrome.notifications.create(`sahayak-${sender.tab?.id||'tab'}-${Date.now()}`,{type:'basic',iconUrl:chrome.runtime.getURL('icons/icon128.png'),title:'Sahayak needs you',message:'Complete the OTP, CAPTCHA, or identity check yourself. Sahayak will scan again when you continue.',priority:2});
    playVerificationCue();
  }
});

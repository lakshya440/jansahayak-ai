function supportedPage(value=''){
  try{const url=new URL(value),host=url.hostname.toLowerCase();return url.protocol==='https:'&&(host==='gov.in'||host.endsWith('.gov.in')||host==='nic.in'||host.endsWith('.nic.in'))||url.protocol==='http:'&&host==='localhost'&&url.pathname.startsWith('/mock-nsp');}catch{return false;}
}
async function activeTabs(){const result=await chrome.storage.session.get('activeGuideTabs');return new Set(result.activeGuideTabs||[]);}
async function saveActiveTabs(tabs){await chrome.storage.session.set({activeGuideTabs:[...tabs]});}

chrome.runtime.onMessage.addListener((message,sender,sendResponse)=>{
  if(message?.type==='sahayak-page-support'){
    (async()=>{const tab=Number.isInteger(message.tabId)?await chrome.tabs.get(message.tabId):sender.tab;const tabs=await activeTabs();return {supported:supportedPage(tab?.url||''),active:tabs.has(tab?.id)};})().then(sendResponse).catch(()=>sendResponse({supported:false,active:false}));
    return true;
  }
  if(message?.type==='sahayak-start-guide'||message?.type==='sahayak-stop-guide'){
    (async()=>{
      const tabId=Number(message.tabId);if(!Number.isInteger(tabId))throw new Error('Choose a browser tab first.');
      const tab=await chrome.tabs.get(tabId);if(!supportedPage(tab.url))throw new Error('Open an HTTPS .gov.in or .nic.in page, or the local mock sandbox.');
      const tabs=await activeTabs();
      if(message.type==='sahayak-start-guide')tabs.add(tabId);else tabs.delete(tabId);
      await saveActiveTabs(tabs);
      try{await chrome.tabs.sendMessage(tabId,{type:message.type});}
      catch{await chrome.scripting.executeScript({target:{tabId},files:['content.js']});await new Promise(resolve=>setTimeout(resolve,80));await chrome.tabs.sendMessage(tabId,{type:message.type});}
      return {active:message.type==='sahayak-start-guide'};
    })().then(sendResponse).catch(error=>sendResponse({error:error.message||'Sahayak could not scan this page.'}));
    return true;
  }
  if(message?.type==='sahayak-stop-tab-guide'){
    (async()=>{const tabId=sender.tab?.id,tabs=await activeTabs();if(Number.isInteger(tabId))tabs.delete(tabId);await saveActiveTabs(tabs);return {active:false};})().then(sendResponse).catch(error=>sendResponse({error:error.message}));return true;
  }
  if(message?.type==='sahayak-guide-state'){
    activeTabs().then(tabs=>sendResponse({active:tabs.has(sender.tab?.id)}));return true;
  }
});

chrome.tabs.onRemoved.addListener(async tabId=>{const tabs=await activeTabs();if(tabs.delete(tabId))await saveActiveTabs(tabs);});

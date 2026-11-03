const $=selector=>document.querySelector(selector);
let currentTabId=null;
async function refresh(){
  const [tab]=await chrome.tabs.query({active:true,currentWindow:true}),status=$('#pageStatus');currentTabId=tab?.id??null;
  if(!tab?.url){status.textContent='Open a supported scheme website to use the page guide.';return;}
  const state=await chrome.runtime.sendMessage({type:'sahayak-page-support',tabId:currentTabId});
  if(!state?.supported){status.textContent='Supported pages: HTTPS .gov.in and .nic.in, plus the local walkthrough.';return;}
  status.textContent=`Ready · ${new URL(tab.url).hostname}`;$('#startGuide').hidden=Boolean(state.active);$('#stopGuide').hidden=!state.active;
}
async function control(type){
  const status=$('#actionStatus'),button=type==='sahayak-start-guide'?$('#startGuide'):$('#stopGuide');status.textContent='';button.disabled=true;
  try{const result=await chrome.runtime.sendMessage({type,tabId:currentTabId});if(result?.error)throw new Error(result.error);status.textContent=type==='sahayak-start-guide'?'Crawler is open on this page. Continue through the form; Sahayak will rescan each step.':'Page guide stopped.';await refresh();}
  catch(error){status.textContent=error.message||'Could not start the page guide.';}
  finally{button.disabled=false;}
}
$('#startGuide').addEventListener('click',()=>control('sahayak-start-guide'));
$('#stopGuide').addEventListener('click',()=>control('sahayak-stop-guide'));
refresh();

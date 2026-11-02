chrome.runtime.onMessage.addListener(message=>{
  if(message?.type!=='sahayak-play-beep')return;
  const sound=new Audio(chrome.runtime.getURL('audio/verification-cue.wav'));
  sound.volume=.35;sound.play().catch(()=>{});
});

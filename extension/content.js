(() => {
  const HOST=location.hostname.toLowerCase();
  const OFFICIAL=location.protocol==='https:'&&(HOST==='gov.in'||HOST.endsWith('.gov.in')||HOST==='nic.in'||HOST.endsWith('.nic.in'));
  const LOCAL=location.protocol==='http:'&&HOST==='localhost'&&location.pathname.startsWith('/mock-nsp');
  if(!OFFICIAL&&!LOCAL)return;

  const secretField=/aadhaar|aadhar|uidai|pan.?number|otp|one.?time|captcha|recaptcha|hcaptcha|verification.?code|security.?code|password|passcode|pin.?code|signature|biometric|face.?verification|consent|agree|upload|file/i;
  const challenge=/captcha|recaptcha|hcaptcha|one.?time password|\botp\b|verification code|verify your (?:mobile|phone|identity)|human verification|i am not a robot|aadhaar face|biometric verification|मानव सत्यापन|ओटीपी|कैप्चा|सत्यापन कोड/i;
  const bankField=/bank|account.?number|account.?holder|ifsc|micr|branch.?code/i;
  let profile=null,widget=null,statusNode=null,filledCount=0,challengeVisible=false,scanTimer=0;

  function announce(text,attention=false){
    if(!widget){widget=document.createElement('div');widget.id='sahayak-ai-extension';const shadow=widget.attachShadow({mode:'open'});shadow.innerHTML=`<style>
      :host{all:initial;position:fixed;right:18px;bottom:18px;z-index:2147483647;font-family:Arial,sans-serif;color:#24342a}
      *{box-sizing:border-box}.card{width:min(320px,calc(100vw - 36px));border:1px solid #dce7db;border-radius:16px;background:#fff;box-shadow:0 12px 40px #17251c30;overflow:hidden}
      .head{display:flex;align-items:center;gap:9px;padding:11px 13px;background:#f0f6ee;border-bottom:1px solid #e3ebe1}
      img{width:27px;height:27px}.title{font-weight:700;font-size:12px}.sub{display:block;margin-top:2px;color:#7f8d81;font-size:8px;letter-spacing:.7px}
      .dot{width:7px;height:7px;margin-left:auto;border-radius:50%;background:#579367}.body{padding:11px 13px 12px;font-size:11px;line-height:1.45}
      .note{display:block;margin-top:5px;color:#88948a;font-size:9px}.attention{color:#965f29}.count{color:#32734b;font-weight:700}
      </style><div class="card" role="status" aria-live="polite"><div class="head"><img src="${chrome.runtime.getURL('icons/icon48.png')}" alt=""><div><span class="title">Sahayak AI</span><small class="sub">GOVERNMENT FORM HELPER</small></div><span class="dot"></span></div><div class="body"><span class="message">Looking for saved fields…</span><small class="note">You control verification, navigation, and submission.</small></div></div>`;document.documentElement.append(widget);statusNode=shadow.querySelector('.message');
    }
    statusNode.className=attention?'message attention':'message';statusNode.textContent=text;
  }

  function fieldDescription(field){
    const labels=[...(field.labels||[])].map(label=>label.innerText||label.textContent||'').join(' ');
    return [labels,field.getAttribute('aria-label'),field.getAttribute('placeholder'),field.name,field.id,field.autocomplete].filter(Boolean).join(' ').toLowerCase().replace(/[_-]+/g,' ');
  }
  function hidden(field){return !field.isConnected||field.disabled||field.readOnly||field.getClientRects().length===0||getComputedStyle(field).visibility==='hidden';}
  function classify(field){
    const text=fieldDescription(field),type=(field.type||'').toLowerCase();
    if(secretField.test(text)||['hidden','password','file','checkbox','radio','button','submit','reset','image'].includes(type)||field.isContentEditable)return null;
    if(/father|mother|guardian|husband|wife|parent|emergency|alternate|relative/.test(text)&&/name|phone|mobile|contact/.test(text))return null;
    const rules=[
      ['dob',/date of birth|birth date|\bdob\b|जन्म.?तिथि/],
      ['account_holder',/account holder|name on (?:the )?account|खाताधारक/],
      ['ifsc',/\bifsc\b|bank.?branch.?code/],
      ['account_number',/bank account|account number|account no\b|a\/c number|\ba\/c no\b/],
      ['annual_income',/annual (?:family )?income|family income|household income|वार्षिक आय|पारिवारिक आय/],
      ['marks',/class.?12 marks|marks percentage|aggregate marks|percentage of marks|प्रतिशत अंक/],
      ['institution',/school name|institution name|college name|विद्यालय|संस्थान का नाम/],
      ['course',/course|class|standard|grade|कक्षा|पाठ्यक्रम/],
      ['district',/district|जिला|ज़िला/],
      ['state',/state|राज्य/],
      ['category',/caste|social category|applicant category|category|जाति|श्रेणी/],
      ['land_acres',/land (?:owned|holding|area|cultivated)|acreage|भूमि/],
      ['education_level',/education level|highest education|शिक्षा स्तर/],
      ['age',/\bage\b|आयु/],
      ['phone',/mobile number|phone number|contact number|मोबाइल|फ़ोन नंबर|फोन नंबर/],
      ['email',/email|e mail|ईमेल/],
      ['name',/full name|applicant name|student name|beneficiary name|name of applicant|name of student|पूरा नाम|आवेदक का नाम/]
    ];
    return rules.find(([,pattern])=>pattern.test(text))?.[0]||null;
  }
  function normalized(value){return String(value||'').trim().toLowerCase().replace(/[\s._-]+/g,'');}
  function valueFor(kind){
    if(!profile)return '';
    if(bankField.test(kind)&&!profile.allow_bank_details)return '';
    return String(profile[kind]??'').trim();
  }
  function selectValue(select,value){
    const wanted=normalized(value),aliases={sc:['sc','scheduledcaste'],st:['st','scheduledtribe'],obc:['obc','otherbackwardclass'],ews:['ews','economicallyweakersection']};
    const terms=aliases[wanted]||[wanted];
    const option=[...select.options].find(item=>{const text=normalized(`${item.value} ${item.textContent}`);return terms.some(term=>term&&text.includes(term));});
    if(!option||!option.value)return false;
    select.value=option.value;return true;
  }
  function setField(field,value){
    if(field instanceof HTMLSelectElement){if(!selectValue(field,value))return false;}
    else if(field.type==='date'){
      const parsed=new Date(value);if(!/^\d{4}-\d{2}-\d{2}$/.test(value)||Number.isNaN(parsed.getTime()))return false;
      field.value=value;
    }else field.value=value;
    field.dispatchEvent(new Event('input',{bubbles:true}));field.dispatchEvent(new Event('change',{bubbles:true}));
    const prior=field.style.outline;field.style.outline='2px solid #388653';setTimeout(()=>field.style.outline=prior,1800);return true;
  }
  function verificationNeeded(){
    const pageText=(document.body?.innerText||'').slice(0,50000);
    const verificationField=[...document.querySelectorAll('input,textarea')].some(field=>challenge.test(fieldDescription(field))&&!hidden(field));
    return verificationField||challenge.test(pageText);
  }
  function scan(){
    const needsHelp=verificationNeeded();
    if(needsHelp&&!challengeVisible){challengeVisible=true;announce('Complete the OTP, CAPTCHA, or identity check yourself. I’ll scan again after you continue.',true);chrome.runtime.sendMessage({type:'sahayak-verification-required'}).catch(()=>{});}
    if(!needsHelp)challengeVisible=false;
    let count=0;
    for(const field of document.querySelectorAll('input,select,textarea')){
      if(hidden(field)||field.value?.trim())continue;
      const kind=classify(field);if(!kind)continue;
      const value=valueFor(kind);if(!value)continue;
      if(kind==='account_number'||kind==='account_holder'||kind==='ifsc')if(!profile.allow_bank_details)continue;
      if(setField(field,value))count++;
    }
    if(count){filledCount+=count;announce(`Filled ${count} blank field${count===1?'':'s'} from your saved profile.`,false);}
    else if(needsHelp)announce('Verification needs you. Complete it, then continue; I’ll rescan the next step.',true);
    else if(!statusNode?.textContent||statusNode.textContent.startsWith('Looking'))announce('Scanning this supported government page for matching blank fields.',false);
    return count;
  }
  function scheduleScan(){clearTimeout(scanTimer);scanTimer=setTimeout(scan,450);}
  function startObserver(){const observer=new MutationObserver(scheduleScan);observer.observe(document.documentElement,{childList:true,subtree:true,attributes:true,attributeFilter:['value','disabled','hidden']});document.addEventListener('input',scheduleScan,true);document.addEventListener('change',scheduleScan,true);window.addEventListener('popstate',scheduleScan);}

  chrome.runtime.onMessage.addListener((message,_sender,sendResponse)=>{
    if(message?.type==='sahayak-scan-now'){const count=scan();sendResponse({status:count?`Sahayak filled ${count} blank field${count===1?'':'s'}.`:'Sahayak scanned this page.'});}
  });
  chrome.runtime.sendMessage({type:'sahayak-get-profile'}).then(result=>{
    if(!result?.connected)return;
    announce(result.error||'Connected · scanning supported government forms.',Boolean(result.error));
    if(result.error)return;
    profile=result.profile;scan();startObserver();
  }).catch(()=>{});
})();

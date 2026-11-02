(() => {
  if (window.__sahayakGuideInstalled) return;
  window.__sahayakGuideInstalled = true;

  let active = false;
  let widget;
  let observer;
  let timer;
  const challengePattern = /captcha|recaptcha|hcaptcha|\botp\b|one.?time password|verification code|verify your (?:mobile|phone|identity)|human verification|i am not a robot|aadhaar face|biometric/i;
  const stopWords = /aadhaar|aadhar|otp|captcha|password|passcode|pin|signature|biometric|consent|agree|upload|file/i;
  const css = `
    :host{all:initial;position:fixed;right:20px;bottom:20px;z-index:2147483647;font:14px/1.45 system-ui,-apple-system,Segoe UI,sans-serif;color:#20352a}
    *{box-sizing:border-box} .panel{width:min(360px,calc(100vw - 32px));max-height:min(74vh,680px);display:flex;flex-direction:column;background:#fff;border:1px solid #dbe7dc;border-radius:20px;box-shadow:0 18px 60px #10231938;overflow:hidden}
    .head{display:flex;align-items:center;gap:11px;padding:15px 17px;background:#eff6ee;border-bottom:1px solid #e2ece0}.mark{display:grid;place-items:center;width:38px;height:38px;border-radius:13px;background:#236c49;color:white;font-weight:800;font-size:17px}.brand{font-weight:750;font-size:14px}.sub{display:block;color:#718375;font-size:9px;letter-spacing:1px;font-weight:700}.pulse{width:9px;height:9px;margin-left:auto;border-radius:50%;background:#30a46c;box-shadow:0 0 0 4px #d7efdd;animation:pulse 1.7s infinite}@keyframes pulse{50%{box-shadow:0 0 0 8px #d7efdd55}}
    .content{overflow:auto;padding:17px}.eyebrow{font-size:9px;letter-spacing:1.5px;font-weight:800;color:#698871}.title{margin:5px 0 7px;font-size:20px;line-height:1.2;letter-spacing:-.5px}.advice{margin:0 0 14px;color:#54665a;font-size:12px}.stats{display:flex;gap:8px;margin:0 0 14px}.stat{flex:1;padding:9px 10px;border:1px solid #e4ebe2;border-radius:12px;background:#f8faf7;color:#667568;font-size:10px}.stat b{display:block;color:#244d34;font-size:17px}.alert{margin:0 0 13px;padding:10px 11px;border:1px solid #f0ddb2;border-radius:12px;background:#fff8e8;color:#7b5823;font-size:11px}.section{margin:14px 0 7px;color:#728276;font-size:9px;font-weight:800;letter-spacing:1.15px;text-transform:uppercase}.list{margin:0;padding:0;list-style:none}.row{display:flex;align-items:flex-start;gap:8px;padding:8px 0;border-bottom:1px solid #edf1ec;color:#394b3e;font-size:11px}.badge{flex:0 0 17px;height:17px;display:grid;place-items:center;border-radius:50%;background:#eaf3e9;color:#33714c;font-size:10px;font-weight:800}.row button{margin-left:auto;padding:4px 7px;border:1px solid #d8e5d7;border-radius:8px;background:#fff;color:#356849;font:600 9px system-ui,sans-serif;cursor:pointer}.empty{padding:10px;border-radius:11px;background:#f4f8f2;color:#59705e;font-size:11px}.actions{display:flex;gap:8px;padding:12px 16px;border-top:1px solid #e9eee7}.actions button{flex:1;min-height:36px;border:1px solid #dbe6d9;border-radius:11px;background:#f8faf7;color:#355b40;font:650 11px system-ui,sans-serif;cursor:pointer}.actions .primary{background:#236c49;border-color:#236c49;color:#fff}.foot{padding:0 17px 13px;color:#879388;font-size:9px}.close{margin-left:5px;border:0;background:transparent;color:#526658;font-size:20px;cursor:pointer}
  `;

  function textOf(node) { return (node?.innerText || node?.textContent || '').replace(/\s+/g, ' ').trim(); }
  function visible(node) { return node?.isConnected && node.getClientRects().length > 0 && getComputedStyle(node).visibility !== 'hidden'; }
  function labelFor(field) {
    const labels = [...(field.labels || [])].map(textOf);
    const parent = field.closest('label');
    const labelledBy = (field.getAttribute('aria-labelledby') || '').split(/\s+/).map(id => textOf(document.getElementById(id)));
    const near = textOf(field.parentElement).slice(0, 110);
    return [...labels, textOf(parent), ...labelledBy, field.getAttribute('aria-label'), field.placeholder, field.name, field.id, near].filter(Boolean).join(' · ').replace(/\s+/g, ' ').slice(0, 150);
  }
  function scanPage() {
    const heading = textOf(document.querySelector('main h1,h1,[role="heading"][aria-level="1"],main h2,h2,h3')) || document.title || 'Current page';
    const fields = [...document.querySelectorAll('input:not([type=hidden]):not([type=submit]):not([type=button]):not([type=reset]),select,textarea,[role=combobox]')].filter(visible);
    const required = fields.filter(field => field.required || field.getAttribute('aria-required') === 'true' || /\*/.test(labelFor(field)));
    const blank = required.filter(field => !String(field.value || '').trim());
    const labels = [...new Set(blank.map(labelFor).filter(label => label && !stopWords.test(label)))].slice(0, 6);
    const pageText = (document.body?.innerText || '').slice(0, 30000);
    const explicitChallengeCopy = /(?:enter|type|provide|verify with).{0,35}(?:captcha|\botp\b|one.?time password)|(?:captcha|\botp\b).{0,25}(?:code|verification|enter)|aadhaar face|biometric verification|human verification/i.test(pageText);
    const verification = explicitChallengeCopy || fields.some(field => challengePattern.test(labelFor(field)));
    const stage = /review|preview|confirm|summary/i.test(heading) ? 'Review your application' : /document|upload|certificate/i.test(heading) ? 'Add the requested documents' : /login|sign.?in|mobile|otp/i.test(heading) ? 'Sign in to continue' : /register|registration|application|student|personal/i.test(heading) ? 'Complete this application step' : 'Continue through this scheme page';
    const buttons = [...document.querySelectorAll('button,input[type=submit],[role=button],a')].filter(visible).map(textOf).filter(text => /^(next|continue|proceed|save and continue|review|submit|verify)$/i.test(text)).slice(0, 3);
    return { heading: heading.slice(0, 100), fields, required, blank, labels, verification, stage, buttons };
  }
  function element(tag, attrs = {}, content = '') { const node = document.createElement(tag); Object.entries(attrs).forEach(([key, value]) => { if (key === 'className') node.className = value; else if (key === 'text') node.textContent = value; else node.setAttribute(key, value); }); if (content) node.textContent = content; return node; }
  function ensureWidget() {
    if (widget?.isConnected) return widget.shadowRoot;
    widget = document.createElement('div'); widget.id = 'sahayak-scheme-guide';
    const shadow = widget.attachShadow({ mode: 'open' });
    const style = element('style'); style.textContent = css; shadow.append(style);
    const panel = element('section', { className: 'panel', role: 'region', 'aria-label': 'Sahayak scheme page guide' });
    const head = element('header', { className: 'head' });
    head.append(element('div', { className: 'mark', text: 'S' }));
    const brand = element('div', { text: 'Sahayak Guide' }); brand.className = 'brand'; brand.append(element('small', { className: 'sub', text: 'SCHEME PAGE NAVIGATOR' }));
    const pulse = element('span', { className: 'pulse', 'aria-hidden': 'true' });
    const close = element('button', { className: 'close', type: 'button', 'aria-label': 'Stop page guide', text: '×' }); close.addEventListener('click', stop);
    head.append(brand, pulse, close);
    const content = element('div', { className: 'content' }); content.id = 'content';
    const actions = element('div', { className: 'actions' });
    const rescan = element('button', { type: 'button', className: 'primary', text: 'Rescan this step' }); rescan.addEventListener('click', renderScan);
    actions.append(rescan);
    panel.append(head, content, actions, element('div', { className: 'foot', text: 'You enter answers and control every button. Page reading stays in this browser tab.' }));
    shadow.append(panel); document.documentElement.append(widget); return shadow;
  }
  function renderScan() {
    if (!active) return;
    const data = scanPage();
    const shadow = ensureWidget(); const content = shadow.getElementById('content'); content.replaceChildren();
    content.append(element('div', { className: 'eyebrow', text: 'CURRENT STEP' }), element('h2', { className: 'title', text: data.heading }));
    content.append(element('p', { className: 'advice', text: data.verification ? 'A human verification step may be present. Complete OTP, CAPTCHA, or identity checks yourself, then I’ll scan what comes next.' : `${data.stage}. Review the page and enter the requested information yourself. I’ll guide you again after you move to the next step.` }));
    const stats = element('div', { className: 'stats' });
    const done = Math.max(0, data.required.length - data.blank.length);
    [[done, 'required complete'], [data.blank.length, 'required to review']].forEach(([number, caption]) => { const stat = element('div', { className: 'stat' }); stat.append(element('b', { text: String(number) }), document.createTextNode(caption)); stats.append(stat); });
    content.append(stats);
    if (data.verification) content.append(element('div', { className: 'alert', text: 'Human check detected: handle it on the website. Sahayak will not solve or submit it.' }));
    content.append(element('div', { className: 'section', text: 'Required fields to review' }));
    if (data.labels.length) {
      const list = element('ul', { className: 'list' });
      data.labels.forEach((label, index) => { const row = element('li', { className: 'row' }); row.append(element('span', { className: 'badge', text: '!' }), element('span', { text: label })); const focus = element('button', { type: 'button', text: 'Show' }); focus.addEventListener('click', () => { const field = data.blank.find(item => labelFor(item) === label); if (field) { field.scrollIntoView({ behavior: 'smooth', block: 'center' }); field.focus({ preventScroll: true }); } }); row.append(focus); list.append(row); }); content.append(list);
    } else content.append(element('div', { className: 'empty', text: data.required.length ? 'All visible required fields appear complete. Review the entries, then continue when ready.' : 'No visible required fields found. Review the page instructions and continue when ready.' }));
    if (data.buttons.length) content.append(element('div', { className: 'section', text: `Page action available: ${data.buttons.join(' · ')}` }));
  }
  function scheduleScan() { clearTimeout(timer); timer = setTimeout(() => { if (active) renderScan(); }, 500); }
  function start() {
    active = true; renderScan();
    if (!observer) { observer = new MutationObserver(records => { if (records.some(record => { const target = record.target; return !widget || (target !== widget && !widget.contains(target) && !widget.shadowRoot?.contains(target)); })) scheduleScan(); }); observer.observe(document.documentElement, { subtree: true, childList: true, attributes: true, attributeFilter: ['aria-required', 'required', 'disabled', 'hidden', 'class'] }); window.addEventListener('popstate', scheduleScan); window.addEventListener('hashchange', scheduleScan); }
  }
  function stop() { active = false; observer?.disconnect(); observer = null; widget?.remove(); widget = null; chrome.runtime.sendMessage({ type: 'sahayak-stop-tab-guide' }).catch(() => {}); }
  chrome.runtime.onMessage.addListener(message => { if (message?.type === 'sahayak-start-guide') start(); if (message?.type === 'sahayak-stop-guide') { active = false; observer?.disconnect(); observer = null; widget?.remove(); widget = null; } });
  chrome.runtime.sendMessage({ type: 'sahayak-guide-state' }).then(state => { if (state?.active) start(); }).catch(() => {});
})();

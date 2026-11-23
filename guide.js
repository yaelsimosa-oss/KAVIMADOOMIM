(function () {
  const G = window.GUIDE;
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const pad = n => String(n).padStart(2, '0');
  const esc = s => s.replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

  /* ---------- toast ---------- */
  const toastEl = $('#toast'); let toastT;
  function toast(msg) { toastEl.textContent = msg; toastEl.classList.add('show'); clearTimeout(toastT); toastT = setTimeout(() => toastEl.classList.remove('show'), 2200); }

  /* ---------- signs ---------- */
  $('#signsGrid').innerHTML = G.signs.map((s, i) => `
    <article class="sign">
      <div class="sign-top">
        <span class="ico"><svg viewBox="0 0 24 24" role="img" aria-label="איור: ${esc(s.t)}">${s.icon}</svg></span>
        <div><span class="sn">מצב ${i + 1}</span><h3>${esc(s.t)}</h3></div>
      </div>
      <p>${esc(s.d)}</p>
      <div class="tags" aria-label="דוגמאות">${s.tags.map(t => `<span>${esc(t)}</span>`).join('')}</div>
      <details><summary>עוד על המצב</summary><p>${esc(s.more)}</p></details>
    </article>`).join('');

  /* ---------- stepper ---------- */
  const st = $('#stepper');
  st.innerHTML = `
    <div class="step-tabs" role="tablist" aria-label="שלבי התגובה" aria-orientation="vertical">
      ${G.steps.map((s, i) => `<button class="step-tab" role="tab" id="stab${i}" aria-controls="spanel${i}" aria-selected="${i === 0}" tabindex="${i === 0 ? 0 : -1}"><span class="sn">${i + 1}</span><span class="st">${esc(s.t)}</span></button>`).join('')}
    </div>
    <div>
    ${G.steps.map((s, i) => `
      <div class="step-panel" role="tabpanel" id="spanel${i}" aria-labelledby="stab${i}" ${i ? 'hidden' : ''} tabindex="0">
        <span class="pk">שלב ${i + 1} מתוך ${G.steps.length}</span>
        <h3>${esc(s.t)}</h3>
        <div class="step-rows">
          <div class="step-row"><span class="rl do"><b aria-hidden="true">✓</b>מה כדאי לעשות</span><p>${esc(s.do)}</p></div>
          ${s.say.length ? `<div class="step-row"><span class="rl say"><b aria-hidden="true">”</b>${s.sayLabel}</span><ul class="says">${s.say.map(x => `<li>"${esc(x)}"</li>`).join('')}</ul></div>` : ''}
          <div class="step-row"><span class="rl mind"><b aria-hidden="true">!</b>חשוב לזכור</span><p>${esc(s.mind)}${s.link ? `<br><a href="${s.link.href}" style="font-weight:600">${s.link.text}</a>` : ''}</p></div>
        </div>
        <div class="step-nav">
          ${i > 0 ? `<button class="btn" data-go="${i - 1}">→ שלב ${i}</button>` : '<span></span>'}
          ${i < G.steps.length - 1 ? `<button class="btn solid" data-go="${i + 1}">לשלב ${i + 2} ←</button>` : ''}
        </div>
      </div>`).join('')}
    </div>`;
  const tabs = $$('.step-tab', st);
  function goStep(i, focus) {
    tabs.forEach((t, j) => { t.setAttribute('aria-selected', j === i); t.tabIndex = j === i ? 0 : -1; $('#spanel' + j).hidden = j !== i; });
    if (focus) tabs[i].focus();
  }
  tabs.forEach((t, i) => {
    t.addEventListener('click', () => goStep(i));
    t.addEventListener('keydown', e => {
      const k = e.key; let n = null;
      if (k === 'ArrowDown' || k === 'ArrowLeft') n = (i + 1) % tabs.length;
      if (k === 'ArrowUp' || k === 'ArrowRight') n = (i - 1 + tabs.length) % tabs.length;
      if (k === 'Home') n = 0; if (k === 'End') n = tabs.length - 1;
      if (n !== null) { e.preventDefault(); goStep(n, true); }
    });
  });
  st.addEventListener('click', e => { const b = e.target.closest('[data-go]'); if (b) goStep(+b.dataset.go, true); });

  /* ---------- context cards expand all ---------- */
  const exp = $('#expandCtx');
  exp.addEventListener('click', () => {
    const open = exp.getAttribute('aria-pressed') !== 'true';
    $$('.ctx').forEach(d => d.open = open);
    exp.setAttribute('aria-pressed', open);
    exp.textContent = open ? 'סגירת כל השאלות' : 'הצגת כל השאלות';
  });

  /* ---------- copy ---------- */
  $$('[data-copy]').forEach(b => b.addEventListener('click', async () => {
    const txt = $(b.dataset.copy).textContent.trim();
    try { await navigator.clipboard.writeText(txt); toast('המשפט הועתק'); }
    catch { const r = document.createRange(); r.selectNodeContents($(b.dataset.copy)); const s = getSelection(); s.removeAllRanges(); s.addRange(r); toast('המשפט סומן – אפשר להעתיק'); }
  }));

  /* ---------- conversation cards ---------- */
  $('#ccGrid').innerHTML = G.cards.map((c, i) => `
    <button class="cc c${i + 1}" data-card="${i}" aria-haspopup="dialog" aria-label="כרטיסייה ${i + 1}: ${esc(c.t)}. לחצו לתצוגה גדולה">
      <span class="deco" aria-hidden="true"></span>
      <span class="cc-top"><span>כרטיסייה ${i + 1}</span><span class="open" aria-hidden="true">פתיחה ⤢</span></span>
      <h3>${esc(c.t)}</h3>
      <p class="cc-text">${esc(c.x)}</p>
      <span class="cc-q"><b>שאלה לשיחה</b>${esc(c.q)}</span>
    </button>`).join('');

  const modal = $('#cardModal'); let cur = 0, lastFocus = null;
  $('#cmDots').innerHTML = G.cards.map(() => '<i></i>').join('');
  function renderCard(i) {
    cur = (i + G.cards.length) % G.cards.length;
    const c = G.cards[cur];
    $('#cmInner').style.background = c.bg;
    $('#cmN').textContent = `כרטיסייה ${cur + 1} מתוך ${G.cards.length}`;
    $('#cmTitle').textContent = c.t; $('#cmText').textContent = c.x; $('#cmQ').textContent = c.q;
    $$('#cmDots i').forEach((d, j) => d.classList.toggle('on', j === cur));
  }
  function openCard(i) {
    lastFocus = document.activeElement; renderCard(i);
    if (!modal.open) modal.showModal();
    $('#cmClose').focus();
  }
  $('#ccGrid').addEventListener('click', e => { const b = e.target.closest('[data-card]'); if (b) openCard(+b.dataset.card); });
  $('#cmClose').addEventListener('click', () => modal.close());
  $('#cmNext').addEventListener('click', () => renderCard(cur + 1));
  $('#cmPrev').addEventListener('click', () => renderCard(cur - 1));
  modal.addEventListener('click', e => { if (e.target === modal) modal.close(); });
  modal.addEventListener('keydown', e => { if (e.key === 'ArrowLeft') renderCard(cur + 1); if (e.key === 'ArrowRight') renderCard(cur - 1); });
  modal.addEventListener('close', () => lastFocus && lastFocus.focus());
  $('#randomCard').addEventListener('click', () => {
    let n; do { n = Math.floor(Math.random() * G.cards.length); } while (modal.open && n === cur && G.cards.length > 1);
    openCard(n);
  });

  /* ---------- need-now panel ---------- */
  const needBtn = $('#needBtn'), needPanel = $('#needPanel');
  function setNeed(o) { needPanel.classList.toggle('open', o); needBtn.setAttribute('aria-expanded', o); }
  needBtn.addEventListener('click', e => { e.stopPropagation(); setNeed(!needPanel.classList.contains('open')); if (needPanel.classList.contains('open')) $('.need-opt', needPanel).focus(); });
  needPanel.addEventListener('click', e => { if (e.target.closest('a')) setNeed(false); });
  document.addEventListener('click', e => { if (!e.target.closest('.need')) setNeed(false); });
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && needPanel.classList.contains('open')) { setNeed(false); needBtn.focus(); } });

  /* ---------- mobile menu ---------- */
  const menuBtn = $('#menuBtn'), nav = $('#mainNav');
  menuBtn.addEventListener('click', () => { const o = !nav.classList.contains('open'); nav.classList.toggle('open', o); menuBtn.setAttribute('aria-expanded', o); });
  nav.addEventListener('click', e => { if (e.target.closest('a')) { nav.classList.remove('open'); menuBtn.setAttribute('aria-expanded', false); } });

  /* ---------- print guide ---------- */
  $('#printGuide').addEventListener('click', () => {
    const opened = $$('details').filter(d => !d.open); opened.forEach(d => d.open = true);
    window.print();
    setTimeout(() => opened.forEach(d => d.open = false), 500);
  });

  /* ---------- scroll: progress, to-top, active nav ---------- */
  const prog = $('#progress'), toTop = $('#toTop');
  const navLinks = $$('.main-nav a');
  const sections = navLinks.map(a => $(a.getAttribute('href')));
  function onScroll() {
    const h = document.documentElement; const max = h.scrollHeight - h.clientHeight;
    prog.style.width = (max > 0 ? (h.scrollTop / max) * 100 : 0) + '%';
    toTop.classList.toggle('show', h.scrollTop > 700);
    const y = h.scrollTop + 140; let act = -1;
    sections.forEach((s, i) => { if (s && s.offsetTop <= y) act = i; });
    navLinks.forEach((a, i) => a.setAttribute('aria-current', i === act ? 'true' : 'false'));
  }
  addEventListener('scroll', onScroll, { passive: true }); onScroll();
  toTop.addEventListener('click', () => { scrollTo({ top: 0, behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' }); $('#main').focus({ preventScroll: true }); });
  $('#main').tabIndex = -1;
})();

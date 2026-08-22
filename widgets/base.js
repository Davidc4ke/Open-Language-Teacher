/* thin wrapper over the Apps SDK host bridge, so a widget degrades gracefully */
const oa = window.openai || {};
const D = oa.toolOutput || window.__OLT_DEMO || {};
const S = () => oa.widgetState || {};
const setState = s => { try { oa.setWidgetState && oa.setWidgetState(s); } catch (e) {} };
const callTool = (n, a) => { try { return oa.callTool ? oa.callTool(n, a || {}) : Promise.resolve(); } catch (e) { return Promise.resolve(); } };
const followUp = t => { try { oa.sendFollowUpMessage && oa.sendFollowUpMessage({ prompt: t }); } catch (e) {} };
const fullscreen = () => { try { oa.requestDisplayMode && oa.requestDisplayMode({ mode: 'fullscreen' }); } catch (e) {} };
const esc = t => String(t == null ? '' : t).replace(/[&<>"]/g, c => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;' }[c]));
try { if (oa.theme === 'dark' || oa.theme === 'light') document.documentElement.dataset.theme = oa.theme; } catch (e) {}

const SPK = '<svg viewBox="0 0 24 24"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M15.5 8.5a5 5 0 0 1 0 7"/></svg>';
const sayBtn = t => '<button class="say" data-say="' + esc(t) + '" aria-label="Listen">' + SPK + '</button>';
function speak(txt, el) {
  if (!('speechSynthesis' in window)) return;
  speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(txt);
  u.lang = D.lang || 'zh-CN';
  u.rate = 0.85;
  if (el) { el.classList.add('on'); u.onend = u.onerror = () => el.classList.remove('on'); }
  setTimeout(() => { speechSynthesis.resume(); speechSynthesis.speak(u); }, 60);
}
/* word-by-word line with the romanization under each word */
const ruby = (seg, showPy) => '<span class="rline">' + (seg || []).map(g =>
  '<span class="seg' + (g.hit ? ' t' : '') + '" data-say="' + esc(g.t) + '"><span class="zh">' + esc(g.t) + '</span>' +
  (showPy === false ? '' : '<span class="py">' + esc(g.p || '') + '</span>') + '</span>').join('') + '</span>';
const plain = seg => (seg || []).map(g => g.t).join('');

document.addEventListener('click', e => {
  const s = e.target.closest('[data-say]');
  if (s) { speak(s.dataset.say, s); return; }
});

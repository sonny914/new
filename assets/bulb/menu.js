/* Quiet Bands · the persistent Menu. No dependencies, so it works when the 3D entry cannot load.
   The button stays in the header above the overlay and becomes Close. Escape closes; focus moves into the list on open
   and back to the button on close; the page behind is inert while the menu is open. */
const btn = document.querySelector('.menu-btn'), panel = document.getElementById('menu'), main = document.querySelector('main');
if (btn && panel) {
  const html = document.documentElement;
  let hideT = 0;
  const open = () => {
    clearTimeout(hideT);
    panel.hidden = false;
    requestAnimationFrame(() => panel.classList.add('open'));
    btn.setAttribute('aria-expanded', 'true'); btn.textContent = 'Close';
    if (main) main.inert = true; html.classList.add('menu-open');
    const first = panel.querySelector('a'); if (first) first.focus({ preventScroll: true });
  };
  const close = (refocus = true) => {
    panel.classList.remove('open');
    btn.setAttribute('aria-expanded', 'false'); btn.textContent = 'Menu';
    if (main) main.inert = false; html.classList.remove('menu-open');
    hideT = setTimeout(() => { if (!panel.classList.contains('open')) panel.hidden = true; }, 200);
    if (refocus) btn.focus({ preventScroll: true });
  };
  btn.addEventListener('click', () => (btn.getAttribute('aria-expanded') === 'true' ? close() : open()));
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && btn.getAttribute('aria-expanded') === 'true') close(); });
  panel.addEventListener('click', (e) => { if (e.target.closest('a')) close(false); });
}

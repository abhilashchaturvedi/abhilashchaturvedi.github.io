// Project filters (home page).
const chips = document.querySelectorAll('.chip');
chips.forEach((chip) => {
  chip.addEventListener('click', () => {
    const want = chip.dataset.filter;
    chips.forEach((c) => c.setAttribute('aria-pressed', String(c === chip)));
    document.querySelectorAll('.card').forEach((card) => {
      card.hidden = want !== 'all' && card.dataset.track !== want;
    });
  });
});

// Lightbox: click a figure to enlarge; arrows step through the page's figures.
const box = document.getElementById('lightbox');
const zooms = [...document.querySelectorAll('.zoom')];
if (box && zooms.length) {
  const img = box.querySelector('img');
  const cap = box.querySelector('figcaption');
  let index = 0;
  let opener = null;

  const show = (i) => {
    index = (i + zooms.length) % zooms.length;
    const src = zooms[index].querySelector('img');
    img.src = src.src;
    img.alt = src.alt;
    cap.textContent = src.alt;
  };
  const open = (i) => {
    opener = zooms[i];
    show(i);
    box.hidden = false;
    document.body.style.overflow = 'hidden';
    box.querySelector('.lb-close').focus();
  };
  const close = () => {
    box.hidden = true;
    document.body.style.overflow = '';
    opener?.focus();
  };

  const single = zooms.length === 1;
  box.querySelector('.lb-prev').hidden = single;
  box.querySelector('.lb-next').hidden = single;

  zooms.forEach((z, i) => z.addEventListener('click', () => open(i)));
  box.querySelector('.lb-close').addEventListener('click', close);
  box.querySelector('.lb-prev').addEventListener('click', () => show(index - 1));
  box.querySelector('.lb-next').addEventListener('click', () => show(index + 1));
  box.addEventListener('click', (e) => { if (e.target === box) close(); });
  document.addEventListener('keydown', (e) => {
    if (box.hidden) return;
    if (e.key === 'Escape') close();
    else if (e.key === 'ArrowLeft' && !single) show(index - 1);
    else if (e.key === 'ArrowRight' && !single) show(index + 1);
    else if (e.key === 'Tab') {
      // Keep focus inside the dialog.
      const items = [...box.querySelectorAll('button:not([hidden])')];
      const at = items.indexOf(document.activeElement);
      e.preventDefault();
      items[(at + (e.shiftKey ? -1 : 1) + items.length) % items.length].focus();
    }
  });
}

// Click a figure to enlarge it; click or press Escape to close.
const box = document.getElementById('lightbox');
const img = box.querySelector('img');
const cap = box.querySelector('p');
const close = () => { box.hidden = true; };
document.querySelectorAll('.gallery img').forEach((el) => {
  el.addEventListener('click', () => {
    img.src = el.src;
    img.alt = el.alt;
    cap.textContent = el.alt;
    box.hidden = false;
  });
});
box.addEventListener('click', close);
document.addEventListener('keydown', (e) => { if (e.key === 'Escape') close(); });

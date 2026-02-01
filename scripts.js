document.addEventListener('DOMContentLoaded', () => {
  const swipe = document.querySelector('.galeri-swipe');
  
  if (swipe) {
    let isDown = false;
    let startX;
    let scrollLeft;

    swipe.addEventListener('mousedown', (e) => {
      isDown = true;
      swipe.classList.add('dragging');
      startX = e.pageX - swipe.offsetLeft;
      scrollLeft = swipe.scrollLeft;
    });

    swipe.addEventListener('mouseleave', () => {
      isDown = false;
      swipe.classList.remove('dragging');
    });

    swipe.addEventListener('mouseup', () => {
      isDown = false;
      swipe.classList.remove('dragging');
    });

    swipe.addEventListener('mousemove', (e) => {
      if (!isDown) return;
      e.preventDefault();
      const x = e.pageX - swipe.offsetLeft;
      const walk = (x - startX) * 2; // Scroll-speed (makin besar makin cepat)
      swipe.scrollLeft = scrollLeft - walk;
    });
  }
});

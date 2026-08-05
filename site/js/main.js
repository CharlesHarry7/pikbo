/* === Pikbo.ai — Main JavaScript === */

// Scroll-based fade-up animations
const observerOptions = { threshold: 0.1, rootMargin: '0px 0px -50px 0px' };

const fadeObserver = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.classList.add('visible');
    }
  });
}, observerOptions);

document.addEventListener('DOMContentLoaded', () => {
  document.querySelectorAll('.fade-up').forEach(el => fadeObserver.observe(el));
});

// Navbar scroll effect
let lastScroll = 0;
window.addEventListener('scroll', () => {
  const navbar = document.querySelector('.navbar');
  const currentScroll = window.pageYOffset;
  if (currentScroll > 100) {
    navbar.style.background = 'rgba(10,10,15,0.95)';
  } else {
    navbar.style.background = 'rgba(10,10,15,0.85)';
  }
  lastScroll = currentScroll;
});

// Smooth scroll for anchor links
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
  anchor.addEventListener('click', function(e) {
    e.preventDefault();
    const target = document.querySelector(this.getAttribute('href'));
    if (target) {
      target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  });
});

// Keyboard shortcut to close modals
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    document.querySelectorAll('.modal-overlay.active').forEach(m => m.classList.remove('active'));
    // Also close mobile nav on Escape
    const links = document.querySelector('.nav-links');
    const toggle = document.querySelector('.mobile-toggle');
    if (links && links.classList.contains('active')) {
      links.classList.remove('active');
      if (toggle) toggle.classList.remove('active');
    }
  }
});

// Mobile nav toggle
function toggleMobileNav() {
  const links = document.querySelector('.nav-links');
  const toggle = document.querySelector('.mobile-toggle');
  links.classList.toggle('active');
  toggle.classList.toggle('active');
}

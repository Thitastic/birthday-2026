// ============================================================
// Core: dùng chung cho mọi section (hero, story, page3, page4, page5)
// Phải load TRƯỚC các file section vì chúng dùng lại các biến ở đây.
// ============================================================

// ---------- Motion (vanilla) ----------
// Nạp từ CDN trong index.html. Nếu vì lý do gì đó thư viện chưa kịp tải
// (mạng chậm, CDN chặn...) thì mọi chỗ dùng bên dưới đều có fallback về
// Web Animations API thuần, tránh vỡ trải nghiệm.
const {
  animate: motionAnimate,
  spring: motionSpring,
  stagger: motionStagger
} = window.Motion || {};

const prefersReducedMotion = window.matchMedia?.(
  "(prefers-reduced-motion: reduce)"
).matches;

// ---------- DOM dùng chung ----------
const storyBarEl = document.getElementById("storyBar");
const appEl = document.querySelector(".app");

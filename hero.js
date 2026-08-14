// ============================================================
// Section 1: HERO — nền Chromatic Waves + nút bắt đầu
// Dùng: motionAnimate, prefersReducedMotion (định nghĩa ở core.js)
// ============================================================

// ---------- Chromatic Waves background (Canvas 2D) ----------
// Nền sóng màu chuyển động ở trang bìa — phục hồi từ bản gốc.
(() => {
  const canvas = document.getElementById("chromaticWaves");
  if (!canvas) return;

  const ctx = canvas.getContext("2d", { alpha: false });

  let width = 0;
  let height = 0;
  let dpr = 1;
  let points = [];
  let raf = 0;
  let start = performance.now();

  const palette = [
    [255, 74, 195],   // pink
    [153, 75, 255],   // purple
    [65, 183, 255],   // blue
    [217, 255, 74]    // lime
  ];

  function resize() {
    const rect = canvas.getBoundingClientRect();
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    width = Math.max(1, Math.floor(rect.width));
    height = Math.max(1, Math.floor(rect.height));

    canvas.width = Math.floor(width * dpr);
    canvas.height = Math.floor(height * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    const spacing = width < 500 ? 10 : 12;
    points = [];

    for (let y = -spacing; y <= height + spacing; y += spacing) {
      for (let x = -spacing; x <= width + spacing; x += spacing) {
        points.push({
          x,
          y,
          phase: Math.random() * Math.PI * 2,
          size: 1.05 + Math.random() * .7
        });
      }
    }
  }

  function mix(a, b, t) {
    return [
      a[0] + (b[0] - a[0]) * t,
      a[1] + (b[1] - a[1]) * t,
      a[2] + (b[2] - a[2]) * t
    ];
  }

  function colorAt(t) {
    t = ((t % 1) + 1) % 1;
    const scaled = t * (palette.length - 1);
    const i = Math.min(Math.floor(scaled), palette.length - 2);
    return mix(palette[i], palette[i + 1], scaled - i);
  }

  function draw(now) {
    const time = (now - start) * 0.00035;

    ctx.fillStyle = "#07070c";
    ctx.fillRect(0, 0, width, height);

    /*
      Two slow travelling waves distort the dot field.
      The result is a chromatic, liquid-looking background without
      any framework or external library.
    */
    for (const p of points) {
      const nx = p.x / Math.max(width, 1);
      const ny = p.y / Math.max(height, 1);

      const wave1 =
        Math.sin(nx * 9.0 + time * 8.0 + ny * 4.5) * 0.5 +
        Math.sin(ny * 7.0 - time * 5.0) * 0.35;

      const wave2 =
        Math.sin((nx + ny) * 13.0 - time * 6.5 + p.phase) * 0.2;

      const v = (wave1 + wave2 + 1.0) / 2.0;
      const c = colorAt(v + nx * .18 + time * .07);

      const alpha =
        0.10 +
        Math.max(0, Math.sin(v * Math.PI)) * 0.26;

      const driftX = Math.sin(ny * 10 + time * 7) * 8;
      const driftY = Math.cos(nx * 8 - time * 5) * 7;

      ctx.beginPath();
      ctx.arc(p.x + driftX, p.y + driftY, p.size, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(${c[0]|0},${c[1]|0},${c[2]|0},${alpha})`;
      ctx.fill();
    }

    // Soft chromatic blooms layered behind the dots.
    const blooms = [
      [width * .82, height * .25, 180, [255, 45, 190]],
      [width * .12, height * .78, 210, [45, 145, 255]],
      [width * .67, height * .82, 150, [170, 65, 255]]
    ];

    for (const [x, y, r, c] of blooms) {
      const pulse = 1 + Math.sin(time * 10 + x) * .06;
      const g = ctx.createRadialGradient(x, y, 0, x, y, r * pulse);
      g.addColorStop(0, `rgba(${c[0]},${c[1]},${c[2]},.16)`);
      g.addColorStop(.42, `rgba(${c[0]},${c[1]},${c[2]},.055)`);
      g.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = g;
      ctx.fillRect(x - r, y - r, r * 2, r * 2);
    }

    raf = requestAnimationFrame(draw);
  }

  const media = window.matchMedia("(prefers-reduced-motion: reduce)");

  function startAnimation() {
    cancelAnimationFrame(raf);
    start = performance.now();
    if (media.matches) {
      draw(start);
    } else {
      raf = requestAnimationFrame(draw);
    }
  }

  window.addEventListener("resize", resize, { passive: true });
  resize();
  startAnimation();
})();

// ---------- Nút "Vuốt sang trái để tiếp tục" ----------
const startButton = document.getElementById("start");

startButton.addEventListener("click", () => {
  // Navigation is handled only by the global swipe handler in main.js.

  if (motionAnimate && !prefersReducedMotion) {
    // Spring thật (khối lượng/độ cứng/giảm chấn) thay vì cubic-bezier giả lập —
    // cảm giác nảy tự nhiên hơn khi nhấn nút.
    motionAnimate(
      startButton,
      { scale: [1, 0.94, 1] },
      {
        duration: 0.55,
        easing: motionSpring({ stiffness: 420, damping: 16, mass: 0.9 })
      }
    );
  } else {
    startButton.animate(
      [
        { transform: "scale(1)" },
        { transform: "scale(.94)" },
        { transform: "scale(1.02)" },
        { transform: "scale(1)" }
      ],
      {
        duration: 420,
        easing: "cubic-bezier(.2,.8,.2,1)"
      }
    );
  }
});

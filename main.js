// ============================================================
// Main: StoryController + điều hướng vuốt (swipe) + khởi động
// File này ráp 5 section (hero, story, page3, page4, page5) lại thành
// một câu chuyện có thanh tiến trình + vuốt trái/phải để chuyển trang.
// Phải load SAU cùng, sau core.js + hero.js + story.js + page3.js +
// page4.js + page5.js.
// ============================================================

// ---------- StoryController: quản lý thanh tiến trình + timing từng trang ----------
class StoryController {
  constructor(segments, barEl) {
    this.segments = segments;
    this.barEl = barEl;
    this.index = -1;
    this.timer = null;
    this.fills = [];
    this._buildBar();
  }

  _buildBar() {
    if (!this.barEl) return;
    this.barEl.innerHTML = "";
    this.fills = this.segments.map(() => {
      const seg = document.createElement("div");
      seg.className = "story-bar__seg";
      const fill = document.createElement("span");
      fill.className = "story-bar__fill";
      seg.appendChild(fill);
      this.barEl.appendChild(seg);
      return fill;
    });
  }

  _setFill(i, pct, durationMs) {
    const el = this.fills[i];
    if (!el) return;
    el.style.transition = durationMs ? `width ${durationMs}ms linear` : "none";
    // Buộc reflow để transition mới luôn được áp dụng lại từ đầu.
    void el.offsetWidth;
    el.style.width = pct + "%";
  }

  show() {
    this.barEl?.classList.add("is-visible");

    // Mỗi đoạn "nảy" vào lần lượt cách nhau một nhịp nhỏ, thay vì
    // cùng mờ dần vào một lúc như transition CSS mặc định.
    if (motionAnimate && !prefersReducedMotion && this.fills.length) {
      const segments = this.fills
        .map((fill) => fill.closest(".story-bar__seg"))
        .filter(Boolean);

      motionAnimate(
        segments,
        { scaleY: [0, 1], opacity: [0, 1] },
        {
          delay: motionStagger(0.05),
          duration: 0.5,
          easing: motionSpring({ stiffness: 300, damping: 20 })
        }
      );
    }
  }

  start() {
    this.show();
    this.goTo(0);
  }

  goTo(index) {
    // Đã ở trang đầu hoặc đã hết trang → không đi xa hơn được.
    if (index < 0 || index >= this.segments.length) return;

    clearTimeout(this.timer);
    this.timer = null;

    const prevIndex = this.index;
    if (prevIndex >= 0 && prevIndex !== index && this.segments[prevIndex].exit) {
      this.segments[prevIndex].exit();
    }

    // Trang đã đi qua → fill đầy; trang chưa tới → fill rỗng.
    for (let i = 0; i < this.segments.length; i++) {
      if (i < index) this._setFill(i, 100, 0);
      else if (i > index) this._setFill(i, 0, 0);
    }

    this.index = index;
    const seg = this.segments[index];

    this._setFill(index, 0, 0);
    if (seg.duration) {
      requestAnimationFrame(() => this._setFill(index, 100, seg.duration));
    }
    // Nếu duration = 0 (trang chờ thao tác, ví dụ trang bìa), vạch giữ 0%
    // cho tới khi người dùng bấm nút hoặc vuốt sang trang kế tiếp.

    seg.enter?.();

    if (seg.duration && index < this.segments.length - 1) {
      this.timer = setTimeout(() => this.next(), seg.duration);
    }
  }

  next() {
    this.goTo(this.index + 1);
  }

  prev() {
    this.goTo(this.index - 1);
  }
}

// Mỗi phần tử dưới đây ứng với đúng 1 <section> trong HTML: hero, story, page3.
const storySegments = [
  {
    id: "hero",
    duration: 0, // trang bìa: chờ người dùng bấm nút hoặc vuốt, không tự trôi
    enter() {
      document.body.setAttribute("data-view", "hero");
    },
    exit() {}
  },
  {
    id: "story",
    duration: timePhrases.length * 3500,
    enter() {
      document.body.setAttribute("data-view", "story");
      morph?.start();
    },
    exit() {
      morph?.stop();
    }
  },
  {
    id: "page3",
    duration: 17000, // tổng thời gian: quả cầu zoom-in → 2 dòng chữ → ẩn chữ → gallery (gallery hiện thêm ~5s so với trước)
    _timers: [],
    enter() {
      document.body.setAttribute("data-view", "page3");
      page3El?.setAttribute("data-bg", "orb");
      // Quả cầu zoom-in + fade-in trước; 2 dòng chữ đều ẩn cho tới khi
      // quả cầu đã ổn định ở vị trí hiện tại.
      hideLine(line1El);
      hideLine(line2El);
      ensureOrb()?.play();

      const orbIntro = 1400;                   // thời gian quả cầu zoom-in + fade-in
      const line1Delay = orbIntro + 300;        // dòng 1 xuất hiện sau khi quả cầu ổn định
      const line2Delay = line1Delay + 2000;     // dòng 2 xuất hiện chậm hơn, sau dòng 1
      const holdBoth = 4200;                    // giữ cả 2 dòng hiển thị
      const fadeOutBeforeGallery = 700;         // 2 dòng mờ dần trước khi chuyển gallery
      const hideLinesAt = line2Delay + holdBoth;
      const galleryAt = hideLinesAt + fadeOutBeforeGallery;

      const t1 = setTimeout(() => {
        showLine(line1El);
      }, line1Delay);

      const t2 = setTimeout(() => {
        showLine(line2El);
      }, line2Delay);

      const t3 = setTimeout(() => {
        hideLine(line1El);
        hideLine(line2El);
      }, hideLinesAt);

      const t4 = setTimeout(() => {
        page3El?.setAttribute("data-bg", "gallery");
        ensureGallery()?.play();
        orbInstance?.pause();
      }, galleryAt);

      this._timers = [t1, t2, t3, t4];
    },
    exit() {
      this._timers.forEach(clearTimeout);
      this._timers = [];
      hideLine(line1El);
      hideLine(line2El);
      orbInstance?.pause();
      galleryInstance?.pause();
      // Không reset data-bg về "orb" ở đây nữa — làm vậy giữa lúc trang 3
      // đang mờ dần đi sẽ khiến quả cầu bất ngờ hiện lại / gallery biến mất
      // đột ngột, phá vỡ cảm giác fade-out mượt. Việc reset đã có sẵn ở
      // đầu enter() cho lần vào trang 3 kế tiếp.
    }
  },
  {
    id: "page4",
    duration: 16000, // chạy animation zoom + kéo chữ/ảnh rồi epilogue một lần, không tự chuyển tiếp
    enter() {
      document.body.setAttribute("data-view", "page4");
      requestAnimationFrame(playPage4);
    },
    exit() {
      resetPage4();
    }
  },
  {
    id: "page5",
    duration: 0, // trang cuối: "1 2 3..." rồi tự chạy cảnh thổi nến, không tự chuyển tiếp
    enter() {
      document.body.setAttribute("data-view", "page5");
      requestAnimationFrame(playPage5);
    },
    exit() {
      resetPage5();
    }
  }
];

const storyController = new StoryController(storySegments, storyBarEl);

// Nút "Mở câu chuyện" ở trang bìa = đi tới trang kế tiếp (story).
document.body.addEventListener("birthday:start", () => {
  storyController.next();
});

// ---------- Vuốt phải = tiếp, vuốt trái = trở về ----------
// Dùng Pointer Events + setPointerCapture để việc vuốt luôn được chính
// target này theo dõi từ đầu đến cuối, không bị trình duyệt "cướp" thành
// cử chỉ cuộn/pan (đặc biệt hay gặp trên Safari iOS) trước khi pointerup
// kịp bắn ra.
function attachSwipeNavigation(target, { onSwipeRight, onSwipeLeft, threshold = 48 } = {}) {
  if (!target) return;

  let tracking = false;
  let startX = 0;
  let startY = 0;
  let pointerId = null;

  target.addEventListener("pointerdown", (e) => {
    if (e.pointerType === "mouse" && e.button !== 0) return;
    tracking = true;
    pointerId = e.pointerId;
    startX = e.clientX;
    startY = e.clientY;
    target.setPointerCapture?.(e.pointerId);
  });

  target.addEventListener("pointermove", (e) => {
    if (!tracking || e.pointerId !== pointerId) return;
    // Chặn cử chỉ cuộn/pan mặc định của trình duyệt trong lúc đang vuốt
    // để pointerup luôn nhận được toạ độ chính xác.
    e.preventDefault();
  }, { passive: false });

  const finish = (e) => {
    if (!tracking || e.pointerId !== pointerId) return;
    tracking = false;
    target.releasePointerCapture?.(e.pointerId);

    const dx = e.clientX - startX;
    const dy = e.clientY - startY;

    if (Math.abs(dx) >= threshold && Math.abs(dx) > Math.abs(dy) * 1.15) {
      if (dx > 0) onSwipeRight?.();
      else onSwipeLeft?.();
    }
  };

  target.addEventListener("pointerup", finish);
  target.addEventListener("pointercancel", () => {
    tracking = false;
  });
}

attachSwipeNavigation(appEl, {
  onSwipeRight: () => storyController.prev(),
  onSwipeLeft: () => storyController.next()
});

// Khởi động: hiện thanh story ngay từ trang bìa (trang 1 / 3).
storyController.start();
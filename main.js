// ============================================================
// Main: StoryController + điều hướng vuốt (swipe) + khởi động
// File này ráp các section (hero, story, page3, page4, page5, page6) lại
// thành một câu chuyện có thanh tiến trình + vuốt trái/phải để chuyển trang.
// Phải load SAU cùng, sau core.js + audio.js + hero.js + page1.js +
// story.js + page3.js + page4.js + page5.js + page6.js.
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
    // Bọc try/catch: đây CHỈ LÀ hiệu ứng trang trí cho thanh tiến trình,
    // tuyệt đối không được phép làm gãy phần còn lại của start()/goTo()
    // (tức là animation hero) nếu thư viện Motion tải lỗi/thiếu hàm/API
    // không khớp phiên bản CDN "latest".
    try {
      if (
        motionAnimate &&
        motionStagger &&
        motionSpring &&
        !prefersReducedMotion &&
        this.fills.length
      ) {
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
    } catch (err) {
      console.error("StoryController.show(): lỗi khi chạy hiệu ứng Motion cho thanh tiến trình (bỏ qua, không chặn animation hero):", err);
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
      audioManager.play("hero");
      requestAnimationFrame(playPage1);
    },
    exit() {
      resetPage1();
    }
  },
  {
    id: "story",
    duration: timePhrases.length * 3500,
    enter() {
      document.body.setAttribute("data-view", "story");
      audioManager.play("story");
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
      audioManager.play("page3");
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
      audioManager.play("page4"); // cùng track với page3 → không tua lại
      requestAnimationFrame(playPage4);
    },
    exit() {
      resetPage4();
    }
  },
  {
    id: "page5",
    duration: 0, // "1 2 3..." rồi tự chạy cảnh thổi nến; tắt nến xong page5.js
                 // tự gọi storyController.next() để sang trang 6, không cần
                 // duration ở đây.
    enter() {
      document.body.setAttribute("data-view", "page5");
      audioManager.stop(); // đang dùng micro để thổi nến → tắt nhạc nền
      requestAnimationFrame(playPage5);
    },
    exit() {
      resetPage5();
    }
  },
  {
    id: "page6",
    duration: 0, // trang cuối: hiệu ứng chữ lặp vô hạn, không tự chuyển tiếp
    enter() {
      document.body.setAttribute("data-view", "page6");
      audioManager.play("page6");
      requestAnimationFrame(playPage6);
    },
    exit() {
      resetPage6();
    }
  }
];

const storyController = new StoryController(storySegments, storyBarEl);

// Section navigation is handled ONLY by the global swipe handler below.
    // Do not listen for "birthday:start" here: the Hero button can receive a
    // synthetic click after a swipe, which would otherwise navigate twice.

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
  let gestureHandled = false;
  let lockedUntil = 0;

  const stop = () => {
    tracking = false;
    pointerId = null;
  };

  target.addEventListener("pointerdown", (e) => {
    if (Date.now() < lockedUntil) return;
    if (e.pointerType === "mouse" && e.button !== 0) return;

    tracking = true;
    gestureHandled = false;
    pointerId = e.pointerId;
    startX = e.clientX;
    startY = e.clientY;

    target.setPointerCapture?.(e.pointerId);
  });

  target.addEventListener("pointermove", (e) => {
    if (!tracking || e.pointerId !== pointerId) return;

    const dx = e.clientX - startX;
    const dy = e.clientY - startY;

    if (Math.abs(dx) > Math.abs(dy)) e.preventDefault();
  }, { passive: false });

  target.addEventListener("pointerup", (e) => {
    if (!tracking || e.pointerId !== pointerId) return;

    const dx = e.clientX - startX;
    const dy = e.clientY - startY;

    stop();
    target.releasePointerCapture?.(e.pointerId);

    const horizontal =
      Math.abs(dx) >= threshold &&
      Math.abs(dx) > Math.abs(dy) * 1.15;

    if (!horizontal || gestureHandled || Date.now() < lockedUntil) return;

    gestureHandled = true;
    lockedUntil = Date.now() + 1000;

    if (dx < 0) onSwipeLeft?.();
    else onSwipeRight?.();
  });

  target.addEventListener("pointercancel", stop);

  // A horizontal swipe can generate a synthetic click on the element
  // where the gesture started. Never let that click navigate the story.
  target.addEventListener("click", (e) => {
    if (Date.now() < lockedUntil) {
      e.preventDefault();
      e.stopPropagation();
    }
  }, true);
}

attachSwipeNavigation(appEl, {
  onSwipeRight: () => storyController.prev(),
  onSwipeLeft: () => storyController.next()
});

// ============================================================
// Section 0: PRELOAD — tải trước ảnh + nhạc trước khi cho vào trang bìa.
// Lý do:
//  1) Nếu người dùng lướt nhanh, ảnh/nhạc ở page3-page6 có thể chưa kịp tải.
//  2) Trình duyệt chỉ cho audio.play() tự phát nếu nằm trong cùng call stack
//     với một cử chỉ người dùng (click/tap). Bằng cách chờ người dùng bấm
//     nút "Bắt đầu" rồi MỚI gọi storyController.start() (→ hero.enter() →
//     audioManager.play("hero")) ngay trong handler click đó, nhạc trang
//     bìa được phép tự phát thay vì bị chặn bởi autoplay policy.
// ============================================================

const preloadScreenEl = document.getElementById("preloadScreen");
const preloadFillEl = document.getElementById("preloadFill");
const preloadBarEl = document.getElementById("preloadBar");
const preloadPercentEl = document.getElementById("preloadPercent");
const preloadStatusTextEl = document.getElementById("preloadStatusText");
const preloadStartBtn = document.getElementById("preloadStart");

// Gallery dùng images/1.jpg…17.jpg (xem page3.js), page4 dùng thêm 15/18/19,
// page6 dùng 20 — nên tải trước cả dải 1–20 cho chắc.
const PRELOAD_IMAGES = Array.from({ length: 20 }, (_, i) => `images/${i + 1}.jpg`);
// Danh sách audio thật sự khác nhau (page3/page4 dùng chung 1 file → khử trùng).
const PRELOAD_AUDIO = [...new Set(Object.values(AUDIO_TRACKS))];

function preloadImage(src) {
  return new Promise((resolve) => {
    const img = new Image();
    // Ảnh lỗi/thiếu không được chặn cả màn preload — vẫn resolve bình thường.
    img.onload = resolve;
    img.onerror = resolve;
    img.src = src;
  });
}

function runPreload() {
  const total = PRELOAD_IMAGES.length + PRELOAD_AUDIO.length;
  let loaded = 0;

  const bump = () => {
    loaded += 1;
    const pct = total ? Math.round((loaded / total) * 100) : 100;
    if (preloadFillEl) preloadFillEl.style.width = pct + "%";
    if (preloadPercentEl) preloadPercentEl.textContent = pct + "%";
    preloadBarEl?.setAttribute("aria-valuenow", String(pct));
  };

  const imageJobs = PRELOAD_IMAGES.map((src) => preloadImage(src).then(bump));
  const audioJob = audioManager.preload(PRELOAD_AUDIO, bump);

  return Promise.all([...imageJobs, audioJob]);
}

function dismissPreloadScreen() {
  // Bỏ focus khỏi nút trước — nếu không, Chrome sẽ CHẶN việc set
  // aria-hidden vì phần tử đang giữ focus vẫn nằm bên trong (cảnh báo
  // "Blocked aria-hidden on an element because its descendant retained
  // focus"), khiến preloadScreenEl không thực sự được gỡ khỏi cây
  // accessibility đúng cách.
  preloadStartBtn?.blur();

  preloadScreenEl?.classList.add("is-hidden");
  preloadScreenEl?.setAttribute("aria-hidden", "true");
  // inert chặn luôn cả việc focus/tương tác vào phần tử đã ẩn (mạnh hơn
  // aria-hidden, được hỗ trợ tốt trên trình duyệt hiện đại).
  preloadScreenEl?.setAttribute("inert", "");
  // Dọn hẳn khỏi DOM sau khi fade-out xong (khớp với transition .6s ở CSS).
  setTimeout(() => preloadScreenEl?.remove(), 650);
}

preloadStartBtn?.addEventListener("click", () => {
  if (preloadStartBtn.hasAttribute("disabled")) return;

  dismissPreloadScreen();

  // Mỗi bước rủi ro (audio, thư viện Motion bên trong storyController)
  // được bọc try/catch RIÊNG — để nếu một bước nào đó throw lỗi (audio
  // bị chặn, Motion CDN lỗi/thiếu hàm...), các bước còn lại — quan trọng
  // nhất là playPage1() ở cuối — vẫn LUÔN được chạy, không bị cắt ngang
  // giữa chừng như trước (đó là lý do gốc khiến phải vuốt mới thấy
  // animation: một lỗi phía trên đã chặn code chạy tới đây).

  try {
    // 🔊 PHÁT 01.mp3 NGAY KHI BẤM "BẮT ĐẦU"
    audioManager.play("hero");
    // Mồi các track còn lại để chuyển trang tự động không bị chặn
    audioManager.primeAllExcept("hero");
  } catch (err) {
    console.error("Lỗi khi phát/mồi audio (bỏ qua, không chặn animation):", err);
  }

  try {
    storyController.start();
  } catch (err) {
    console.error("Lỗi khi chạy storyController.start() (bỏ qua, không chặn animation hero):", err);
    // storyController.start() lỗi giữa chừng vẫn có thể đã set data-view
    // rồi mới throw — set lại đây cho chắc để hero chắc chắn đang hiển thị.
    document.body.setAttribute("data-view", "hero");
  }

  // Gọi animation chữ hero NGAY tại đây, trong cùng cú click — không chờ
  // requestAnimationFrame bên trong hero.enter() nữa (thứ tự đó không
  // đáng tin cậy được, và giờ được bọc try/catch ở trên nên luôn chạy
  // tới được dòng này).
  try {
    playPage1();
  } catch (err) {
    console.error("Lỗi khi chạy playPage1():", err);
  }
});

runPreload().finally(() => {
  if (preloadStatusTextEl) preloadStatusTextEl.textContent = "Đã sẵn sàng.";
  preloadStartBtn?.removeAttribute("disabled");
});
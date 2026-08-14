// ============================================================
// Section 6: PAGE6 — "CHÚC MỪNG SINH NHẬT" với hiệu ứng lưới chữ
// (Vanilla JS + Web Animations API, chuyển thể từ component
// KineticTextGrid — Originkit, nguyên bản dùng React + Framer Motion.)
// ============================================================

const page6Grid = document.getElementById("page6Grid");
const page6RingEl = document.getElementById("page6Ring");

// Đếm số lần vào trang 6 — dùng để huỷ callback "chạy xong" từ lượt trước
// nếu người dùng rời trang 6 trước khi animation lưới chữ kịp hoàn tất.
let page6RunId = 0;

// ---------- Cấu hình (tương ứng props của component gốc) ----------
const PAGE6_TEXT = "CHÚC MỪNG SINH NHẬT";
const PAGE6_ROW_COUNT = 5;
const PAGE6_REPEAT_COUNT = 3; // gốc là 5, giảm còn 3 vì câu tiếng Việt dài hơn "APPEAR TEXT"
const PAGE6_EXPAND_SEC = 1;
const PAGE6_HOLD_SEC = 1.4;
const PAGE6_HORIZONTAL_SHIFT_PX = 70;
const PAGE6_ZOOM_SCALE = 1.12;
const PAGE6_EASE = "ease-in-out";

// Độ lệch của hàng lúc nghỉ, tính theo tỉ lệ so với biên độ trôi tối đa.
// > 0 để các hàng luôn lệch nhau, không bao giờ thẳng hàng tuyệt đối.
const PAGE6_HOME_FACTOR = 0.4;

let page6Built = false;
let page6Animations = [];
let page6RowEls = [];
let page6CenterRowIndex = 0;
let page6CenterWordIndex = 0;


// ============================================================
// TÍNH TIMELINE (giây) — giữ nguyên logic từ component gốc
// ============================================================

function page6ComputeTimeline() {
  const motionSec = Math.max(0.1, PAGE6_EXPAND_SEC);
  const holdSec = Math.max(0, PAGE6_HOLD_SEC);

  const tIn = motionSec; // phóng to + dàn ra hết (tất cả đều thấy)
  const tWipe = tIn + motionSec; // đã quét hết, còn lại 1 chữ giữa, scale 1
  const tWord = tWipe + holdSec; // hết thời gian giữ chữ giữa
  const tReset = tWord + 0.4; // các hàng khác về vị trí nghỉ (ẩn)
  const tReveal = tReset + motionSec * 0.7;
  const total = tReveal + Math.max(0.2, holdSec * 0.4);

  return { tIn, tWipe, tWord, tReset, tReveal, total };
}


// ============================================================
// DỰNG DOM (chỉ 1 lần)
// ============================================================

function page6BuildGrid() {
  if (page6Built || !page6Grid) return;
  page6Built = true;

  const safeRowCount =
    PAGE6_ROW_COUNT % 2 === 0 ? PAGE6_ROW_COUNT + 1 : PAGE6_ROW_COUNT;
  const safeRepeatCount =
    PAGE6_REPEAT_COUNT % 2 === 0 ? PAGE6_REPEAT_COUNT + 1 : PAGE6_REPEAT_COUNT;

  page6CenterRowIndex = Math.floor(safeRowCount / 2);
  page6CenterWordIndex = Math.floor(safeRepeatCount / 2);

  const frag = document.createDocumentFragment();

  for (let rowIndex = 0; rowIndex < safeRowCount; rowIndex++) {
    const rowEl = document.createElement("div");
    rowEl.className = "page6-row";

    const isCenterRow = rowIndex === page6CenterRowIndex;

    for (let wordIndex = 0; wordIndex < safeRepeatCount; wordIndex++) {
      const isCenterWord = isCenterRow && wordIndex === page6CenterWordIndex;

      const wordEl = document.createElement("span");
      wordEl.textContent = PAGE6_TEXT;
      wordEl.className = isCenterWord
        ? "page6-word page6-word--center"
        : "page6-word";

      rowEl.appendChild(wordEl);
    }

    page6RowEls.push(rowEl);
    frag.appendChild(rowEl);
  }

  page6Grid.appendChild(frag);
}


// ============================================================
// DỌN ANIMATION CŨ
// ============================================================

function page6CancelAnimations() {
  page6Animations.forEach((anim) => anim.cancel());
  page6Animations = [];
}


// ============================================================
// CHẠY HIỆU ỨNG
// ============================================================

function page6PlayAnimations(runId) {
  if (!page6Grid) return;

  const { tIn, tWipe, tWord, tReset, tReveal, total } =
    page6ComputeTimeline();

  const totalMs = total * 1000;
  const n = (t) => Math.min(1, Math.max(0, t / total));

  const baseOptions = {
    duration: totalMs,
    easing: PAGE6_EASE,
    iterations: 1,
    fill: "forwards"
  };

  // ---- Toàn bộ lưới: phóng to trong lúc dàn ra, thu về scale 1 lúc quét ----
  page6Animations.push(
    page6Grid.animate(
      [
        { transform: "scale(1)", offset: 0 },
        { transform: `scale(${PAGE6_ZOOM_SCALE})`, offset: n(tIn) },
        { transform: "scale(1)", offset: n(tWipe) },
        { transform: "scale(1)", offset: 1 }
      ],
      baseOptions
    )
  );

  const safeRepeatCount = page6RowEls[0]?.children.length ?? 1;
  const denom = Math.max(1, safeRepeatCount - 1);

  page6RowEls.forEach((rowEl, rowIndex) => {
    const isCenterRow = rowIndex === page6CenterRowIndex;
    const distanceFromCenterY = rowIndex - page6CenterRowIndex;
    const direction = rowIndex % 2 === 0 ? 1 : -1;

    const speedMultiplier =
      0.7 + (Math.abs(distanceFromCenterY) % 3) * 0.45;
    const driftFull =
      direction * PAGE6_HORIZONTAL_SHIFT_PX * speedMultiplier;
    const driftHome = driftFull * PAGE6_HOME_FACTOR;

    const wipeLTR = rowIndex % 2 === 0;
    const hiddenClip = wipeLTR
      ? "inset(0% 0% 0% 100%)"
      : "inset(0% 100% 0% 0%)";
    const visibleClip = "inset(0% 0% 0% 0%)";

    // ---- Hàng: về nhà → dàn ra → (giữa: về tim / khác: giữ) → về nhà ----
    let rowKeyframes;

    if (isCenterRow) {
      rowKeyframes = [
        { transform: `translateX(${driftHome}px)`, offset: 0 },
        { transform: `translateX(${driftFull}px)`, offset: n(tIn) },
        { transform: "translateX(0px)", offset: n(tWipe) },
        { transform: "translateX(0px)", offset: n(tReset) },
        { transform: `translateX(${driftHome}px)`, offset: n(tReveal) },
        { transform: `translateX(${driftHome}px)`, offset: 1 }
      ];
    } else {
      rowKeyframes = [
        { transform: `translateX(${driftHome}px)`, offset: 0 },
        { transform: `translateX(${driftFull}px)`, offset: n(tIn) },
        { transform: `translateX(${driftFull}px)`, offset: n(tWord) },
        { transform: `translateX(${driftHome}px)`, offset: n(tReset) },
        { transform: `translateX(${driftHome}px)`, offset: 1 }
      ];
    }

    page6Animations.push(rowEl.animate(rowKeyframes, baseOptions));

    // ---- Từng chữ trong hàng: quét ẩn/hiện, trừ chữ giữa của hàng giữa ----
    Array.from(rowEl.children).forEach((wordEl, wordIndex) => {
      const isCenterWord = isCenterRow && wordIndex === page6CenterWordIndex;
      if (isCenterWord) return; // chữ sống sót — không animate, luôn hiện

      const sweepT = wipeLTR
        ? wordIndex / denom
        : (safeRepeatCount - 1 - wordIndex) / denom;

      const wipeWindow = tWipe - tIn;
      const perWipe = wipeWindow * 0.5;
      const wStartOut = tIn + sweepT * (wipeWindow - perWipe);
      const wEndOut = wStartOut + perWipe;

      const revealWindow = tReveal - tReset;
      const perReveal = revealWindow * 0.5;
      const wStartIn = tReset + sweepT * (revealWindow - perReveal);
      const wEndIn = wStartIn + perReveal;

      page6Animations.push(
        wordEl.animate(
          [
            { clipPath: visibleClip, offset: 0 },
            { clipPath: visibleClip, offset: n(wStartOut) },
            { clipPath: hiddenClip, offset: n(wEndOut) },
            { clipPath: hiddenClip, offset: n(wStartIn) },
            { clipPath: visibleClip, offset: n(wEndIn) },
            { clipPath: visibleClip, offset: 1 }
          ],
          baseOptions
        )
      );
    });
  });

  // Chờ toàn bộ animation (lưới + từng hàng + từng chữ) chạy xong đúng 1 lượt
  // rồi mới ẩn lưới chữ đi và hiện vòng chữ xoay quanh ảnh. Dùng .catch để
  // animation bị .cancel() (khi rời trang 6 giữa chừng) không văng lỗi console.
  Promise.all(page6Animations.map((anim) => anim.finished.catch(() => null))).then(
    () => {
      // runId đổi nghĩa là người dùng đã rời/khởi động lại trang 6 — bỏ qua.
      if (runId === page6RunId) page6ShowRing();
    }
  );
}


// ============================================================
// VÒNG CHỮ XOAY QUANH ẢNH + CHỮ CHẠY MARQUEE 2 CHIỀU TRÊN/DƯỚI
// — hiện ra sau khi lưới chữ chạy xong
// ============================================================

function page6ShowRing() {
  page6Grid?.classList.add("is-hidden");
  page6RingEl?.classList.add("is-visible");
  page6RingEl?.removeAttribute("aria-hidden");
}

function page6HideRing() {
  page6RingEl?.classList.remove("is-visible");
  page6RingEl?.setAttribute("aria-hidden", "true");
}


// ============================================================
// VÀO / RỜI TRANG 6
// ============================================================

function playPage6() {
  page6RunId += 1;
  const runId = page6RunId;

  page6BuildGrid();
  page6CancelAnimations();
  page6HideRing();
  page6Grid?.classList.remove("is-hidden");

  if (prefersReducedMotion) {
    // Không animate — chỉ hiện sẵn chữ giữa, ẩn phần còn lại, rồi sau một
    // nhịp ngắn chuyển thẳng sang vòng chữ xoay quanh ảnh + chữ chạy marquee.
    page6RowEls.forEach((rowEl, rowIndex) => {
      Array.from(rowEl.children).forEach((wordEl, wordIndex) => {
        const isCenterWord =
          rowIndex === page6CenterRowIndex &&
          wordIndex === page6CenterWordIndex;
        wordEl.style.opacity = isCenterWord ? "1" : "0";
      });
    });
    setTimeout(() => {
      if (runId === page6RunId) page6ShowRing();
    }, 900);
    return;
  }

  page6PlayAnimations(runId);
}

function resetPage6() {
  page6RunId += 1; // vô hiệu hoá callback "chạy xong" của lượt trước
  page6CancelAnimations();
  page6HideRing();
  page6Grid?.classList.remove("is-hidden");
}

// ============================================================
// Section 4: PAGE4 — hàng chữ/ảnh ngang, camera zoom + pan
// ============================================================

// ---------- DOM riêng của page4 ----------
const page4Track = document.getElementById("page4Track");

// ---------- DOM riêng của phần "epilogue" (sau khi track chạy xong) ----------
const page4Viewport = page4Track?.parentElement || null;
const page4Epilogue = document.getElementById("page4Epilogue");
const page4EpiTyped1 = document.getElementById("page4EpiTyped1");
const page4EpiCursor1 = document.getElementById("page4EpiCursor1");
const page4EpiMedia = document.getElementById("page4EpiMedia");
const page4EpiLine2 = document.getElementById("page4EpiLine2");

const PAGE4_EPILOGUE_TEXT_1 = "Nhưng bạn vẫn không ngừng cố gắng";

// Theo dõi mọi timeout/animation của epilogue để resetPage4() có thể huỷ
// sạch khi người dùng rời trang giữa chừng rồi quay lại.
let page4EpiTimeouts = [];
let page4EpiAnimations = [];

function page4EpiSchedule(fn, delayMs) {
  const id = setTimeout(fn, delayMs);
  page4EpiTimeouts.push(id);
  return id;
}

function page4EpiTrackAnimation(anim) {
  if (anim) page4EpiAnimations.push(anim);
  return anim;
}

// ============================================================
// Trang 4: "Có ngày rực rỡ, có ngày suy tư"
// Chữ + ảnh xếp trên một hàng ngang; lúc vào trang, "camera" zoom sát vào
// chữ đầu tiên rồi từ từ kéo ra + chạy dọc theo hàng để lần lượt lộ ra
// chữ và ảnh tiếp theo — dựng lại tinh thần "text chạy theo path" của
// mwg_effect104, chỉ thay path cong bằng transform (scale + translateX)
// cho khớp với cách trang này tự phát theo từng nhịp thời gian.
// ============================================================

function playPage4() {
  const track = page4Track;
  const viewport = track?.parentElement;
  if (!track || !viewport) return;

  track.getAnimations?.().forEach((a) => a.cancel());
  track.style.transform = "translateX(0px) scale(1)";
  // Buộc reflow để đo lại kích thước thật trước khi tính toán quãng chạy.
  void track.offsetWidth;

  const vw = viewport.clientWidth;
  const trackWidth = track.scrollWidth;
  const firstSeg = track.querySelector(".page4-seg");
  // Điểm neo: MÉP TRÁI của chữ đầu tiên (không phải điểm giữa) — để camera
  // vào đúng đầu chữ thay vì crop vào giữa từ như trước.
  const firstStart = firstSeg ? firstSeg.offsetLeft : 0;

  // Điểm bắt đầu: zoom sát, canh đầu chữ đầu tiên cách mép trái khung nhìn
  // một khoảng đệm nhỏ (thay vì canh giữa khung nhìn).
  const zoomScale = vw < 480 ? 2.15 : 2.6;
  const edgeInset = Math.max(20, vw * 0.07);
  const startX = edgeInset - firstStart * zoomScale;

  // Điểm kết: kéo về scale 1, chạy hết hàng để lộ trọn chữ + ảnh cuối.
  const endX = Math.min(0, vw - trackWidth - 48);

  // Scale dùng khi dừng lại ở mỗi ảnh — đủ gần để ảnh nổi bật, vẫn đủ xa để
  // thấy chữ/ảnh xung quanh (không zoom sát bằng lúc vào chữ đầu tiên).
  const mediaScale = 1 + (zoomScale - 1) * 0.32;

  // Với mỗi ảnh trong hàng: canh tâm ảnh vào giữa khung nhìn ở mediaScale,
  // nhưng không lùi quá điểm kết thúc (để không lộ khoảng trống bên phải).
  // Lưu ý: điểm chặn phải tính LẠI ở đúng scale của ảnh (mediaScale), không
  // được dùng thẳng endX (vốn tính ở scale 1) — nếu không, với ảnh nằm gần
  // cuối hàng, "translateX ở scale 1" sẽ chặn camera dừng lại sớm hơn nhiều
  // so với vị trí ảnh thật (từng khiến camera bị kẹt giữa chừng ở đoạn chữ
  // ngay trước ảnh cuối, ví dụ dừng ở chữ "suy" trong "có ngày suy tư").
  const mediaEls = Array.from(track.querySelectorAll(".page4-media"));
  const mediaStops = mediaEls.map((el) => {
    const center = el.offsetLeft + el.offsetWidth / 2;
    const x = vw / 2 - center * mediaScale;
    const limitAtMediaScale = Math.min(0, vw - trackWidth * mediaScale - 48);
    return Math.max(x, limitAtMediaScale);
  });

  // ---- Dựng timeline theo thời gian tuyệt đối (giây) rồi quy đổi ra offset 0–1 ----
  const zoomInSeconds = 0.8;  // zoom(1) → zoom(zoomScale), khớp thời lượng crossfade CSS .page3/.page4
  const settleSeconds = 0.35; // giữ nhịp ngắn ngay sau khi zoom vào chữ đầu tiên
  const panSeconds = 1.3;     // thời gian "camera" pan từ điểm này sang điểm kế tiếp
  const holdSeconds = 2;      // dừng lại 2s ở mỗi ảnh

  let t = 0;
  const stops = [];
  const kinds = []; // "in" = nhịp vào đầu, "pan" = đang di chuyển, "hold" = đứng yên
  stops.push([t, `translateX(0px) scale(1)`]);

  t += zoomInSeconds;
  stops.push([t, `translateX(${startX}px) scale(${zoomScale})`]);
  kinds.push("in");

  t += settleSeconds;
  stops.push([t, `translateX(${startX}px) scale(${zoomScale})`]);
  kinds.push("hold");

  mediaStops.forEach((x) => {
    t += panSeconds;
    stops.push([t, `translateX(${x}px) scale(${mediaScale})`]);
    kinds.push("pan");

    t += holdSeconds;
    stops.push([t, `translateX(${x}px) scale(${mediaScale})`]); // giữ nguyên 2s tại ảnh
    kinds.push("hold");
  });

  t += panSeconds;
  stops.push([t, `translateX(${endX}px) scale(1)`]);
  kinds.push("pan");

  const totalDuration = t;
  const frames = stops.map(([, transform]) => transform);
  const times = stops.map(([time]) => time / totalDuration);
  // Easing riêng cho từng loại đoạn: "pan" dùng ease-in-out đều đặn để camera
  // lướt liên tục qua đoạn chữ ở giữa (ví dụ "có ngày suy tư") thay vì bị
  // "khựng" lại do easeOut dốc (chậm dần rất mạnh ở cuối đoạn, đúng lúc chữ
  // đang hiện ra) như trước; "hold"/"in" không di chuyển hoặc đã có ease riêng.
  const easing = kinds.map((kind) => {
    if (kind === "in") return "cubic-bezier(.22,.9,.32,1)";
    if (kind === "pan") return "cubic-bezier(.45,0,.2,1)";
    return "linear"; // hold: transform không đổi nên easing không ảnh hưởng
  });

  // Huỷ mọi phần "epilogue" còn dang dở từ lượt phát trước, rồi chờ track
  // chạy xong hẳn mới bắt đầu đoạn "Nhưng bạn vẫn không ngừng cố gắng".
  resetPage4Epilogue();

  let trackAnimation;
  if (motionAnimate && !prefersReducedMotion) {
    trackAnimation = motionAnimate(
      track,
      { transform: frames },
      { duration: totalDuration, times, easing }
    );
  } else {
    trackAnimation = track.animate(
      frames.map((transform, i) => ({
        transform,
        offset: times[i],
        // Keyframe đầu không có easing "đi vào" nó (easing áp cho đoạn TRƯỚC nó)
        easing: i === 0 ? undefined : easing[i - 1]
      })),
      {
        duration: totalDuration * 1000,
        fill: "forwards"
      }
    );
  }

  // "finished" có ở cả Motion One và native WAAPI. Nếu track bị cancel
  // (rời trang giữa chừng) thì promise reject — bỏ qua, không phát epilogue.
  trackAnimation?.finished
    ?.then(() => playPage4Epilogue())
    ?.catch(() => {});
}

// ============================================================
// Epilogue trang 4: chạy SAU khi camera đã đi hết hàng chữ/ảnh và dừng ở
// "có ngày suy tư" + ảnh cuối. Trình tự:
//   1) Fade track ra, fade epilogue vào
//   2) Gõ máy đánh chữ "Nhưng bạn vẫn không ngừng cố gắng"
//   3) Chờ 1s
//   4) Ảnh images/18.jpg "showout" (clip-path blob nở dần, không cần
//      three.js/gsap vì trang này chỉ có motion.js thuần)
//   5) Chữ chốt "Điều đó làm nên bạn của ngày hôm nay" fade vào
// ============================================================

function playPage4Epilogue() {
  if (!page4Epilogue || !page4EpiTyped1) return;

  const reduceMotion = !!prefersReducedMotion;

  // Bước 1: fade track ra, fade epilogue vào.
  page4Viewport?.classList.add("is-hidden");
  page4Epilogue.classList.add("is-visible");
  page4Epilogue.setAttribute("aria-hidden", "false");

  if (reduceMotion) {
    // Không hoạt náo: hiện thẳng toàn bộ trình tự, không gõ từng chữ.
    // Xoá style inline mà resetPage4Epilogue() có thể đã set (opacity/
    // clip-path 0), để rule CSS @prefers-reduced-motion (opacity:1,
    // clip-path:none) có hiệu lực thay vì bị inline style đè lên.
    if (page4EpiMedia) {
      page4EpiMedia.style.opacity = "";
      page4EpiMedia.style.clipPath = "";
    }
    page4EpiTyped1.textContent = PAGE4_EPILOGUE_TEXT_1;
    page4EpiLine2?.classList.add("is-visible");
    return;
  }

  page4EpiCursor1?.classList.add("is-blinking");

  const startTyping = () => page4EpiTypeChar(0);
  // Đợi track fade ra hẳn (khớp với transition .7s của .page4-viewport)
  // rồi mới bắt đầu gõ, để hai hoạt náo không đè lên nhau.
  page4EpiSchedule(startTyping, 500);
}

function page4EpiTypeChar(index) {
  if (!page4EpiTyped1) return;
  const text = PAGE4_EPILOGUE_TEXT_1;

  if (index >= text.length) {
    // Gõ xong — chờ 1s rồi mới cho ảnh "showout" xuất hiện.
    page4EpiSchedule(playPage4EpiShowout, 1000);
    return;
  }

  page4EpiTyped1.textContent = text.slice(0, index + 1);
  page4EpiSchedule(() => page4EpiTypeChar(index + 1), 55);
}

function playPage4EpiShowout() {
  if (!page4EpiMedia) {
    revealPage4EpiLine2();
    return;
  }

  page4EpiMedia.style.opacity = "1";

  const anim = page4EpiMedia.animate(
    [
      { clipPath: "circle(0% at 48% 46%)", offset: 0 },
      { clipPath: "circle(22% at 52% 54%)", offset: 0.18 },
      { clipPath: "circle(46% at 46% 50%)", offset: 0.45 },
      { clipPath: "circle(70% at 54% 48%)", offset: 0.72 },
      { clipPath: "circle(85% at 50% 50%)", offset: 1 }
    ],
    {
      duration: 1300,
      easing: "cubic-bezier(.22,.9,.28,1)",
      fill: "forwards"
    }
  );
  page4EpiTrackAnimation(anim);

  (anim?.finished || Promise.resolve())
    .then(() => page4EpiSchedule(revealPage4EpiLine2, 300))
    .catch(() => {});
}

function revealPage4EpiLine2() {
  page4EpiLine2?.classList.add("is-visible");
}

function resetPage4Epilogue() {
  page4EpiTimeouts.forEach((id) => clearTimeout(id));
  page4EpiTimeouts = [];
  page4EpiAnimations.forEach((a) => a?.cancel?.());
  page4EpiAnimations = [];

  page4Viewport?.classList.remove("is-hidden");
  page4Epilogue?.classList.remove("is-visible");
  page4Epilogue?.setAttribute("aria-hidden", "true");

  if (page4EpiTyped1) page4EpiTyped1.textContent = "";
  page4EpiCursor1?.classList.remove("is-blinking");

  if (page4EpiMedia) {
    page4EpiMedia.getAnimations?.().forEach((a) => a.cancel());
    page4EpiMedia.style.opacity = "0";
    page4EpiMedia.style.clipPath = "circle(0% at 50% 50%)";
  }

  page4EpiLine2?.classList.remove("is-visible");
}

function resetPage4() {
  const track = page4Track;
  if (!track) return;
  track.getAnimations?.().forEach((a) => a.cancel());
  track.style.transform = "translateX(0px) scale(1)";
  resetPage4Epilogue();
}
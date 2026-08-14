// ============================================================
// Section 5: PAGE5 — "1 2 3, hãy cùng chúc mừng..." rồi thổi tắt nến
// ============================================================

const page5Section = document.getElementById("page5");
const page5Intro = document.getElementById("page5Intro");
const page5CandleScene = document.getElementById("page5CandleScene");
const page5Hint = document.getElementById("page5Hint");
const page5Canvas = document.getElementById("page5FlameCanvas");
const page5Ctx = page5Canvas?.getContext("2d");

const PAGE5_INTRO_HOLD_MS = 2200;
const PAGE5_INTRO_FADE_MS = 1000;

let page5Timeouts = [];

function page5Schedule(fn, delayMs) {
  const id = setTimeout(fn, delayMs);
  page5Timeouts.push(id);
  return id;
}

function page5ClearTimeouts() {
  page5Timeouts.forEach((id) => clearTimeout(id));
  page5Timeouts = [];
}


// ============================================================
// AUDIO / MICROPHONE
// ============================================================

let page5AudioContext = null;
let page5MediaStream = null;
let page5Microphone = null;
let page5Analyser = null;
let page5AnalyserBuffer = null;

let page5Meter = null;
let page5MicRequested = false;
let page5Lowpass = 0;

// Trạng thái nến
let page5CandleBlown = false;
let page5BlowStart = 0;

// Thổi liên tục khoảng 0.45 giây sẽ tắt nến
const PAGE5_BLOW_DURATION_MS = 450;

// Sau khi tắt nến, giữ hint "đã thổi tắt" một lúc rồi mới sang trang 6
const PAGE5_AFTER_BLOW_HOLD_MS = 1600;

const PAGE5_ALPHA = 0.5;

// Micro điện thoại thường thu âm nhỏ hơn máy tính
const PAGE5_THRESHOLD = 0.035;


// ============================================================
// KIỂM TRA ĐANG THỔI
// ============================================================

const page5IsBlowing = () => {
  if (!page5Meter) return false;

  page5Lowpass =
    PAGE5_ALPHA * page5Meter.volume +
    (1.0 - PAGE5_ALPHA) * page5Lowpass;

  return page5Lowpass > PAGE5_THRESHOLD;
};

// Kết quả isBlowing() của frame hiện tại, tính đúng 1 lần trong
// page5Animate() rồi dùng lại ở mọi nơi khác (particle, v.v.)
// để tránh gọi page5IsBlowing() lặp lại nhiều lần/frame làm
// hỏng bộ lọc làm mượt page5Lowpass.
let page5BlowingThisFrame = false;


// ============================================================
// ĐO ÂM LƯỢNG MICRO
// ============================================================

function page5UpdateMeterVolume() {
  if (!page5Analyser || !page5Meter) return;

  page5Analyser.getFloatTimeDomainData(
    page5AnalyserBuffer
  );

  let sumSquares = 0;

  for (
    let i = 0;
    i < page5AnalyserBuffer.length;
    i++
  ) {
    sumSquares +=
      page5AnalyserBuffer[i] *
      page5AnalyserBuffer[i];
  }

  page5Meter.volume = Math.sqrt(
    sumSquares /
    page5AnalyserBuffer.length
  );
}


// ============================================================
// XIN QUYỀN MICROPHONE
// ============================================================

function page5RequestAudioAccess() {

  if (
    page5MicRequested ||
    page5MediaStream
  ) {
    return;
  }

  page5MicRequested = true;

  if (
    !navigator.mediaDevices?.getUserMedia
  ) {

    if (page5Hint) {
      page5Hint.textContent =
        "Trình duyệt này không hỗ trợ micro.";
    }

    return;
  }

  navigator.mediaDevices
    .getUserMedia({
      audio: true
    })

    .then((stream) => {

      page5SetAudioStream(stream);

      if (page5Hint) {
        page5Hint.textContent =
          "Hãy thổi vào micro để tắt nến.";
      }

    })

    .catch(() => {

      // Cho phép lần sau xin quyền lại
      page5MicRequested = false;

      if (page5Hint) {
        page5Hint.textContent =
          "Hãy cho phép micro để thổi tắt nến.";
      }

    });
}


// ============================================================
// KHỞI TẠO AUDIO
// ============================================================

function page5SetAudioStream(stream) {

  page5MediaStream = stream;

  page5AudioContext =
    new (
      window.AudioContext ||
      window.webkitAudioContext
    )();

  page5Microphone =
    page5AudioContext.createMediaStreamSource(
      stream
    );


  // Lọc tiếng trầm để nhận hơi thổi
  const filter =
    page5AudioContext.createBiquadFilter();

  filter.type = "lowpass";
  filter.frequency.value = 400;


  page5Analyser =
    page5AudioContext.createAnalyser();

  page5Analyser.fftSize = 512;

  page5AnalyserBuffer =
    new Float32Array(
      page5Analyser.fftSize
    );

  page5Meter = {
    volume: 0
  };


  page5Microphone.connect(filter);
  filter.connect(page5Analyser);
}


// ============================================================
// DỪNG MICRO
// ============================================================

function page5StopAudio() {

  page5MediaStream
    ?.getTracks()
    .forEach((track) => track.stop());

  page5AudioContext
    ?.close?.()
    .catch(() => {});


  page5MediaStream = null;
  page5AudioContext = null;
  page5Microphone = null;
  page5Analyser = null;
  page5AnalyserBuffer = null;
  page5Meter = null;

  page5MicRequested = false;
  page5Lowpass = 0;
}


// ============================================================
// CANDLE
// ============================================================

const page5CW = 800;
const page5CH = 400;

const page5Particles = [];

const PAGE5_MAX_PART_COUNT = 100;

const PAGE5_REIGNITE_RATE = 2;
const PAGE5_MAX_PART_DOWNTIME = 15;


const page5Rand = (min, max) =>
  min + Math.random() * (max - min);


// ============================================================
// FLAME PARTICLE
// ============================================================

class Page5FlameParticle {

  constructor(
    x = page5CW / 2,
    y = page5CH / 2
  ) {

    this.radius = 15;

    this.speed = {
      x: page5Rand(-0.5, 0.5),
      y: 2.5
    };

    this.life =
      page5Rand(50, 100);

    this.alpha = 0.5;

    this.x = x;
    this.y = y;

    this.curAlpha = this.alpha;
    this.curLife = this.life;
  }


  update = () => {

    if (this.curLife <= 90) {

      this.radius -=
        Math.min(
          this.radius,
          0.25
        );

      this.curAlpha -= 0.005;
    }


    // Khi đang thổi, lửa bị đẩy lệch
    if (
      page5Microphone &&
      page5BlowingThisFrame
    ) {

      this.x +=
        page5Rand(
          -page5Meter.volume,
          page5Meter.volume
        ) * 50;
    }


    this.curLife -=
      this.speed.y;

    this.y -=
      this.speed.y;

    this.draw();
  };


  draw = () => {

    page5Ctx.beginPath();

    page5Ctx.arc(
      this.x,
      this.y,
      this.radius,
      Math.PI * 2,
      false
    );

    page5Ctx.fillStyle =
      `rgba(254, 252, 207, ${this.curAlpha})`;

    page5Ctx.fill();

    page5Ctx.closePath();
  };
}


// ============================================================
// FLAME BASE
// ============================================================

class Page5FlameBase {

  update = this.draw = () => {

    page5Ctx.beginPath();

    page5Ctx.arc(
      page5CW / 2,
      page5CH / 2,
      14,
      Math.PI * 2,
      false
    );

    page5Ctx.fillStyle =
      "rgba(185, 125, 45, 0.4)";

    page5Ctx.fill();

    page5Ctx.closePath();
  };
}


let page5Base = null;
let page5ParticleCount =
  PAGE5_MAX_PART_COUNT;

let page5RafId = null;
let page5ReigniteIntervalId = null;
let page5CandleInited = false;


// ============================================================
// UPDATE PARTICLES
// ============================================================

function page5UpdateParticles() {

  for (
    let i = 0;
    i < page5ParticleCount;
    i++
  ) {

    if (
      page5Particles[i].curLife < 0
    ) {

      page5Particles[i] =
        new Page5FlameParticle();
    }

    page5Particles[i].update();
  }
}


// ============================================================
// ANIMATION
// ============================================================

function page5Animate() {

  page5RafId =
    requestAnimationFrame(
      page5Animate
    );

  page5Ctx.clearRect(
    0,
    0,
    page5CW,
    page5CH
  );


  if (page5Microphone) {
    page5UpdateMeterVolume();
  }

  // Tính isBlowing() đúng 1 lần cho cả frame này
  page5BlowingThisFrame =
    page5Microphone ? page5IsBlowing() : false;


  // ==========================================================
  // ĐANG THỔI
  // ==========================================================

  if (
    !page5CandleBlown &&
    page5Microphone &&
    page5BlowingThisFrame
  ) {

    if (!page5BlowStart) {
      page5BlowStart =
        performance.now();
    }


    // Lửa nhỏ dần
    page5ParticleCount =
      Math.max(
        0,
        page5ParticleCount - 2
      );


    // Thổi đủ lâu → TẮT NẾN
    if (
      performance.now() -
      page5BlowStart >=
      PAGE5_BLOW_DURATION_MS
    ) {

      page5CandleBlown = true;

      page5ParticleCount = 0;


      if (page5Hint) {
        page5Hint.textContent =
          "✨ Bạn đã thổi tắt ngọn nến! ✨";
      }

      // Không cần micro nữa — tắt sớm để nhả quyền truy cập.
      page5StopAudio();

      // Giữ dòng chữ một lúc rồi tự chuyển sang trang 6.
      page5Schedule(() => {
        window.storyController?.next();
      }, PAGE5_AFTER_BLOW_HOLD_MS);
    }

  }

  else if (!page5CandleBlown) {

    // Ngừng thổi → reset bộ đếm
    page5BlowStart = 0;
  }


  // Nếu nến chưa tắt thì tiếp tục vẽ lửa
  if (!page5CandleBlown) {

    page5UpdateParticles();

    page5Base.update();
  }
}


// ============================================================
// INIT CANDLE
// ============================================================

function page5InitCandleOnce() {

  if (
    page5CandleInited ||
    !page5Canvas ||
    !page5Ctx
  ) {
    return;
  }

  page5CandleInited = true;

  page5Canvas.width =
    page5CW;

  page5Canvas.height =
    page5CH;


  page5Base =
    new Page5FlameBase();


  for (
    let i = 0;
    i < PAGE5_MAX_PART_COUNT;
    i++
  ) {

    page5Particles.push(
      new Page5FlameParticle()
    );
  }
}


// ============================================================
// START CANDLE
// ============================================================

function page5StartCandleScene() {

  page5InitCandleOnce();

  page5ParticleCount =
    PAGE5_MAX_PART_COUNT;

  page5CandleBlown = false;
  page5BlowStart = 0;


  if (page5Hint) {

    page5Hint.textContent =
      "Hãy thử thổi tắt ngọn nến.";
  }


  // Xin quyền microphone
  page5RequestAudioAccess();


  if (!page5RafId) {
    page5Animate();
  }


  // Không cho nến cháy lại nếu đã tắt
  if (!page5ReigniteIntervalId) {

    page5ReigniteIntervalId =
      setInterval(() => {

        if (
          !page5CandleBlown &&
          page5ParticleCount <
          PAGE5_MAX_PART_COUNT
        ) {

          page5ParticleCount +=
            PAGE5_REIGNITE_RATE;
        }

      }, 200);
  }
}


// ============================================================
// STOP CANDLE
// ============================================================

function page5StopCandleScene() {

  if (page5RafId) {

    cancelAnimationFrame(
      page5RafId
    );

    page5RafId = null;
  }


  if (page5ReigniteIntervalId) {

    clearInterval(
      page5ReigniteIntervalId
    );

    page5ReigniteIntervalId = null;
  }


  page5Ctx?.clearRect(
    0,
    0,
    page5CW,
    page5CH
  );


  page5StopAudio();

  page5CandleBlown = false;
  page5BlowStart = 0;
}


// ============================================================
// PAGE 5 SEQUENCE
// ============================================================

function playPage5() {

  if (
    !page5Intro ||
    !page5CandleScene
  ) {
    return;
  }


  page5ClearTimeouts();


  page5Intro.classList.remove(
    "is-hidden"
  );

  page5Intro.setAttribute(
    "aria-hidden",
    "false"
  );


  page5CandleScene.classList.remove(
    "is-visible"
  );

  page5CandleScene.setAttribute(
    "aria-hidden",
    "true"
  );


  // Hiện "1 2 3..."
  page5Schedule(() => {

    page5Intro.classList.add(
      "is-hidden"
    );

    page5Intro.setAttribute(
      "aria-hidden",
      "true"
    );

  }, PAGE5_INTRO_HOLD_MS);


  // Hiện nến + xin quyền micro
  page5Schedule(() => {

    page5CandleScene.classList.add(
      "is-visible"
    );

    page5CandleScene.setAttribute(
      "aria-hidden",
      "false"
    );

    page5StartCandleScene();

  }, PAGE5_INTRO_HOLD_MS +
     PAGE5_INTRO_FADE_MS);
}


// ============================================================
// RESET PAGE 5
// ============================================================

function resetPage5() {

  page5ClearTimeouts();

  page5StopCandleScene();


  page5Intro?.classList.remove(
    "is-hidden"
  );

  page5Intro?.setAttribute(
    "aria-hidden",
    "true"
  );


  page5CandleScene?.classList.remove(
    "is-visible"
  );

  page5CandleScene?.setAttribute(
    "aria-hidden",
    "true"
  );
}
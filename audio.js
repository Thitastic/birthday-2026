// ============================================================
// Audio Manager — quản lý toàn bộ nhạc nền
// File này phải load SAU core.js và TRƯỚC main.js.
// ============================================================

const AUDIO_TRACKS = {
  hero: "audio/01.mp3",
  story: "audio/02.mp3",
  page3: "audio/03.mp3",
  page4: "audio/03.mp3",
  page6: "audio/04.mp3"
};

const audioManager = (() => {
  const FADE_MS = 500;
  const cache = new Map(); // src -> HTMLAudioElement
  let current = null;      // { audio, src }
  let unlocked = false;

  // Lần play() đầu tiên: phát ngay full volume.
  // Các lần đổi track sau đó sẽ crossfade.
  let firstPlayPending = true;

  function getAudio(src) {
    if (!cache.has(src)) {
      const el = new Audio(src);
      el.loop = true;
      el.preload = "auto";
      el.volume = 0;
      cache.set(src, el);
    }
    return cache.get(src);
  }

  function fadeTo(el, target, duration) {
    if (!el) return;

    const start = el.volume;

    if (!duration || prefersReducedMotion) {
      el.volume = target;
      return;
    }

    const startTime = performance.now();

    const step = (now) => {
      const t = Math.min(1, (now - startTime) / duration);
      el.volume = start + (target - start) * t;

      if (t < 1) requestAnimationFrame(step);
    };

    requestAnimationFrame(step);
  }

  function fadeOutAndPause(el) {
    if (!el) return;

    fadeTo(el, 0, FADE_MS);

    setTimeout(() => {
      // Không pause nếu track này đã được dùng lại làm track hiện tại.
      if (current?.audio !== el) el.pause();
    }, FADE_MS + 60);
  }

  // Phát nhạc theo ID section.
  // Section không có track (ví dụ page5) => fade về im lặng.
  function play(sectionId) {
    const src = AUDIO_TRACKS[sectionId];

    if (!src) {
      stop();
      return;
    }

    // page3 -> page4 dùng chung audio/03.mp3:
    // giữ nguyên track, không tua lại và không fade.
    if (current && current.src === src) return;

    const prev = current;
    const next = getAudio(src);

    current = { audio: next, src };

    const skipFade = firstPlayPending;
    firstPlayPending = false;

    if (skipFade) {
      next.volume = 1;
    }

    const attempt = next.play();

    const onPlaying = () => {
      unlocked = true;

      if (!skipFade) {
        fadeTo(next, 1, FADE_MS);
      }
    };

    if (attempt?.then) {
      attempt
        .then(onPlaying)
        .catch(() => {
          // Autoplay bị chặn -> unlock() sẽ thử lại ở cử chỉ kế tiếp.
        });
    } else {
      onPlaying();
    }

    if (prev && prev.audio !== next) {
      fadeOutAndPause(prev.audio);
    }
  }

  function stop() {
    if (!current) return;

    fadeOutAndPause(current.audio);
    current = null;
  }

  // Safari/iOS và một số trình duyệt chặn autoplay cho tới khi
  // có cử chỉ người dùng đầu tiên.
  function unlock() {
    if (unlocked || !current) return;

    current.audio
      .play()
      .then(() => {
        unlocked = true;
        fadeTo(current.audio, 1, FADE_MS);
      })
      .catch(() => {
        // Chờ cử chỉ tiếp theo để thử lại.
      });
  }

  ["pointerdown", "keydown", "touchend"].forEach((evt) => {
    window.addEventListener(evt, unlock, { passive: true });
  });

  // Mồi các track khác trong cùng cử chỉ người dùng thật
  // để autoplay chuyển trang sau này không bị Safari chặn.
  function primeAllExcept(exceptSectionId) {
    const exceptSrc = AUDIO_TRACKS[exceptSectionId];
    const sources = new Set(Object.values(AUDIO_TRACKS));

    sources.forEach((src) => {
      if (src === exceptSrc) return;

      const el = getAudio(src);
      const attempt = el.play();

      if (attempt?.then) {
        attempt
          .then(() => {
            el.pause();
            el.currentTime = 0;
          })
          .catch(() => {});
      } else {
        try {
          el.pause();
        } catch (e) {
          /* bỏ qua */
        }
      }
    });
  }

  // Preload audio cho màn hình preload.
  function preload(sources, onEach) {
    const list =
      sources && sources.length
        ? sources
        : Object.values(AUDIO_TRACKS);

    return Promise.all(
      list.map(
        (src) =>
          new Promise((resolve) => {
            const el = getAudio(src);

            const finish = () => {
              el.removeEventListener("canplaythrough", finish);
              el.removeEventListener("error", finish);
              onEach?.(src);
              resolve();
            };

            if (el.readyState >= 3) {
              finish();
              return;
            }

            el.addEventListener("canplaythrough", finish, { once: true });
            el.addEventListener("error", finish, { once: true });
            el.load();
          })
      )
    );
  }

  return {
    play,
    stop,
    preload,
    primeAllExcept
  };
})();

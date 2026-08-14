// ============================================================
// Section 1 (Hero): "HÔM NAY" / "LÀ NGÀY" / "ĐẶC BIỆT." / "...của riêng
// bạn." / "Vuốt sang trái để tiếp tục ←" hiện ra LẦN LƯỢT, mỗi dòng bằng
// hiệu ứng fade-in + "letter swap" — chữ cái trượt lên từ dưới theo thứ tự
// XÁO TRỘN ngẫu nhiên (không phải trái→phải), lấy cảm hứng từ component
// RandomLetterSwap (Originkit, file letter-swap.txt được đính kèm) — bản
// gốc là hiệu ứng hover (chữ đã hiển thị sẵn, hover mới đảo qua đảo lại),
// ở đây được chuyển thành hiệu ứng "vào cảnh" một lần: chữ bắt đầu ẩn dưới
// baseline rồi trượt lên đúng vị trí, mỗi chữ trễ một nhịp theo thứ tự đã
// xáo, y hệt tinh thần shuffle của bản gốc (arr.sort(() => Math.random()-.5)).
//
// File này TỰ CHỨA (tự inject CSS của nó) nên không cần đụng style.css —
// chỉ cần thêm <script src="page1.js"></script> (sau hero.js) và gọi
// playPage1() / resetPage1() khi vào/rời trang hero (xem main.js).
// ============================================================

(() => {
  // ---------- Inject CSS 1 lần ----------
  if (!document.getElementById("page1Styles")) {
    const style = document.createElement("style");
    style.id = "page1Styles";
    style.textContent = `
      .p1-visible { display: inline; }
      .p1-sr-only {
        position: absolute;
        width: 1px; height: 1px;
        padding: 0; margin: -1px;
        overflow: hidden;
        clip: rect(0,0,0,0);
        white-space: nowrap;
        border: 0;
      }
      .p1-letter {
        display: inline-block;
        overflow: hidden;
        line-height: 1.2;
        vertical-align: bottom;
      }
      .p1-letter-inner {
        display: inline-block;
        white-space: pre;
        will-change: transform, opacity;
        transform: translateY(120%);
        opacity: 0;
      }
      .p1-arrow {
        display: inline-block;
        will-change: transform, opacity;
        opacity: 0;
        transform: translateX(-6px);
      }
      @media (prefers-reduced-motion: reduce) {
        .p1-letter-inner, .p1-arrow {
          transition: none !important;
        }
      }
    `;
    document.head.appendChild(style);
  }

  // ---------- DOM ----------
  const heroTitleLines = Array.from(
    document.querySelectorAll("#hero h1 .title-line")
  ); // ["HÔM NAY", "LÀ NGÀY", "ĐẶC BIỆT."]
  const heroDescriptionEl = document.querySelector("#hero .description");
  const heroStartTextEl = document.querySelector("#hero .start span");
  const heroStartArrowEl = document.querySelector("#hero .start b");
  const heroContentEl = document.querySelector("#hero .content");

  // ---------- Che khối content ngay từ đầu bằng CSS thuần ----------
  // KHÔNG đụng tới thời điểm/logic tách chữ (page1Init/playPage1 vẫn chạy
  // "lười" y hệt bản gốc, đúng lúc hero.enter() gọi lần đầu — đổi thời
  // điểm đó từng gây hỏng animation). Vấn đề gốc chỉ là: từ lúc trang tải
  // xong tới lúc bấm "Bắt đầu", h1/description vẫn hiển thị TĨNH (chưa
  // tách chữ) — nếu preload không che kín 100% sẽ lộ chữ tĩnh ra ngoài.
  // Ta ẩn hẳn cả khối .content bằng opacity ngay từ đầu; playPage1() sẽ tự
  // mở lại opacity này ở bước đầu tiên, sau khi chữ đã được tách + ẩn
  // từng ký tự — nên không có khung hình nào lộ chữ tĩnh, chưa animate.
  if (heroContentEl) heroContentEl.style.opacity = "0";

  // ---------- Tách chữ cái ----------
  // Đệ quy qua các text-node của root, thay mỗi text-node bằng chuỗi span
  // 2 lớp (.p1-letter > .p1-letter-inner) cho từng ký tự — giữ nguyên các
  // thẻ con khác (ví dụ <strong>bạn.</strong> trong phần description) vì
  // chỉ text-node bị thay, phần tử thì được đệ quy vào bên trong.
  function page1WrapTextNode(textNode) {
    const text = textNode.textContent;
    const frag = document.createDocumentFragment();
    const letters = [];

    for (const ch of text) {
      const outer = document.createElement("span");
      outer.className = "p1-letter";
      const inner = document.createElement("span");
      inner.className = "p1-letter-inner";
      inner.textContent = ch;
      outer.appendChild(inner);
      frag.appendChild(outer);
      letters.push(inner);
    }

    textNode.replaceWith(frag);
    return letters;
  }

  function page1SplitLetters(root) {
    const letters = [];
    const walk = (node) => {
      Array.from(node.childNodes).forEach((child) => {
        if (child.nodeType === Node.TEXT_NODE) {
          if (!child.textContent) return;
          letters.push(...page1WrapTextNode(child));
        } else if (child.nodeType === Node.ELEMENT_NODE) {
          walk(child);
        }
      });
    };
    walk(root);
    return letters;
  }

  // Bọc root: nội dung gốc chuyển vào 1 span aria-hidden để tách chữ +
  // hoạt náo, đồng thời thêm 1 span "sr-only" giữ nguyên text gốc cho
  // trình đọc màn hình (screen reader không nên đọc từng chữ cái rời rạc).
  function page1PrepareRoot(root) {
    if (!root || root.dataset.p1Split) return [];
    root.dataset.p1Split = "true";

    const srText = root.textContent;
    const srEl = document.createElement("span");
    srEl.className = "p1-sr-only";
    srEl.textContent = srText;

    const visibleWrap = document.createElement("span");
    visibleWrap.className = "p1-visible";
    visibleWrap.setAttribute("aria-hidden", "true");

    while (root.firstChild) {
      visibleWrap.appendChild(root.firstChild);
    }

    root.appendChild(visibleWrap);
    root.appendChild(srEl);

    return page1SplitLetters(visibleWrap);
  }

  // ---------- State ----------
  let page1Inited = false;
  let page1Groups = []; // [{ letters: HTMLElement[] }]
  let page1Timeouts = [];

  function page1Schedule(fn, delayMs) {
    const id = setTimeout(fn, delayMs);
    page1Timeouts.push(id);
    return id;
  }

  function page1ClearTimeouts() {
    page1Timeouts.forEach((id) => clearTimeout(id));
    page1Timeouts = [];
  }

  function page1Init() {
    if (page1Inited) return;
    page1Inited = true;

    page1Groups = [
      ...heroTitleLines.map((el) => page1PrepareRoot(el)),
      page1PrepareRoot(heroDescriptionEl),
      page1PrepareRoot(heroStartTextEl)
    ].filter((letters) => letters && letters.length);
  }

  // Xáo mảng chỉ số — giống hệt cách bản gốc (Originkit) làm:
  // arr.sort(() => Math.random() - 0.5), không phải Fisher-Yates chuẩn,
  // nhưng giữ đúng "tính cách" xáo trộn của hiệu ứng gốc.
  function page1Shuffle(arr) {
    return [...arr].sort(() => Math.random() - 0.5);
  }

  function page1HideAllInstant() {
    page1Groups.forEach((letters) => {
      letters.forEach((el) => {
        el.getAnimations?.().forEach((a) => a.cancel());
        el.style.transform = "translateY(120%)";
        el.style.opacity = "0";
      });
    });

    if (heroStartArrowEl) {
      heroStartArrowEl.classList.add("p1-arrow");
      heroStartArrowEl.getAnimations?.().forEach((a) => a.cancel());
      heroStartArrowEl.style.transform = "translateX(-6px)";
      heroStartArrowEl.style.opacity = "0";
    }
  }

  // Trượt lên + fade-in từng chữ theo thứ tự đã xáo. Trả về tổng thời gian
  // (ms) để nhóm chữ hiện xong hẳn — dùng để cân nhịp cho lời gọi bên ngoài
  // nếu cần, dù ở đây playPage1() dùng mốc thời gian cố định là chính.
  function page1RevealGroup(letters, { baseDelayMs = 0, staggerMs = 26, durationMs = 620 } = {}) {
    if (!letters || !letters.length) return 0;

    if (prefersReducedMotion) {
      letters.forEach((el) => {
        el.style.transition = "none";
        el.style.transform = "translateY(0)";
        el.style.opacity = "1";
      });
      return 0;
    }

    const order = page1Shuffle(letters);
    order.forEach((el, i) => {
      const delay = baseDelayMs + i * staggerMs;
      el.animate(
        [
          { transform: "translateY(120%)", opacity: 0 },
          { transform: "translateY(0)", opacity: 1 }
        ],
        {
          duration: durationMs,
          delay,
          easing: "cubic-bezier(.16,1,.3,1)",
          fill: "forwards"
        }
      );
    });

    return baseDelayMs + (order.length - 1) * staggerMs + durationMs;
  }

  function page1RevealArrow(delayMs) {
    if (!heroStartArrowEl) return;
    heroStartArrowEl.classList.add("p1-arrow");

    if (prefersReducedMotion) {
      heroStartArrowEl.style.transition = "none";
      heroStartArrowEl.style.transform = "translateX(0)";
      heroStartArrowEl.style.opacity = "1";
      return;
    }

    heroStartArrowEl.animate(
      [
        { transform: "translateX(-6px)", opacity: 0 },
        { transform: "translateX(0)", opacity: 1 }
      ],
      {
        duration: 500,
        delay: delayMs,
        easing: "cubic-bezier(.16,1,.3,1)",
        fill: "forwards"
      }
    );
  }

  // ============================================================
  // Trình tự vào cảnh — 5 nhịp lần lượt:
  //   1) HÔM NAY            @ 0ms
  //   2) LÀ NGÀY             @ 520ms
  //   3) ĐẶC BIỆT.           @ 1040ms
  //   4) ...của riêng bạn.   @ 1680ms
  //   5) Vuốt sang trái…  ←  @ 2280ms (chữ) / 2280+160ms (mũi tên)
  // Mỗi mốc là thời điểm nhóm chữ đó BẮT ĐẦU trượt lên; các chữ trong cùng
  // nhóm tự cách nhau thêm staggerMs nữa theo thứ tự xáo ngẫu nhiên.
  // ============================================================
  function playPage1() {
    // try/finally: đảm bảo khối .content LUÔN được mở opacity ra, kể cả
    // khi page1Init()/page1HideAllInstant() lỡ throw lỗi vì lý do gì đó —
    // tránh trang bị kẹt trắng/rỗng vĩnh viễn thay vì chỉ thiếu animation.
    try {
      page1Init();
      page1ClearTimeouts();
      page1HideAllInstant();
    } finally {
      if (heroContentEl) heroContentEl.style.opacity = "";
    }

    const [line1, line2, line3, description, buttonText] = page1Groups;

    const START = [0, 520, 1040, 1680, 2280];

    page1Schedule(() => page1RevealGroup(line1, { baseDelayMs: 0 }), START[0]);
    page1Schedule(() => page1RevealGroup(line2, { baseDelayMs: 0 }), START[1]);
    page1Schedule(() => page1RevealGroup(line3, { baseDelayMs: 0 }), START[2]);
    page1Schedule(
      () => page1RevealGroup(description, { baseDelayMs: 0, staggerMs: 14, durationMs: 520 }),
      START[3]
    );
    page1Schedule(
      () => page1RevealGroup(buttonText, { baseDelayMs: 0, staggerMs: 22, durationMs: 520 }),
      START[4]
    );
    page1Schedule(() => page1RevealArrow(0), START[4] + 160);
  }

  function resetPage1() {
    page1Init();
    page1ClearTimeouts();
    page1HideAllInstant();
  }

  // Cho main.js gọi (giống playPage4/resetPage4, playPage5/resetPage5…).
  window.playPage1 = playPage1;
  window.resetPage1 = resetPage1;
})();

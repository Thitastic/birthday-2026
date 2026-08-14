// ============================================================
// Section 2: STORY — Text Morph (SVG threshold / gooey)
// ============================================================

// ---------- Story: Text Morph (SVG threshold / gooey) ----------
// Dựa trực tiếp trên kỹ thuật của CodePen Text Morph của Valgo:
// 2 lớp text chồng lên nhau + blur + SVG threshold để tạo cảm giác chữ hòa vào nhau.
class TextMorph {
  constructor(el) {
    this.el = el;
    this.text1 = document.createElement("span");
    this.text2 = document.createElement("span");

    this.text1.className = "morph-layer morph-text1";
    this.text2.className = "morph-layer morph-text2";

    this.el.textContent = "";
    this.el.append(this.text1, this.text2);

    this.morphTime = 1.0;
    this.cooldownTime = 2.5;
    this.morph = 0;
    this.cooldown = this.cooldownTime;
    this.time = performance.now();
    this.index = 0;
    this.running = false;
    this.raf = 0;

    this.text1.innerHTML = renderPhrase(timePhrases[0]);
    this.text2.innerHTML = renderPhrase(timePhrases[1]);
  }

  setMorph(fraction) {
    // Công thức gốc của CodePen:
    // layer mới tăng opacity + giảm blur,
    // layer cũ giảm opacity + tăng blur.
    const safeFraction = Math.max(0.0001, Math.min(1, fraction));

    this.text2.style.filter = `blur(${Math.min(8 / safeFraction - 8, 100)}px)`;
    this.text2.style.opacity = `${Math.pow(safeFraction, 0.4) * 100}%`;

    const reverse = 1 - safeFraction;
    const safeReverse = Math.max(0.0001, reverse);

    this.text1.style.filter = `blur(${Math.min(8 / safeReverse - 8, 100)}px)`;
    this.text1.style.opacity = `${Math.pow(safeReverse, 0.4) * 100}%`;
  }

  doMorph() {
    this.morph -= this.cooldown;
    this.cooldown = 0;

    let fraction = this.morph / this.morphTime;

    if (fraction > 1) {
      this.cooldown = this.cooldownTime;
      fraction = 1;
    }

    this.setMorph(fraction);
  }

  doCooldown() {
    this.morph = 0;

    this.text2.style.filter = "";
    this.text2.style.opacity = "100%";

    this.text1.style.filter = "";
    this.text1.style.opacity = "0%";
  }

  nextText() {
    this.index = (this.index + 1) % timePhrases.length;
    this.text1.innerHTML = renderPhrase(timePhrases[this.index]);
    this.text2.innerHTML = renderPhrase(timePhrases[(this.index + 1) % timePhrases.length]);
  }

  tick(now) {
    if (!this.running) return;

    const dt = Math.min((now - this.time) / 1000, 0.1);
    this.time = now;

    const shouldIncrementIndex = this.cooldown > 0;
    this.cooldown -= dt;

    if (this.cooldown <= 0) {
      if (shouldIncrementIndex) this.nextText();
      this.doMorph();
    } else {
      this.doCooldown();
    }

    this.raf = requestAnimationFrame((t) => this.tick(t));
  }

  start() {
    if (this.running) return;

    this.running = true;
    this.time = performance.now();
    this.cooldown = this.cooldownTime;
    this.raf = requestAnimationFrame((t) => this.tick(t));
  }

  stop() {
    this.running = false;
    cancelAnimationFrame(this.raf);
  }
}

const morphEl = document.getElementById("morphText");

// 26 năm quy đổi qua từng đơn vị thời gian, kể từ ngày bạn đến với cuộc sống này.
const timePhrases = [
  { number: "27", unit: "NĂM" },
  { number: "9.862", unit: "NGÀY" },
  { number: "236.688", unit: "GIỜ" },
  { number: "14.201.280", unit: "PHÚT" },
  { number: "852.076.800", unit: "GIÂY" }
];

// Số to ở trên, đơn vị nhỏ hơn xếp bên dưới.
function renderPhrase(phrase) {
  return `<span class="morph-number">${phrase.number}</span><span class="morph-unit">${phrase.unit}</span>`;
}

const morph = morphEl ? new TextMorph(morphEl) : null;


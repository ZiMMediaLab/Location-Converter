// HM Loc Converter - web version

"use strict";

const $ = (id) => document.getElementById(id);

// Sound (Web Audio; phones only allow audio after the first tap)

const Sound = {
  context: null,
  buffers: {},
  names: ["sndLogin", "sndConvert"],

  unlock() {
    if (this.context) {
      if (this.context.state === "suspended") this.context.resume();
      return;
    }

    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return;

    this.context = new AudioCtx();
    this.names.forEach((name) => {
      fetch(`assets/sounds/${name}.mp3`)
        .then((response) => response.arrayBuffer())
        .then((data) => new Promise((resolve, reject) => this.context.decodeAudioData(data, resolve, reject)))
        .then((buffer) => { this.buffers[name] = buffer; })
        .catch(() => {});
    });
  },

  play(name) {
    // Wait briefly if audio was just unlocked
    const start = () => {
      const buffer = this.buffers[name];
      if (!this.context || !buffer) return false;
      const source = this.context.createBufferSource();
      source.buffer = buffer;
      source.connect(this.context.destination);
      source.start();
      return true;
    };

    if (!start()) {
      let tries = 0;
      const retry = setInterval(() => {
        if (start() || ++tries > 20) clearInterval(retry);
      }, 50);
    }
  },
};

["pointerdown", "keydown", "touchstart"].forEach((type) => {
  window.addEventListener(type, () => Sound.unlock(), { capture: true, passive: true });
});

// Start screen -> converter (fade out, fade in)

const startScreen = $("screen-start");
const converterScreen = $("screen-converter");
let started = false;

function continueToConverter() {
  if (started) return;
  started = true;

  Sound.play("sndLogin");
  startScreen.classList.add("fading");

  setTimeout(() => {
    startScreen.hidden = true;
    converterScreen.classList.add("fading");
    converterScreen.hidden = false;
    requestAnimationFrame(() => requestAnimationFrame(() => converterScreen.classList.remove("fading")));
    if (window.matchMedia("(min-width: 761px)").matches) $("prefix").focus();
  }, 500);
}

startScreen.addEventListener("click", continueToConverter);
window.addEventListener("keydown", (e) => {
  if (!started && e.key === "Enter") {
    e.preventDefault();
    continueToConverter();
  }
});

// Converter

const prefixBox = $("prefix");
const locsBox = $("locs");
const resultsBox = $("results");
const convertButton = $("btn-convert");
const copyButton = $("btn-copy");

// Each non-empty line becomes prefix{t:#s.loc}
function convertLocs(prefix, text) {
  return text
    .split(/\r?\n|\r/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .map((loc) => `${prefix}{t:#s.${loc}}`);
}

// Convert is enabled once there's a prefix and something changed
function updateConvertButton() {
  convertButton.disabled = prefixBox.value.trim() === "";
}

prefixBox.addEventListener("input", () => {
  prefixBox.classList.remove("error");
  updateConvertButton();
});
locsBox.addEventListener("input", updateConvertButton);

convertButton.addEventListener("click", () => {
  const prefix = prefixBox.value.trim();
  if (!prefix) {
    prefixBox.classList.add("error");
    return;
  }

  const lines = convertLocs(prefix, locsBox.value);
  resultsBox.value = lines.join("\n");
  resultsBox.scrollTop = 0;
  resultsBox.classList.remove("error");
  copyButton.disabled = lines.length === 0;

  Sound.play("sndConvert");
  convertButton.disabled = true;   // re-enabled as soon as you change the prefix or locs

  // Scroll results into view on phones
  if (window.matchMedia("(max-width: 760px)").matches) {
    resultsBox.scrollIntoView({ behavior: "smooth", block: "start" });
  }
});

// Clicking the results with no prefix flashes it red
resultsBox.addEventListener("click", () => {
  resultsBox.classList.toggle("error", prefixBox.value.trim() === "");
});
locsBox.addEventListener("click", () => resultsBox.classList.remove("error"));

copyButton.addEventListener("click", async () => {
  const text = resultsBox.value;
  if (!text) return;

  try {
    await navigator.clipboard.writeText(text);
  } catch (e) {
    // Fallback for older browsers
    resultsBox.focus();
    resultsBox.select();
    document.execCommand("copy");
  }

  showToast(`Copied ${text.split("\n").length} lines`);
});

let toastTimer = 0;
function showToast(message) {
  const toast = $("toast");
  toast.textContent = message;
  toast.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove("show"), 1600);
}

// Service worker (offline + install)

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => navigator.serviceWorker.register("service-worker.js").catch(() => {}));
}

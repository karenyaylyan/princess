// ====== НАСТРОЙКИ УРОВНЕЙ ======
// Замени "image" на путь к своей финальной иллюстрации, когда она будет готова.
// "word" — слово-ответ (регистр не важен).
const LEVELS = [
  { image: "images/level1.svg", word: "ХАЧИК" },
  { image: "images/level2.svg", word: "СОУСНИЦА" },
  { image: "images/level3.svg", word: "БУЛОЧКА" },
  { image: "images/level4.svg", word: "ЗАЙКА" },
  { image: "images/level_princess.svg", word: "ПРИНЦЕССА" },
  { image: "images/level5.svg", word: "ГРАФ" },
];

// Ссылка на подарок — открывается на последнем экране
const GOOGLE_DOC_URL = "https://disk.yandex.ru/i/CX6ikZG2aXFxoA";

const STORAGE_KEY = "birthday-quiz-progress-v2";

// ====== СОСТОЯНИЕ ======
let state = loadState();

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch (e) {}
  return { currentLevel: 0, levelStates: LEVELS.map(() => ({})) };
}

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

// ====== DOM ======
const dotsEl = document.getElementById("dots");
const imageEl = document.getElementById("level-image");
const lettersEl = document.getElementById("letters");
const feedbackEl = document.getElementById("feedback");
const hintBtn = document.getElementById("hint-btn");
const checkBtn = document.getElementById("check-btn");
const counterEl = document.getElementById("counter");
const gameCard = document.getElementById("game-card");
const finalCard = document.getElementById("final-card");
const giftLink = document.getElementById("gift-link");
const resetBtn = document.getElementById("reset-btn");
const envelope = document.getElementById("envelope");

giftLink.href = GOOGLE_DOC_URL;

// build progress dots
LEVELS.forEach(() => {
  const d = document.createElement("span");
  d.className = "dot";
  dotsEl.appendChild(d);
});

function renderDots() {
  const dots = dotsEl.querySelectorAll(".dot");
  dots.forEach((d, i) => {
    d.classList.toggle("done", i < state.currentLevel);
    d.classList.toggle("current", i === state.currentLevel);
  });
}

function renderLevel() {
  if (state.currentLevel >= LEVELS.length) {
    showFinal();
    return;
  }

  const idx = state.currentLevel;
  const level = LEVELS[idx];
  const word = level.word.toUpperCase();
  const lvState = state.levelStates[idx] || (state.levelStates[idx] = {});
  if (!lvState.locked) lvState.locked = new Array(word.length).fill(false);

  imageEl.src = level.image;
  imageEl.alt = "Загадка уровня " + (idx + 1);
  counterEl.textContent = "Уровень " + (idx + 1) + " из " + LEVELS.length;
  feedbackEl.textContent = "\u00A0";
  feedbackEl.className = "feedback";

  lettersEl.innerHTML = "";
  for (let i = 0; i < word.length; i++) {
    const input = document.createElement("input");
    input.type = "text";
    input.maxLength = 1;
    input.className = "letter-box";
    input.dataset.index = i;
    input.autocomplete = "off";
    input.autocapitalize = "characters";
    input.inputMode = "text";

    if (lvState.locked[i]) {
      input.value = word[i];
      input.disabled = true;
      input.classList.add(lvState.hintedIdx && lvState.hintedIdx.includes(i) ? "hinted" : "correct");
    }

    input.addEventListener("input", onLetterInput);
    input.addEventListener("keydown", onLetterKeydown);
    input.addEventListener("paste", onLetterPaste);

    lettersEl.appendChild(input);
  }

  hintBtn.disabled = allLocked(lvState, word.length);
  renderDots();
  focusFirstEmpty();
}

function allLocked(lvState, len) {
  return lvState.locked.slice(0, len).every(Boolean);
}

function getInputs() {
  return Array.from(lettersEl.querySelectorAll(".letter-box"));
}

function focusFirstEmpty() {
  const inputs = getInputs();
  const target = inputs.find((inp) => !inp.disabled && !inp.value);
  if (target) target.focus();
}

function onLetterInput(e) {
  const input = e.target;
  input.value = input.value.toUpperCase().replace(/[^А-ЯЁA-Z]/g, "");
  if (input.value) {
    const inputs = getInputs();
    const i = inputs.indexOf(input);
    const next = inputs.slice(i + 1).find((inp) => !inp.disabled);
    if (next) next.focus();
  }
}

function onLetterKeydown(e) {
  if (e.key === "Enter") {
    checkAnswer();
    return;
  }
  if (e.key === "Backspace" && !e.target.value) {
    const inputs = getInputs();
    const i = inputs.indexOf(e.target);
    const prev = [...inputs.slice(0, i)].reverse().find((inp) => !inp.disabled);
    if (prev) {
      prev.focus();
      prev.value = "";
    }
  }
}

function onLetterPaste(e) {
  e.preventDefault();
  const text = (e.clipboardData || window.clipboardData).getData("text");
  const chars = text.toUpperCase().replace(/[^А-ЯЁA-Z]/g, "").split("");
  const inputs = getInputs().filter((inp) => !inp.disabled);
  inputs.forEach((inp, i) => {
    if (chars[i]) inp.value = chars[i];
  });
  const last = inputs[Math.min(chars.length, inputs.length) - 1];
  if (last) last.focus();
}

function useHint() {
  const idx = state.currentLevel;
  const level = LEVELS[idx];
  const word = level.word.toUpperCase();
  const lvState = state.levelStates[idx];

  const remaining = [];
  for (let i = 0; i < word.length; i++) {
    if (!lvState.locked[i]) remaining.push(i);
  }
  if (remaining.length === 0) return;

  const pick = remaining[Math.floor(Math.random() * remaining.length)];
  lvState.locked[pick] = true;
  lvState.hintedIdx = lvState.hintedIdx || [];
  lvState.hintedIdx.push(pick);
  saveState();
  renderLevel();
}

function checkAnswer() {
  const idx = state.currentLevel;
  const level = LEVELS[idx];
  const word = level.word.toUpperCase();
  const lvState = state.levelStates[idx];
  const inputs = getInputs();

  let allCorrect = true;

  inputs.forEach((input, i) => {
    if (lvState.locked[i]) return; // already locked from before
    const val = (input.value || "").toUpperCase();
    if (val === word[i]) {
      lvState.locked[i] = true;
      input.disabled = true;
      input.classList.add("correct");
    } else {
      allCorrect = false;
      if (val) {
        input.classList.add("shake");
        setTimeout(() => input.classList.remove("shake"), 350);
      }
      input.value = "";
    }
  });

  // re-check fully in case some were already locked
  allCorrect = lvState.locked.slice(0, word.length).every(Boolean);

  saveState();

  if (allCorrect) {
    feedbackEl.textContent = "Верно! 🎉";
    feedbackEl.className = "feedback";
    hintBtn.disabled = true;
    checkBtn.disabled = true;
    setTimeout(() => {
      state.currentLevel += 1;
      saveState();
      checkBtn.disabled = false;
      renderLevel();
    }, 1100);
  } else {
    feedbackEl.textContent = "Почти! Попробуй ещё раз";
    feedbackEl.className = "feedback bad";
    hintBtn.disabled = allLocked(lvState, word.length);
    focusFirstEmpty();
  }
}

function showFinal() {
  gameCard.hidden = true;
  finalCard.hidden = false;
}

envelope.addEventListener("click", () => {
  envelope.classList.add("opened");
});

hintBtn.addEventListener("click", useHint);
checkBtn.addEventListener("click", checkAnswer);

resetBtn.addEventListener("click", () => {
  if (confirm("Сбросить весь прогресс?")) {
    localStorage.removeItem(STORAGE_KEY);
    state = loadState();
    finalCard.hidden = true;
    gameCard.hidden = false;
    renderLevel();
  }
});

// ====== СТАРТ ======
renderLevel();

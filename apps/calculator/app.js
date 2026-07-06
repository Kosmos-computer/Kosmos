/**
 * Calculator — retro keypad UI over os.calculator@1.
 * Styles ported from UI Experiments (Datamath + Omron 86 variants).
 */
import { createAppClient } from "/app-sdk.js";

const os = createAppClient();

const MAX_DISPLAY_LENGTH = 10;

const CALCULATOR_KEYS = [
  [
    { label: "CE", value: "ce", variant: "function" },
    { label: "÷", value: "/", variant: "operator" },
    { label: "×", value: "*", variant: "operator" },
    { label: "C", value: "c", variant: "function" },
  ],
  [
    { label: "7", value: "7", variant: "numeric" },
    { label: "8", value: "8", variant: "numeric" },
    { label: "9", value: "9", variant: "numeric" },
    { label: "−", value: "-", variant: "operator" },
  ],
  [
    { label: "4", value: "4", variant: "numeric" },
    { label: "5", value: "5", variant: "numeric" },
    { label: "6", value: "6", variant: "numeric" },
    { label: "+", value: "+", variant: "operator" },
  ],
  [
    { label: "1", value: "1", variant: "numeric" },
    { label: "2", value: "2", variant: "numeric" },
    { label: "3", value: "3", variant: "numeric" },
    { label: "+", value: "+", variant: "operator" },
  ],
  [
    { label: "0", value: "0", variant: "numeric" },
    { label: ".", value: ".", variant: "numeric" },
    null,
    { label: "=", value: "=", variant: "equals" },
  ],
];

const OMRON_CALCULATOR_KEYS = [
  [
    { label: "M±", value: "sign", variant: "function" },
    { label: "7", value: "7", variant: "numeric" },
    { label: "8", value: "8", variant: "numeric" },
    { label: "9", value: "9", variant: "numeric" },
    { label: "÷", value: "/", variant: "function" },
  ],
  [
    { label: "%", value: "%", variant: "function" },
    { label: "4", value: "4", variant: "numeric" },
    { label: "5", value: "5", variant: "numeric" },
    { label: "6", value: "6", variant: "numeric" },
    { label: "×", value: "*", variant: "function" },
  ],
  [
    { label: "CE", value: "ce", variant: "function" },
    { label: "1", value: "1", variant: "numeric" },
    { label: "2", value: "2", variant: "numeric" },
    { label: "3", value: "3", variant: "numeric" },
    { label: "−", value: "-", variant: "function" },
  ],
  [
    { label: "C", value: "c", variant: "function" },
    { label: "0", value: "0", variant: "numeric" },
    { label: ".", value: ".", variant: "numeric" },
    { label: "=", value: "=", variant: "function" },
    { label: "+", value: "+", variant: "function" },
  ],
];

const VARIANTS = [
  { id: "datamath", label: "Datamath", subtitle: "TI Datamath · LED display" },
  { id: "omron", label: "Omron 86", subtitle: "Omron 86 · VFD display" },
];

function compute(a, b, operator) {
  switch (operator) {
    case "+":
      return a + b;
    case "-":
      return a - b;
    case "*":
      return b === 0 ? Number.NaN : a * b;
    case "/":
      return b === 0 ? Number.NaN : a / b;
    default:
      return b;
  }
}

function formatResult(value) {
  if (!Number.isFinite(value)) return "Error";
  const rounded = Math.round(value * 1e10) / 1e10;
  const text = String(rounded);
  if (text.length <= MAX_DISPLAY_LENGTH) return text;
  return rounded.toPrecision(MAX_DISPLAY_LENGTH - 2).replace(/\.?0+$/, "");
}

function createCalculator(initialValue = "0") {
  const state = {
    display: initialValue,
    storedValue: null,
    operator: null,
    freshEntry: true,
  };

  function clearAll() {
    state.display = "0";
    state.storedValue = null;
    state.operator = null;
    state.freshEntry = true;
  }

  function clearEntry() {
    state.display = "0";
    state.freshEntry = true;
  }

  function inputDigit(digit) {
    if (state.freshEntry) {
      state.freshEntry = false;
      state.display = digit === "." ? "0." : digit;
      return;
    }
    if (digit === "." && state.display.includes(".")) return;
    if (state.display === "0" && digit !== ".") {
      state.display = digit;
      return;
    }
    if (state.display.length >= MAX_DISPLAY_LENGTH) return;
    state.display += digit;
  }

  function handleOperator(nextOperator) {
    const current = Number.parseFloat(state.display);
    if (state.storedValue !== null && state.operator && !state.freshEntry) {
      const result = compute(state.storedValue, current, state.operator);
      const formatted = formatResult(result);
      state.display = formatted;
      state.storedValue = Number.parseFloat(formatted);
    } else {
      state.storedValue = current;
    }
    state.operator = nextOperator;
    state.freshEntry = true;
  }

  let lastEvalExpression = null;

  function handleEquals() {
    if (state.storedValue === null || !state.operator) return;
    const current = Number.parseFloat(state.display);
    lastEvalExpression = `${state.storedValue} ${state.operator} ${current}`;
    const result = compute(state.storedValue, current, state.operator);
    state.display = formatResult(result);
    state.storedValue = null;
    state.operator = null;
    state.freshEntry = true;
  }

  function toggleSign() {
    if (state.display === "0" || state.display === "Error") return;
    state.display = state.display.startsWith("-") ? state.display.slice(1) : `-${state.display}`;
    state.freshEntry = false;
  }

  function applyPercent() {
    state.display = formatResult(Number.parseFloat(state.display) / 100);
    state.freshEntry = true;
  }

  function press(key) {
    if (key === "c") {
      clearAll();
      return;
    }
    if (key === "ce") {
      clearEntry();
      return;
    }
    if (key === "sign") {
      toggleSign();
      return;
    }
    if (key === "%") {
      applyPercent();
      return;
    }
    if (key === "=") {
      handleEquals();
      return;
    }
    if (["+", "-", "*", "/"].includes(key)) {
      handleOperator(key);
      return;
    }
    inputDigit(key);
  }

  return {
    get display() {
      return state.display;
    },
    press,
    clearAll,
    consumeLastEval() {
      const expr = lastEvalExpression;
      lastEvalExpression = null;
      return expr;
    },
  };
}

const calculatorWrap = document.getElementById("calculator-wrap");
const subtitleEl = document.getElementById("subtitle");
const variantChipsEl = document.getElementById("variant-chips");
const historyListEl = document.getElementById("history-list");
const historyEmptyEl = document.getElementById("history-empty");
const errorBox = document.getElementById("error");

let variant = "datamath";
const calc = createCalculator();

function showError(message) {
  errorBox.hidden = !message;
  errorBox.textContent = message ?? "";
}

function datamathKeyClass(key) {
  const classes = ["calc-pad__key"];
  if (key.variant === "numeric") classes.push("calc-pad__key--numeric");
  if (key.variant === "function" || key.variant === "operator") classes.push("calc-pad__key--function");
  if (key.variant === "operator") classes.push("calc-pad__key--operator");
  if (key.variant === "equals") classes.push("calc-pad__key--equals");
  return classes.join(" ");
}

function renderDatamath(onPress) {
  const pad = document.createElement("div");
  pad.className = "calc-pad";
  pad.setAttribute("role", "group");
  pad.setAttribute("aria-label", "Calculator");

  const brand = document.createElement("div");
  brand.className = "calc-pad__brand";
  brand.setAttribute("aria-hidden", "true");
  brand.innerHTML =
    '<span class="calc-pad__brand-name">Datamath</span><span class="calc-pad__brand-mark">TI</span>';
  pad.appendChild(brand);

  const display = document.createElement("div");
  display.className = "calc-pad__display";
  display.setAttribute("aria-live", "polite");
  display.setAttribute("aria-label", `Display ${calc.display}`);
  display.textContent = calc.display;
  pad.appendChild(display);

  const keypad = document.createElement("div");
  keypad.className = "calc-pad__keypad";
  const grid = document.createElement("div");
  grid.className = "calc-pad__grid";

  for (const row of CALCULATOR_KEYS) {
    for (const key of row) {
      if (key) {
        const btn = document.createElement("button");
        btn.type = "button";
        btn.className = datamathKeyClass(key);
        btn.setAttribute("aria-label", key.label);
        btn.textContent = key.label;
        btn.addEventListener("click", () => {
          onPress(key.value);
          display.textContent = calc.display;
          display.setAttribute("aria-label", `Display ${calc.display}`);
        });
        grid.appendChild(btn);
      } else {
        const spacer = document.createElement("span");
        spacer.className = "calc-pad__spacer";
        spacer.setAttribute("aria-hidden", "true");
        grid.appendChild(spacer);
      }
    }
  }

  keypad.appendChild(grid);
  pad.appendChild(keypad);
  return pad;
}

function renderOmron(onPress) {
  const pad = document.createElement("div");
  pad.className = "omron-pad";
  pad.setAttribute("role", "group");
  pad.setAttribute("aria-label", "Calculator");

  const header = document.createElement("div");
  header.className = "omron-pad__header";
  const brand = document.createElement("span");
  brand.className = "omron-pad__brand";
  brand.setAttribute("aria-hidden", "true");
  brand.textContent = "OMRON 86";
  header.appendChild(brand);
  pad.appendChild(header);

  const body = document.createElement("div");
  body.className = "omron-pad__body";

  const displayWrap = document.createElement("div");
  displayWrap.className = "omron-pad__display-wrap";

  const isNegative = calc.display.startsWith("-");
  const labels = document.createElement("div");
  labels.className = "omron-pad__display-labels";
  labels.setAttribute("aria-hidden", "true");
  labels.innerHTML = `<span class="${isNegative ? "omron-pad__display-label--active" : ""}">Minus</span><span>×10⁸</span>`;
  displayWrap.appendChild(labels);

  const display = document.createElement("div");
  display.className = "omron-pad__display";
  display.setAttribute("aria-live", "polite");
  display.setAttribute("aria-label", `Display ${calc.display}`);
  display.textContent = calc.display;
  displayWrap.appendChild(display);
  body.appendChild(displayWrap);

  const grid = document.createElement("div");
  grid.className = "omron-pad__grid";

  for (const row of OMRON_CALCULATOR_KEYS) {
    for (const key of row) {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className =
        key.variant === "numeric" ? "omron-pad__key omron-pad__key--numeric" : "omron-pad__key omron-pad__key--function";
      btn.setAttribute("aria-label", key.label);
      btn.textContent = key.label;
      btn.addEventListener("click", () => {
        onPress(key.value);
        display.textContent = calc.display;
        display.setAttribute("aria-label", `Display ${calc.display}`);
        const negative = calc.display.startsWith("-");
        labels.innerHTML = `<span class="${negative ? "omron-pad__display-label--active" : ""}">Minus</span><span>×10⁸</span>`;
      });
      grid.appendChild(btn);
    }
  }

  body.appendChild(grid);
  pad.appendChild(body);
  return pad;
}

async function logEvaluation(expression) {
  try {
    await os.intents.invoke("calculator.evaluate", { expression });
    showError(null);
  } catch (err) {
    showError(err.message);
  }
}

function handleKeyPress(key) {
  calc.press(key);
  if (key === "=") {
    const expression = calc.consumeLastEval();
    if (expression) void logEvaluation(expression);
  }
}

function renderPad() {
  calculatorWrap.replaceChildren();
  calculatorWrap.appendChild(variant === "datamath" ? renderDatamath(handleKeyPress) : renderOmron(handleKeyPress));
}

function renderVariantChips() {
  variantChipsEl.replaceChildren();
  for (const item of VARIANTS) {
    const chip = document.createElement("button");
    chip.type = "button";
    chip.className = `calc-chip${variant === item.id ? " calc-chip--active" : ""}`;
    chip.textContent = item.label;
    chip.setAttribute("aria-pressed", String(variant === item.id));
    chip.addEventListener("click", () => {
      variant = item.id;
      subtitleEl.textContent = item.subtitle;
      renderVariantChips();
      renderPad();
    });
    variantChipsEl.appendChild(chip);
  }
}

async function loadHistory() {
  try {
    const entries = await os.intents.invoke("calculator.history.list", { limit: 30 });
    historyListEl.replaceChildren();
    for (const entry of entries) {
      const li = document.createElement("li");
      li.className = "calc-history__item";
      li.innerHTML = `<div class="calc-history__expr">${escapeHtml(entry.expression)}</div><div class="calc-history__result">${escapeHtml(entry.result)}</div>`;
      historyListEl.appendChild(li);
    }
    historyEmptyEl.hidden = entries.length > 0;
    showError(null);
  } catch (err) {
    showError(err.message);
  }
}

function escapeHtml(text) {
  return String(text)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

os.events.on("calculator.changed", () => void loadHistory());

renderVariantChips();
renderPad();
void loadHistory();

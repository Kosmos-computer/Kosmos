/**
 * Calculator — Datamath / Omron / Scientific skins over os.calculator@1.
 * Scientific mode uses expression-buffer + server-side shunting-yard eval
 * (same pattern as common open-source scientific calculators).
 */
import { createAppClient } from "/app-sdk.js";

const os = createAppClient();

const MAX_DISPLAY_LENGTH = 10;

/**
 * OS titlebar height outside the iframe — must match `.arco-window__titlebar`.
 * Skin sizes are derived so the square-key grid fills the pad with no letterboxing.
 */
const WINDOW_TITLEBAR_H = 38;

/** Preferred content widths per skin (Omron is wider for its 5-column pad). */
const SKIN_CONTENT_WIDTH = {
  datamath: 400,
  omron: 500,
  scientific: 400,
};

/**
 * Outer window size for a skin at a given content width.
 * Chrome constants mirror `styles.css` (pad padding, brand, display, gaps, keypad).
 */
function windowSizeForSkin(skin, contentWidth) {
  let contentH;
  if (skin === "omron") {
    // header 64 + body pad/gap/display ≈ 178 + 4×cell keypad (5 cols, gap 12)
    const cell = (contentWidth - 88) / 5;
    contentH = 242 + 4 * cell;
  } else if (skin === "scientific") {
    // pad + display chrome ≈ 142 + 7×cell keypad (5 cols, gap 8)
    const cell = (contentWidth - 56) / 5;
    contentH = 190 + 7 * cell;
  } else {
    // pad/brand/display/keypad chrome ≈ 182 + 5×cell keypad (4 cols, gap 12)
    const cell = (contentWidth - 108) / 4;
    contentH = 230 + 5 * cell;
  }
  return {
    w: Math.round(contentWidth),
    h: Math.round(contentH + WINDOW_TITLEBAR_H),
  };
}

/** Content-only aspect (iframe / maximized internals — no OS titlebar). */
function contentAspectForSkin(skin) {
  const width = SKIN_CONTENT_WIDTH[skin] ?? SKIN_CONTENT_WIDTH.datamath;
  const size = windowSizeForSkin(skin, width);
  const contentH = size.h - WINDOW_TITLEBAR_H;
  return size.w / contentH;
}

function syncPadAspect() {
  const root = document.getElementById("app");
  root?.style.setProperty("--calc-content-aspect", String(contentAspectForSkin(variant)));
}

function syncWindowGeometry() {
  const width = SKIN_CONTENT_WIDTH[variant] ?? SKIN_CONTENT_WIDTH.datamath;
  const size = windowSizeForSkin(variant, width);
  // Outer window includes the titlebar; internals use contentAspectForSkin.
  const aspectRatio = size.w / size.h;
  syncPadAspect();
  void os.shell
    .setWindowGeometry({ aspectRatio, applySize: true, w: size.w })
    .catch(() => {
      // Standalone / missing host — ignore.
    });
}

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

/** Scientific keypad — expression-buffer actions (open-source sci-calc pattern). */
const SCIENTIFIC_KEYS = [
  [
    { label: "sin", value: "sin", variant: "fn" },
    { label: "cos", value: "cos", variant: "fn" },
    { label: "tan", value: "tan", variant: "fn" },
    { label: "π", value: "pi", variant: "fn" },
    { label: "e", value: "e", variant: "fn" },
  ],
  [
    { label: "ln", value: "ln", variant: "fn" },
    { label: "log", value: "log", variant: "fn" },
    { label: "√", value: "sqrt", variant: "fn" },
    { label: "x²", value: "square", variant: "fn" },
    { label: "xʸ", value: "^", variant: "op" },
  ],
  [
    { label: "(", value: "(", variant: "op" },
    { label: ")", value: ")", variant: "op" },
    { label: "n!", value: "!", variant: "fn" },
    { label: "÷", value: "/", variant: "op" },
    { label: "×", value: "*", variant: "op" },
  ],
  [
    { label: "7", value: "7", variant: "numeric" },
    { label: "8", value: "8", variant: "numeric" },
    { label: "9", value: "9", variant: "numeric" },
    { label: "−", value: "-", variant: "op" },
    { label: "+", value: "+", variant: "op" },
  ],
  [
    { label: "4", value: "4", variant: "numeric" },
    { label: "5", value: "5", variant: "numeric" },
    { label: "6", value: "6", variant: "numeric" },
    { label: "%", value: "%", variant: "op" },
    { label: "±", value: "sign", variant: "fn" },
  ],
  [
    { label: "1", value: "1", variant: "numeric" },
    { label: "2", value: "2", variant: "numeric" },
    { label: "3", value: "3", variant: "numeric" },
    { label: "←", value: "backspace", variant: "danger" },
    { label: "C", value: "c", variant: "danger" },
  ],
  [
    { label: "0", value: "0", variant: "numeric" },
    { label: ".", value: ".", variant: "numeric" },
    { label: "CE", value: "ce", variant: "danger" },
    { label: "1/x", value: "inv", variant: "fn" },
    { label: "=", value: "=", variant: "eq" },
  ],
];

function compute(a, b, operator) {
  switch (operator) {
    case "+":
      return a + b;
    case "-":
      return a - b;
    case "*":
      return a * b;
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

/**
 * Expression-buffer scientific calculator (OSS pattern):
 * keys append to an expression string; "=" evaluates via os.calculator@1.
 */
function createScientificCalculator() {
  const state = {
    expression: "",
    display: "0",
    justEvaluated: false,
    angleMode: "DEG",
    busy: false,
  };

  function pretty(expr) {
    return expr.replace(/\*/g, "×").replace(/\//g, "÷").replace(/-/g, "−").replace(/\^/g, "^");
  }

  function endsWithOperator(expr = state.expression) {
    return /[+\-*/%^]$/.test(expr);
  }

  function appendNumber(ch) {
    if (state.justEvaluated) {
      state.expression = ch;
      state.justEvaluated = false;
    } else if (state.expression === "0" && ch !== ".") {
      state.expression = ch;
    } else {
      state.expression += ch;
    }
    state.display = pretty(state.expression) || "0";
  }

  function appendDot() {
    if (state.justEvaluated) {
      state.expression = "0.";
      state.justEvaluated = false;
      state.display = "0.";
      return;
    }
    const parts = state.expression.split(/[+\-*/%^()]/);
    const last = parts[parts.length - 1] ?? "";
    if (last.includes(".")) return;
    if (!state.expression || endsWithOperator() || /\($/.test(state.expression)) {
      state.expression += "0.";
    } else {
      state.expression += ".";
    }
    state.display = pretty(state.expression);
  }

  function appendOperator(op) {
    if (state.justEvaluated) {
      state.expression = state.display === "Error" ? "" : `${state.display}${op}`;
      state.justEvaluated = false;
    } else if (!state.expression && op === "-") {
      state.expression = "-";
    } else if (state.expression) {
      state.expression = endsWithOperator() ? state.expression.slice(0, -1) + op : state.expression + op;
    }
    state.display = pretty(state.expression) || "0";
  }

  function appendFunction(name) {
    if (state.justEvaluated && state.display !== "Error") {
      state.expression = `${name}(${state.display})`;
      state.justEvaluated = false;
    } else if (/\d$|pi$|e$|\)$/.test(state.expression)) {
      state.expression += `*${name}(`;
    } else {
      state.expression += `${name}(`;
    }
    state.display = pretty(state.expression);
  }

  function appendConstant(name) {
    if (state.justEvaluated) {
      state.expression = name;
      state.justEvaluated = false;
    } else if (/\d$|pi$|e$|\)$/.test(state.expression)) {
      state.expression += `*${name}`;
    } else {
      state.expression += name;
    }
    state.display = pretty(state.expression);
  }

  function backspace() {
    if (state.justEvaluated) {
      state.expression = "";
      state.display = "0";
      state.justEvaluated = false;
      return;
    }
    const funcMatch = state.expression.match(/(sin|cos|tan|asin|acos|atan|log|ln|sqrt|abs)\($/);
    if (funcMatch) {
      state.expression = state.expression.slice(0, -funcMatch[0].length);
    } else {
      state.expression = state.expression.slice(0, -1);
    }
    state.display = pretty(state.expression) || "0";
  }

  function clearAll() {
    state.expression = "";
    state.display = "0";
    state.justEvaluated = false;
  }

  function toggleSign() {
    if (state.justEvaluated && state.display !== "Error") {
      if (state.display.startsWith("-")) state.display = state.display.slice(1);
      else if (state.display !== "0") state.display = `-${state.display}`;
      state.expression = state.display;
      return;
    }
    if (!state.expression) {
      state.expression = "-";
      state.display = "−";
      return;
    }
    const match = state.expression.match(/^(.*?)(-?\d+\.?\d*(?:[eE][+-]?\d+)?|pi|e)$/);
    if (!match) return;
    const head = match[1];
    const tail = match[2];
    if (tail.startsWith("-")) state.expression = head + tail.slice(1);
    else state.expression = `${head}-${tail}`;
    state.display = pretty(state.expression);
  }

  async function evaluate() {
    if (!state.expression || state.busy) return;
    let expr = state.expression;
    const opens = (expr.match(/\(/g) || []).length;
    const closes = (expr.match(/\)/g) || []).length;
    for (let i = 0; i < opens - closes; i += 1) expr += ")";

    state.busy = true;
    try {
      const entry = await os.intents.invoke("calculator.evaluate", {
        expression: expr,
        angleMode: state.angleMode,
      });
      state.display = entry.result;
      state.expression = entry.result === "Error" ? "" : entry.result;
      state.justEvaluated = true;
      showError(null);
    } catch (err) {
      state.display = "Error";
      state.justEvaluated = true;
      showError(err.message);
    } finally {
      state.busy = false;
    }
  }

  async function press(key) {
    if (state.busy && key !== "c") return;

    if (/^\d$/.test(key)) {
      appendNumber(key);
      return;
    }
    if (key === ".") {
      appendDot();
      return;
    }
    if (["+", "-", "*", "/", "%", "^"].includes(key)) {
      appendOperator(key);
      return;
    }
    if (key === "(") {
      if (state.justEvaluated) {
        state.expression = "(";
        state.justEvaluated = false;
      } else if (/\d$|pi$|e$|\)$/.test(state.expression)) {
        state.expression += "*(";
      } else {
        state.expression += "(";
      }
      state.display = pretty(state.expression);
      return;
    }
    if (key === ")") {
      const opens = (state.expression.match(/\(/g) || []).length;
      const closes = (state.expression.match(/\)/g) || []).length;
      if (opens > closes) {
        state.expression += ")";
        state.display = pretty(state.expression);
      }
      return;
    }
    if (["sin", "cos", "tan", "asin", "acos", "atan", "log", "ln", "sqrt", "abs"].includes(key)) {
      appendFunction(key);
      return;
    }
    if (key === "pi" || key === "e") {
      appendConstant(key);
      return;
    }
    if (key === "square") {
      if (state.justEvaluated && state.display !== "Error") {
        state.expression = `(${state.display})^2`;
        state.justEvaluated = false;
      } else if (state.expression) {
        state.expression = `(${state.expression})^2`;
      }
      state.display = pretty(state.expression) || "0";
      return;
    }
    if (key === "inv") {
      if (state.justEvaluated && state.display !== "Error") {
        state.expression = `1/(${state.display})`;
        state.justEvaluated = false;
      } else if (state.expression) {
        state.expression = `1/(${state.expression})`;
      }
      state.display = pretty(state.expression) || "0";
      return;
    }
    if (key === "!") {
      if (state.justEvaluated && state.display !== "Error") {
        state.expression = `${state.display}!`;
        await evaluate();
        return;
      }
      if (/[\d)]$/.test(state.expression)) {
        state.expression += "!";
        state.display = pretty(state.expression);
      }
      return;
    }
    if (key === "sign") {
      toggleSign();
      return;
    }
    if (key === "backspace") {
      backspace();
      return;
    }
    if (key === "c" || key === "ce") {
      clearAll();
      return;
    }
    if (key === "=") {
      await evaluate();
    }
  }

  return {
    get display() {
      return state.display;
    },
    get expression() {
      return pretty(state.expression);
    },
    get angleMode() {
      return state.angleMode;
    },
    toggleAngleMode() {
      state.angleMode = state.angleMode === "DEG" ? "RAD" : "DEG";
    },
    press,
    clearAll,
  };
}

const appEl = document.getElementById("app");
const calculatorWrap = document.getElementById("calculator-wrap");
const menuToggle = document.getElementById("menu-toggle");
const menuPanel = document.getElementById("menu-panel");
const historyToggle = document.getElementById("history-toggle");
const historyPanel = document.getElementById("history-panel");
const historyClose = document.getElementById("history-close");
const historyListEl = document.getElementById("history-list");
const historyEmptyEl = document.getElementById("history-empty");
const errorBox = document.getElementById("error");
const skinButtons = Array.from(menuPanel.querySelectorAll("[data-skin]"));

let variant = "datamath";
let historyOpen = false;
const calc = createCalculator();
const sci = createScientificCalculator();

function showError(message) {
  errorBox.hidden = !message;
  errorBox.textContent = message ?? "";
}

function setMenuOpen(open) {
  menuPanel.hidden = !open;
  menuToggle.setAttribute("aria-expanded", String(open));
}

function setHistoryOpen(open) {
  historyOpen = open;
  historyPanel.hidden = !open;
  historyToggle.setAttribute("aria-checked", String(open));
  historyToggle.textContent = open ? "Hide history" : "Show history";
  if (open) void loadHistory();
}

function syncSkinMenu() {
  for (const btn of skinButtons) {
    btn.setAttribute("aria-checked", String(btn.dataset.skin === variant));
  }
  appEl.classList.toggle("calc-workspace--datamath", variant === "datamath");
  appEl.classList.toggle("calc-workspace--omron", variant === "omron");
  appEl.classList.toggle("calc-workspace--scientific", variant === "scientific");
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

  const keypad = document.createElement("div");
  keypad.className = "omron-pad__keypad";

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

  keypad.appendChild(grid);
  body.appendChild(keypad);
  pad.appendChild(body);
  return pad;
}

function renderScientific() {
  const pad = document.createElement("div");
  pad.className = "sci-pad";
  pad.setAttribute("role", "group");
  pad.setAttribute("aria-label", "Scientific calculator");

  const display = document.createElement("div");
  display.className = "sci-pad__display";

  const meta = document.createElement("div");
  meta.className = "sci-pad__meta";

  const modeBtn = document.createElement("button");
  modeBtn.type = "button";
  modeBtn.className = "sci-pad__mode";
  modeBtn.textContent = sci.angleMode;
  modeBtn.setAttribute("aria-label", `Angle mode ${sci.angleMode}`);
  modeBtn.addEventListener("click", () => {
    sci.toggleAngleMode();
    modeBtn.textContent = sci.angleMode;
    modeBtn.setAttribute("aria-label", `Angle mode ${sci.angleMode}`);
  });

  const brand = document.createElement("span");
  brand.className = "sci-pad__brand";
  brand.textContent = "Scientific";
  meta.append(modeBtn, brand);

  const exprEl = document.createElement("div");
  exprEl.className = "sci-pad__expression";
  exprEl.textContent = sci.expression || " ";

  const resultEl = document.createElement("div");
  resultEl.className = "sci-pad__result";
  resultEl.setAttribute("aria-live", "polite");
  resultEl.textContent = sci.display;

  display.append(meta, exprEl, resultEl);
  pad.appendChild(display);

  function refresh() {
    exprEl.textContent = sci.expression || " ";
    resultEl.textContent = sci.display;
    resultEl.classList.toggle("sci-pad__result--error", sci.display === "Error");
  }

  const keypad = document.createElement("div");
  keypad.className = "sci-pad__keypad";
  const grid = document.createElement("div");
  grid.className = "sci-pad__grid";

  for (const row of SCIENTIFIC_KEYS) {
    for (const key of row) {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = [
        "sci-pad__key",
        key.variant === "fn" && "sci-pad__key--fn",
        key.variant === "op" && "sci-pad__key--op",
        key.variant === "eq" && "sci-pad__key--eq",
        key.variant === "danger" && "sci-pad__key--danger",
      ]
        .filter(Boolean)
        .join(" ");
      btn.setAttribute("aria-label", key.label);
      btn.textContent = key.label;
      btn.addEventListener("click", () => {
        void sci.press(key.value).then(refresh);
        refresh();
      });
      grid.appendChild(btn);
    }
  }

  keypad.appendChild(grid);
  pad.appendChild(keypad);
  refresh();
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
  if (variant === "scientific") {
    calculatorWrap.appendChild(renderScientific());
  } else if (variant === "omron") {
    calculatorWrap.appendChild(renderOmron(handleKeyPress));
  } else {
    calculatorWrap.appendChild(renderDatamath(handleKeyPress));
  }
  syncSkinMenu();
  syncWindowGeometry();
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

menuToggle.addEventListener("click", (event) => {
  event.stopPropagation();
  setMenuOpen(menuPanel.hidden);
});

for (const btn of skinButtons) {
  btn.addEventListener("click", () => {
    const next = btn.dataset.skin;
    variant = next === "omron" || next === "scientific" ? next : "datamath";
    if (variant !== "scientific") calc.clearAll();
    else sci.clearAll();
    setMenuOpen(false);
    renderPad();
  });
}

historyToggle.addEventListener("click", () => {
  setHistoryOpen(!historyOpen);
  setMenuOpen(false);
});

historyClose.addEventListener("click", () => setHistoryOpen(false));

document.addEventListener("click", (event) => {
  if (!menuPanel.hidden && !menuToggle.contains(event.target) && !menuPanel.contains(event.target)) {
    setMenuOpen(false);
  }
});

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") {
    if (!menuPanel.hidden) setMenuOpen(false);
    else if (historyOpen) setHistoryOpen(false);
  }
});

os.events.on("calculator.changed", () => {
  if (historyOpen) void loadHistory();
});

renderPad();

import {
  createIcons,
  Keyboard,
  ArrowRight,
  RotateCcw,
  Download,
  Settings2,
  Pause,
  Play,
  Check,
  Activity,
} from "lucide";
import { categories, getPool } from "./keyboard/definitions.js";
import { Session, generateSequence } from "./session.js";
import { calculateStats, exportSession, toCSV } from "./analytics.js";
import "./style.css";

const app = document.querySelector("#app");
let settings = {
    trials: 20,
    categories: Object.keys(categories),
    uppercase: false,
  },
  session = null,
  frame = 0,
  sortField = "trialIndex",
  ascending = true;
const esc = (value) =>
  String(value).replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ],
  );
const ms = (n) => `${Math.round(n).toLocaleString()} ms`;
const icon = (name) => `<i data-lucide="${name}" aria-hidden="true"></i>`;
function shell(content, state = "SETUP") {
  app.innerHTML = `<header><a href="/" class="brand">${icon("keyboard")}<span>Key <b>/</b> Lab</span></a><span class="header-label">KEYBOARD REACTION TEST</span><span class="state"><span></span>${state}</span></header><main>${content}</main><footer><span>KEY / LAB</span><span>Physical keyboard study <b>·</b> Kedmanee + QWERTY</span><span>Local session</span></footer>`;
  createIcons({
    icons: {
      Keyboard,
      ArrowRight,
      RotateCcw,
      Download,
      Settings2,
      Pause,
      Play,
      Check,
      Activity,
    },
  });
}
function setup() {
  cancelAnimationFrame(frame);
  session = null;
  shell(
    `<div class="page-title"><span class="eyebrow">NEW SESSION</span><h1>Keyboard reaction test</h1></div><form id="setup"><section class="setup-section"><div><span class="step">01</span><h2>Trial count</h2></div><div><div class="presets">${[10, 20, 30, 50, 100].map((n) => `<button type="button" data-count="${n}" aria-pressed="${settings.trials === n}">${n}</button>`).join("")}</div><label class="custom">Custom <input id="trials" type="number" min="1" max="500" step="1" required value="${settings.trials}"><span>1–500 trials</span></label></div></section><section class="setup-section"><div><span class="step">02</span><h2>Key categories</h2></div><div class="categories">${Object.entries(
      categories,
    )
      .map(
        ([id, label]) =>
          `<label class="category"><input type="checkbox" name="category" value="${id}" ${settings.categories.includes(id) ? "checked" : ""}><span>${label}</span><span class="category-sample">${{ thai: "ก ฐ ภ", english: "a b c", number: "1 2 3", symbol: "[ + ?", function: "F1–F12", editing: "Tab / Delete", navigation: "Home / End", modifier: "Shift / Ctrl" }[id]}</span></label>`,
      )
      .join(
        "",
      )}</div></section><section class="setup-section"><div><span class="step">03</span><h2>English letter case</h2></div><label class="custom"><select id="case"><option value="lower" ${!settings.uppercase ? "selected" : ""}>Lowercase</option><option value="upper" ${settings.uppercase ? "selected" : ""}>Uppercase</option></select></label></section><p id="validation" role="alert"></p>${matchMedia("(pointer: coarse)").matches ? '<p class="notice">This test is designed for a physical keyboard. For reliable results, use a desktop or laptop computer.</p>' : ""}<div class="setup-bottom"><span id="pool-count"></span><button class="primary" type="submit">Prepare test ${icon("arrow-right")}</button></div></form>`,
  );
  const update = () => {
    const enabled = [...app.querySelectorAll("[name=category]:checked")].map(
      (e) => e.value,
    );
    app.querySelector("#pool-count").textContent =
      `${getPool(enabled).length} targets available`;
    app
      .querySelectorAll("[data-count]")
      .forEach((b) =>
        b.setAttribute(
          "aria-pressed",
          String(
            Number(b.dataset.count) ===
              Number(app.querySelector("#trials").value),
          ),
        ),
      );
  };
  app.querySelectorAll("[data-count]").forEach(
    (b) =>
      (b.onclick = () => {
        app.querySelector("#trials").value = b.dataset.count;
        update();
      }),
  );
  app.querySelector("#setup").oninput = update;
  update();
  app.querySelector("#setup").onsubmit = (e) => {
    e.preventDefault();
    const trials = Number(app.querySelector("#trials").value),
      enabled = [...app.querySelectorAll("[name=category]:checked")].map(
        (e) => e.value,
      );
    if (
      !Number.isInteger(trials) ||
      trials < 1 ||
      trials > 500 ||
      !enabled.length
    ) {
      app.querySelector("#validation").textContent =
        "Choose 1–500 trials and at least one category.";
      return;
    }
    settings = {
      trials,
      categories: enabled,
      uppercase: app.querySelector("#case").value === "upper",
    };
    ready();
  };
}
function ready() {
  session = new Session(
    generateSequence(
      getPool(settings.categories, settings.uppercase),
      settings.trials,
    ),
    structuredClone(settings),
  );
  shell(
    `<div class="test-stage"><span class="eyebrow">READY WHEN YOU ARE</span><h1>Keyboard reaction test</h1><div class="ready-count">${settings.trials}<span>keys</span></div><p>Press any key to start</p><button id="settings" class="quiet">${icon("settings-2")} Change settings</button></div>`,
    "READY",
  );
  app.querySelector("#settings").onclick = setup;
  document.activeElement?.blur();
}
function running() {
  shell(
    `<div class="trial-top"><span>Trial <strong>${session.index + 1}</strong> / ${session.sequence.length}</span><button id="pause" class="icon-button" title="Pause test" aria-label="Pause test">${icon("pause")}</button></div><progress max="${session.sequence.length}" value="${session.index}"></progress><div class="test-stage active"><span class="eyebrow">TARGET KEY</span><div id="target" class="target ${session.target.display.length > 3 ? "long" : ""}" aria-live="polite">${esc(session.target.display)}</div><p>Press the indicated key</p><div id="feedback" role="status"></div></div>`,
    "RUNNING",
  );
  app.querySelector("#pause").onclick = pause;
  // DOM is updated synchronously. Arm timing at the next rendering opportunity.
  frame = requestAnimationFrame(() => session?.markShown());
}
function pause() {
  if (session?.state !== "RUNNING") return;
  cancelAnimationFrame(frame);
  session.pause();
  shell(
    `<div class="test-stage"><span class="eyebrow">SESSION PAUSED</span><h1>Take your time.</h1><p>Trial ${session.index + 1} / ${session.sequence.length}</p><button id="resume" class="primary">${icon("play")} Continue test</button><button id="discard" class="quiet">${icon("settings-2")} Change settings</button></div>`,
    "PAUSED",
  );
  app.querySelector("#resume").onclick = () => {
    session.resume();
    running();
  };
  app.querySelector("#discard").onclick = setup;
}
function download(type) {
  const blob = new Blob(
      [
        type === "csv"
          ? toCSV(session)
          : JSON.stringify(exportSession(session), null, 2),
      ],
      { type: type === "csv" ? "text/csv;charset=utf-8" : "application/json" },
    ),
    url = URL.createObjectURL(blob),
    a = document.createElement("a");
  a.href = url;
  a.download = `keyboard-${session.id}.${type}`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
function results() {
  const s = calculateStats(session.results),
    mistakes = [...s.byKey]
      .filter((k) => k.errors)
      .sort((a, b) => b.errors - a.errors);
  shell(
    `<div class="results-title"><div><span class="eyebrow">SESSION COMPLETE</span><h1>Your results</h1><p>${session.results.length} trials <b>·</b> ${new Date(session.startedAt).toLocaleString()}</p></div><button id="again" class="primary">${icon("rotate-ccw")} Test again</button></div><section class="metrics">${[
      ["Average", ms(s.average)],
      ["Median", ms(s.median)],
      ["Accuracy", `${s.accuracy.toFixed(1)}%`],
      ["Incorrect presses", s.errors],
      ["Fastest", ms(s.fastest)],
      ["Slowest", ms(s.slowest)],
      ["Test duration", `${(session.durationMs / 1000).toFixed(1)} s`],
      ["Hesitation trials", s.hesitations.length],
    ]
      .map(
        ([label, value]) =>
          `<div><span>${label}</span><strong>${value}</strong></div>`,
      )
      .join(
        "",
      )}</section><div class="analysis-grid"><section><h2>Reaction time by key</h2><div class="bars">${s.byKey.map((k) => `<div class="bar-row"><span>${esc(k.label)}</span><div><div style="width:${Math.max(1, (k.averageMs / s.slowest) * 100)}%"></div></div><strong>${ms(k.averageMs)}</strong></div>`).join("")}</div></section><section><h2>Performance by category</h2><table><thead><tr><th>Category</th><th>Average</th><th>Errors</th></tr></thead><tbody>${s.byCategory.map((c) => `<tr><td>${categories[c.id]}</td><td>${ms(c.averageMs)}</td><td>${c.errors}</td></tr>`).join("")}</tbody></table><h2 class="subheading">Most mistaken keys</h2>${
      mistakes.length
        ? `<ul class="mistakes">${mistakes
            .slice(0, 8)
            .map(
              (k) =>
                `<li><span>${esc(k.label)}</span><strong>${k.errors} errors</strong></li>`,
            )
            .join("")}</ul>`
        : '<p class="muted">No incorrect presses.</p>'
    }</section></div><section class="result-section"><h2>Hesitation analysis</h2><p class="muted">Threshold: ${ms(s.threshold)} = max(1,000 ms, median + population standard deviation).</p><div class="table-scroll"><table><thead><tr><th>Key</th><th>Reaction time</th><th>Above median</th><th>Errors</th></tr></thead><tbody>${s.hesitations.map((r) => `<tr><td>${esc(r.displayedTarget)}</td><td>${ms(r.reactionTimeMs)}</td><td>+${ms(r.reactionTimeMs - s.median)}</td><td>${r.errorCount}</td></tr>`).join("") || '<tr><td colspan="4">No trials exceeded the threshold.</td></tr>'}</tbody></table></div></section><section class="result-section"><div class="section-header"><h2>All trials</h2><div class="actions"><button id="csv">${icon("download")} CSV</button><button id="json">${icon("download")} JSON</button></div></div><div class="table-scroll"><table id="trials-table"><thead><tr>${[
      ["trialIndex", "#"],
      ["displayedTarget", "Target"],
      ["category", "Category"],
      ["reactionTimeMs", "Reaction time"],
      ["errorCount", "Errors"],
    ]
      .map(
        ([field, label]) =>
          `<th aria-sort="${field === sortField ? (ascending ? "ascending" : "descending") : "none"}"><button class="sort" data-sort="${field}">${label} ${field === sortField ? (ascending ? "↑" : "↓") : "↕"}</button></th>`,
      )
      .join(
        "",
      )}<th>Incorrect keys</th><th>Status</th></tr></thead><tbody id="trial-rows"></tbody></table></div><p class="muted">Accuracy = correct responses / (correct responses + incorrect presses). Interrupted attempts are excluded from scores and retained in JSON. Duration includes pauses.</p></section><div class="results-bottom"><span class="muted session-id">Session ${session.id}</span><button id="settings">${icon("settings-2")} Change settings</button></div>`,
    "COMPLETED",
  );
  const rows = () => {
    const ordered = [...session.results].sort(
      (a, b) =>
        (typeof a[sortField] === "number"
          ? a[sortField] - b[sortField]
          : a[sortField].localeCompare(b[sortField])) * (ascending ? 1 : -1),
    );
    app.querySelector("#trial-rows").innerHTML = ordered
      .map(
        (r) =>
          `<tr><td>${r.trialIndex}</td><td class="table-target">${esc(r.displayedTarget)}</td><td>${categories[r.category]}</td><td>${ms(r.reactionTimeMs)}</td><td>${r.errorCount}</td><td>${r.incorrectAttempts.map((a) => esc(`${a.shiftKey ? "Shift+" : ""}${a.code}`)).join(", ") || "—"}</td><td><span class="status ${r.reactionTimeMs > s.threshold ? "hesitant" : ""}">${r.reactionTimeMs > s.threshold ? "Hesitation" : "Normal"}${r.resumed ? " · Resumed" : ""}</span></td></tr>`,
      )
      .join("");
  };
  rows();
  app.querySelectorAll("[data-sort]").forEach(
    (b) =>
      (b.onclick = () => {
        ascending = sortField === b.dataset.sort ? !ascending : true;
        sortField = b.dataset.sort;
        results();
      }),
  );
  app.querySelector("#again").onclick = ready;
  app.querySelector("#settings").onclick = setup;
  app.querySelector("#csv").onclick = () => download("csv");
  app.querySelector("#json").onclick = () => download("json");
}
function onKey(event) {
  if (!["READY", "RUNNING"].includes(session?.state)) return;
  event.preventDefault();
  const outcome = session.input(event);
  if (["started", "correct"].includes(outcome)) running();
  else if (outcome === "completed") results();
  else if (outcome === "incorrect") {
    const feedback = app.querySelector("#feedback");
    feedback.textContent = "Incorrect";
    feedback.classList.remove("flash");
    void feedback.offsetWidth;
    feedback.classList.add("flash");
  }
}
window.addEventListener("keydown", onKey, { capture: true });
window.addEventListener("blur", pause);
const onVisibility = () => {
  if (document.hidden) pause();
};
document.addEventListener("visibilitychange", onVisibility);
if (import.meta.hot)
  import.meta.hot.dispose(() => {
    window.removeEventListener("keydown", onKey, true);
    window.removeEventListener("blur", pause);
    document.removeEventListener("visibilitychange", onVisibility);
    cancelAnimationFrame(frame);
  });
setup();

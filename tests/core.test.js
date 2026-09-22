import { test } from "node:test";
import assert from "node:assert/strict";
import { allKeys, getPool } from "../src/keyboard/definitions.js";
import { thaiKeys } from "../src/keyboard/thaiKedmanee.js";
import { matchesTarget, isModifierPrelude } from "../src/keyboard/matcher.js";
import { Session, generateSequence } from "../src/session.js";
import { createSessionId } from "../src/sessionId.js";

test("session IDs support native UUID and HTTP crypto without randomUUID", () => {
  assert.equal(createSessionId({ randomUUID: () => "native-id" }), "native-id");
  const cryptoApi = { getRandomValues: bytes => crypto.getRandomValues(bytes) };
  const ids = Array.from({length: 100}, () => createSessionId(cryptoApi));
  assert.equal(new Set(ids).size, ids.length);
  for (const id of ids) assert.match(id, /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
});
import {
  average,
  median,
  calculateStats,
  toCSV,
  exportSession,
} from "../src/analytics.js";
const target = (display) =>
  allKeys.find((k) => k.display === display && k.category !== "thai");

test("skip and reveal retain mistakes, answers and exclude assisted timing", () => {
  let now = 0;
  const s = new Session([target("+"), target("F5"), target("7")], {categories: ["symbol", "function", "number"]}, () => now);
  assert.equal(s.skip(), "ignored");
  s.start(); s.markShown();
  now = 100; s.input(event("Equal")); s.input(event("Equal"));
  s.reveal();
  now = 200; s.reveal();
  assert.equal(s.revealedAt, 100);
  s.pause(); s.resume(); s.markShown();
  now = 250; s.input(event("Equal", true));
  assert.equal(s.results[0].assisted, true);
  assert.equal(s.results[0].invalidatedAttempts[0].incorrectAttempts.length, 2);
  assert.match(s.results[0].expectedAnswer, /Shift \+ Equal/);
  s.markShown(); s.input(event("F4")); s.input(event("F4")); now = 500; s.skip();
  assert.equal(s.results[1].reactionTimeMs, null);
  assert.equal(s.results[1].incorrectSummary[0].count, 2);
  assert.equal(s.results[1].skipped, true);
  s.markShown(); now = 800; s.input(event("Digit7"));
  const stats = calculateStats(s.results);
  assert.equal(stats.average, 300);
  assert.equal(stats.skipped, 1);
  assert.equal(stats.assisted, 1);
  assert.equal(stats.validCount, 1);
  assert.ok(toCSV(s).includes("expected_answer"));
  assert.equal(exportSession(s).schemaVersion, 2);
});

test("all-skipped session completes without fabricated reaction statistics", () => {
  const s = new Session([target("F5")], {categories: ["function"]});
  s.start(); s.markShown();
  assert.equal(s.skip(), "completed");
  assert.equal(calculateStats(s.results).average, null);
  assert.equal(calculateStats(s.results).hesitations.length, 0);
});
const event = (code, shiftKey = false, extra = {}) => ({
  code,
  key: code,
  shiftKey,
  ctrlKey: false,
  altKey: false,
  metaKey: false,
  ...extra,
});
test("required initial pool and all mappings are present and unique", () => {
  for (const display of [
    "F5",
    "=",
    "[",
    "Backspace",
    "Delete",
    "Shift",
    "+",
    "7",
    "]",
  ])
    assert.ok(target(display));
  assert.equal(new Set(allKeys.map((k) => k.id)).size, allKeys.length);
  assert.equal(thaiKeys.length, 94);
  assert.ok(allKeys.every((k) => k.display && k.code));
});
test("physical matching and exact modifiers", () => {
  for (const [display, code, shift, expected] of [
    ["F5", "F5", false, true],
    ["F5", "F4", false, false],
    ["=", "Equal", false, true],
    ["=", "Equal", true, false],
    ["+", "Equal", true, true],
    ["+", "Equal", false, false],
    ["[", "BracketLeft", false, true],
    ["]", "BracketRight", false, true],
    ["7", "Digit7", false, true],
    ["Backspace", "Backspace", false, true],
    ["Delete", "Delete", false, true],
  ])
    assert.equal(matchesTarget(event(code, shift), target(display)), expected);
  assert.equal(
    matchesTarget(event("F5", false, { ctrlKey: true }), target("F5")),
    false,
  );
});

test("Home End PageUp PageDown accept either Num Lock layer; other navigation keeps layer checks", () => {
  const mappings = {Home: "Numpad7", End: "Numpad1", PageUp: "Numpad9", PageDown: "Numpad3", ArrowUp: "Numpad8", ArrowDown: "Numpad2", ArrowLeft: "Numpad4", ArrowRight: "Numpad6", Delete: "NumpadDecimal"};
  for (const [display, code] of Object.entries(mappings)) {
    assert.ok(matchesTarget(event(code, false, {key: display}), target(display)));
    assert.equal(matchesTarget(event(code, false, {key: code === "NumpadDecimal" ? "." : code.at(-1)}), target(display)), ["Home", "End", "PageUp", "PageDown"].includes(display));
    assert.equal(matchesTarget(event("Numpad0", false, {key: display}), target(display)), false);
    assert.equal(matchesTarget(event(code, false, {key: display, ctrlKey: true}), target(display)), false);
  }
});

test("numpad digits, operators and Enter have their own modifier requirements", () => {
  for (const digit of "0123456789") {
    assert.ok(matchesTarget(event(`Numpad${digit}`, false, {key: digit}), target(digit)));
    assert.equal(matchesTarget(event(`Numpad${digit}`, false, {key: "Home"}), target(digit)), false);
  }
  for (const [display, code] of [["+", "NumpadAdd"], ["-", "NumpadSubtract"], ["*", "NumpadMultiply"], ["/", "NumpadDivide"], [".", "NumpadDecimal"], ["Enter", "NumpadEnter"]]) {
    assert.ok(matchesTarget(event(code, false, {key: display}), target(display)));
    assert.equal(matchesTarget(event(code, true, {key: display}), target(display)), false);
  }
  assert.equal(matchesTarget(event("NumpadDecimal", false, {key: "Delete"}), target(".")), false);
  assert.equal(matchesTarget(event("Numpad7", false, {key: "7"}), thaiKeys.find(k => k.display === "ก")), false);
});
test("Thai ignores generated character and requires correct Shift layer", () => {
  const ko = thaiKeys.find((k) => k.display === "ก"),
    tho = thaiKeys.find((k) => k.display === "ฐ");
  for (const key of ["d", "ก", "Unidentified"])
    assert.ok(matchesTarget(event("KeyD", false, { key }), ko));
  assert.ok(matchesTarget(event("BracketLeft", true), tho));
  assert.equal(matchesTarget(event("BracketLeft"), tho), false);
});
test("modifier targets and preludes", () => {
  for (const code of ["ShiftLeft", "ShiftRight"])
    assert.ok(matchesTarget(event(code, true), target("Shift")));
  assert.ok(
    matchesTarget(
      event("ControlRight", false, { ctrlKey: true }),
      target("Ctrl"),
    ),
  );
  assert.ok(
    matchesTarget(event("AltLeft", false, { altKey: true }), target("Alt")),
  );
  assert.ok(isModifierPrelude(event("ShiftLeft", true), target("+")));
  assert.equal(isModifierPrelude(event("ShiftLeft", true), target("=")), false);
});

test("mai taikhu accepts Shift H regardless of OS language and logs numpad state", () => {
  const mark = thaiKeys.find(k => k.display === "็");
  assert.equal(mark.code, "KeyH");
  assert.equal(mark.shiftRequired, true);
  for (const key of ["H", "็", "Process"]) {
    const s = new Session([mark], {});
    s.start(); s.markShown();
    assert.equal(s.input(event("ShiftLeft", true)), "prelude");
    assert.equal(s.input(event("KeyH", true, {key})), "completed");
    assert.equal(s.results[0].errorCount, 0);
  }
  const s = new Session([target("Home")], {});
  assert.equal(s.input(event("NumLock")), "ignored");
  assert.equal(s.state, "READY");
  s.start(); s.markShown();
  assert.equal(s.input(event("NumLock")), "ignored");
  assert.equal(s.input(event("Numpad7", false, {key: "Home", location: 3, getModifierState: () => false})), "completed");
  assert.equal(s.results[0].errorCount, 0);
  assert.equal(s.results[0].timeline[0].location, 3);
});
test("session excludes start, repeats, and pre-render input; errors retain timer", () => {
  let now = 0;
  const s = new Session(
    [target("+"), target("F5")],
    { categories: ["symbol", "function"] },
    () => now,
  );
  assert.equal(s.input(event("Equal", true)), "started");
  assert.equal(s.results.length, 0);
  assert.equal(s.input(event("Equal", true)), "ignored");
  now = 100;
  s.markShown();
  now = 200;
  assert.equal(s.input(event("ShiftLeft", true)), "prelude");
  assert.equal(s.input(event("Equal", false, { repeat: true })), "ignored");
  now = 350;
  assert.equal(s.input(event("Minus")), "incorrect");
  assert.equal(s.shownAt, 100);
  now = 700;
  s.input(event("Equal", true));
  assert.equal(s.results[0].reactionTimeMs, 600);
  assert.equal(s.results[0].errorCount, 1);
  assert.equal(s.results[0].timeline.length, 3);
  assert.equal(s.results[0].incorrectAttempts[0].timeFromTargetMs, 250);
  now = 710;
  s.markShown();
  now = 1000;
  s.input(event("F5"));
  assert.equal(s.state, "COMPLETED");
});
test("pause archives invalid attempt and resumes with a fresh clock", () => {
  let now = 0;
  const s = new Session([target("F5")], {}, () => now);
  s.start();
  s.markShown();
  now = 50;
  s.input(event("F4"));
  s.pause();
  now = 5000;
  s.resume();
  s.markShown();
  now = 5300;
  s.input(event("F5"));
  assert.equal(s.results[0].reactionTimeMs, 300);
  assert.equal(s.results[0].errorCount, 0);
  assert.equal(s.results[0].invalidatedAttempts[0].incorrectAttempts.length, 1);
  assert.equal(s.results[0].resumed, true);
});
test("analytics, population SD, hesitation and empty results", () => {
  assert.equal(average([100, 200, 300]), 200);
  assert.equal(median([4, 1, 3, 2]), 2.5);
  assert.equal(median([4, 1, 3]), 3);
  assert.equal(median([]), 0);
  const s = calculateStats(
    [100, 200, 300, 2400].map((reactionTimeMs, i) => ({
      reactionTimeMs,
      errorCount: i === 0 ? 2 : 0,
      targetId: String(i),
      displayedTarget: String(i),
      category: "english",
    })),
  );
  assert.equal(s.average, 750);
  assert.equal(s.median, 250);
  assert.equal(s.hesitations.length, 1);
  assert.equal(s.accuracy, (4 / 6) * 100);
  assert.equal(calculateStats([]).accuracy, 0);
});
test("balanced randomization, no consecutive duplicates, valid count", () => {
  const pool = getPool(["thai", "english", "modifier"]);
  for (let repeat = 0; repeat < 20; repeat++) {
    const seq = generateSequence(pool, 500);
    assert.equal(seq.length, 500);
    assert.ok(seq.every((k, i) => !i || k.id !== seq[i - 1].id));
    const counts = Object.values(Object.groupBy(seq, (k) => k.category)).map(
      (a) => a.length,
    );
    assert.ok(Math.max(...counts) - Math.min(...counts) <= 1);
  }
  assert.equal(generateSequence([target("F5")], 3).length, 3);
  assert.throws(() => generateSequence([], 2));
  assert.throws(() => generateSequence(pool, 1.5));
  assert.throws(() => generateSequence(pool, 501));
});
test("UTF-8 CSV, escaping, metadata and full JSON timeline", () => {
  let now = 0;
  const s = new Session([target("+")], { categories: ["symbol"] }, () => now);
  s.start();
  s.markShown();
  now = 20;
  s.input(event("Equal", true));
  const csv = toCSV(s);
  assert.ok(csv.startsWith("\uFEFF"));
  assert.ok(csv.includes('"\'+"'));
  assert.ok(csv.includes("session_id"));
  assert.equal(exportSession(s).trials[0].timeline[0].outcome, "correct");
});

import { test } from "node:test";
import assert from "node:assert/strict";
import { allKeys, getPool } from "../src/keyboard/definitions.js";
import { thaiKeys } from "../src/keyboard/thaiKedmanee.js";
import { matchesTarget, isModifierPrelude } from "../src/keyboard/matcher.js";
import { Session, generateSequence } from "../src/session.js";
import {
  average,
  median,
  calculateStats,
  toCSV,
  exportSession,
} from "../src/analytics.js";
const target = (display) =>
  allKeys.find((k) => k.display === display && k.category !== "thai");
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

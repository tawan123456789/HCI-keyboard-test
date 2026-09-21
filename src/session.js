import { matchesTarget, isModifierPrelude } from "./keyboard/matcher.js";
import { createSessionId } from "./sessionId.js";
const shuffle = (items, rng) => {
  const a = [...items];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};
export function generateSequence(pool, count, rng = Math.random) {
  if (!pool.length || !Number.isInteger(count) || count < 1 || count > 500)
    throw new Error("Choose 1-500 trials and at least one category.");
  const groups = Object.groupBy(pool, (k) => k.category),
    bags = {},
    sequence = [];
  while (sequence.length < count)
    for (const category of shuffle(Object.keys(groups), rng)) {
      if (sequence.length === count) break;
      if (!bags[category]?.length)
        bags[category] = shuffle(groups[category], rng);
      const bag = bags[category];
      if (bag.at(-1)?.id === sequence.at(-1)?.id && pool.length > 1) {
        const other = bag.findIndex((k) => k.id !== sequence.at(-1).id);
        if (other >= 0)
          [bag[other], bag[bag.length - 1]] = [bag.at(-1), bag[other]];
        else {
          const alternatives = pool.filter((k) => k.id !== sequence.at(-1).id);
          sequence.push(alternatives[Math.floor(rng() * alternatives.length)]);
          continue;
        }
      }
      sequence.push(bag.pop());
    }
  return sequence;
}
export class Session {
  constructor(sequence, settings, clock = () => performance.now()) {
    this.state = "READY";
    this.sequence = sequence;
    this.settings = settings;
    this.clock = clock;
    this.index = 0;
    this.results = [];
    this.shownAt = null;
    this.events = [];
    this.incorrect = [];
    this.invalidatedAttempts = [];
    this.pauses = [];
    this.id = createSessionId();
  }
  get target() {
    return this.sequence[this.index];
  }
  start() {
    if (this.state !== "READY") return;
    this.state = "RUNNING";
    this.startedAt = new Date().toISOString();
    this.startedMonotonic = this.clock();
  }
  markShown() {
    if (this.state === "RUNNING" && this.shownAt === null)
      this.shownAt = this.clock();
  }
  input(event) {
    if (event.repeat) return "ignored";
    if (this.state === "READY") {
      this.start();
      return "started";
    }
    if (this.state !== "RUNNING" || this.shownAt === null) return "ignored";
    const now = this.clock();
    const attempt = {
      code: event.code,
      key: event.key,
      shiftKey: !!event.shiftKey,
      ctrlKey: !!event.ctrlKey,
      altKey: !!event.altKey,
      metaKey: !!event.metaKey,
      timestamp: now,
      timeFromTargetMs: now - this.shownAt,
    };
    const outcome = matchesTarget(event, this.target)
      ? "correct"
      : isModifierPrelude(event, this.target)
        ? "prelude"
        : "incorrect";
    this.events.push({ ...attempt, outcome });
    if (outcome === "prelude") return outcome;
    if (outcome === "incorrect") {
      this.incorrect.push(attempt);
      return outcome;
    }
    this.results.push({
      trialIndex: this.index + 1,
      targetId: this.target.id,
      displayedTarget: this.target.display,
      category: this.target.category,
      expectedCode: this.target.acceptableCodes ?? this.target.code,
      shiftRequired: !!this.target.shiftRequired,
      reactionTimeMs: now - this.shownAt,
      errorCount: this.incorrect.length,
      incorrectAttempts: this.incorrect,
      timeline: this.events,
      invalidatedAttempts: this.invalidatedAttempts,
      startedAt: this.shownAt,
      completedAt: now,
      resumed: this.invalidatedAttempts.length > 0,
    });
    this.index++;
    this.shownAt = null;
    this.events = [];
    this.incorrect = [];
    this.invalidatedAttempts = [];
    if (this.index === this.sequence.length) {
      this.state = "COMPLETED";
      this.endedAt = new Date().toISOString();
      this.durationMs = now - this.startedMonotonic;
      return "completed";
    }
    return "correct";
  }
  pause() {
    if (this.state !== "RUNNING") return;
    const now = this.clock();
    this.invalidatedAttempts.push({
      startedAt: this.shownAt,
      invalidatedAt: now,
      timeline: this.events,
      incorrectAttempts: this.incorrect,
    });
    this.pauses.push({ trialIndex: this.index + 1, pausedAt: now });
    this.state = "PAUSED";
    this.shownAt = null;
    this.events = [];
    this.incorrect = [];
  }
  resume() {
    if (this.state !== "PAUSED") return;
    this.pauses.at(-1).resumedAt = this.clock();
    this.state = "RUNNING";
  }
}

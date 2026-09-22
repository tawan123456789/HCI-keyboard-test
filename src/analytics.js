import { summarizeMistakes } from "./keyboard/labels.js";
export const average = (a) =>
  a.length ? a.reduce((s, v) => s + v, 0) / a.length : 0;
export function median(a) {
  const b = [...a].sort((x, y) => x - y),
    m = Math.floor(b.length / 2);
  return b.length ? (b.length % 2 ? b[m] : (b[m - 1] + b[m]) / 2) : 0;
}
export function calculateStats(results) {
  const valid = results.filter(r => !r.skipped && !r.assisted);
  const times = valid.map((r) => r.reactionTimeMs),
    mean = average(times),
    mid = median(times);
  // Population SD across completed valid trials; strict greater-than threshold.
  const standardDeviation = Math.sqrt(
    average(times.map((t) => (t - mean) ** 2)),
  );
  const threshold = Math.max(1000, mid + standardDeviation);
  const errors = results.reduce((s, r) => s + r.errorCount, 0);
  const group = (field) =>
    Object.entries(Object.groupBy(results, (r) => r[field])).map(
      ([id, rows]) => ({
        id,
        label: field === "targetId" ? rows[0].displayedTarget : id,
        count: rows.length,
        averageMs: rows.some(r => !r.skipped && !r.assisted) ? average(rows.filter(r => !r.skipped && !r.assisted).map((r) => r.reactionTimeMs)) : null,
        errors: rows.reduce((s, r) => s + r.errorCount, 0),
      }),
    );
  return {
    average: times.length ? mean : null,
    median: times.length ? mid : null,
    fastest: times.length ? Math.min(...times) : null,
    slowest: times.length ? Math.max(...times) : null,
    errors,
    skipped: results.filter(r => r.skipped).length,
    assisted: results.filter(r => r.assisted).length,
    validCount: valid.length,
    accuracy: valid.length + valid.reduce((sum, r) => sum + r.errorCount, 0)
      ? (valid.length / (valid.length + valid.reduce((sum, r) => sum + r.errorCount, 0))) * 100
      : 0,
    standardDeviation,
    threshold,
    hesitations: valid.filter((r) => r.reactionTimeMs > threshold),
    byKey: group("targetId").sort((a, b) => b.averageMs - a.averageMs),
    byCategory: group("category"),
  };
}
export function exportSession(session) {
  return {
    schemaVersion: 2,
    id: session.id,
    startedAt: session.startedAt,
    endedAt: session.endedAt,
    settings: session.settings,
    sequence: session.sequence,
    durationMs: session.durationMs,
    activeDurationMs: session.results.reduce((s, r) => s + (r.elapsedTimeMs ?? r.reactionTimeMs), 0),
    pauses: session.pauses,
    stats: calculateStats(session.results),
    trials: session.results,
  };
}
export function toCSV(session) {
  const data = exportSession(session);
  // Quote all cells and neutralize spreadsheet formula prefixes in text cells.
  const cell = (v) =>
    '"' +
    String(
      typeof v === "string" && /^[=+@\-\t\r]/.test(v) ? `'${v}` : v,
    ).replaceAll('"', '""') +
    '"';
  const header = [
    "session_id",
    "start_timestamp",
    "end_timestamp",
    "enabled_categories",
    "trial",
    "target",
    "category",
    "expected_code",
    "shift_required",
    "reaction_time_ms",
    "error_count",
    "incorrect_keys",
    "hesitation",
    "resumed",
    "session_duration_ms",
    "accuracy_percent",
    "expected_answer", "incorrect_counts", "skipped", "assisted", "elapsed_time_ms",
  ];
  const rows = session.results.map((r) => [
    session.id,
    session.startedAt,
    session.endedAt,
    session.settings.categories.join("|"),
    r.trialIndex,
    r.displayedTarget,
    r.category,
    [r.expectedCode].flat().join("|"),
    r.shiftRequired,
    r.reactionTimeMs ?? "",
    r.errorCount,
    r.incorrectAttempts
      .map((a) => `${a.shiftKey ? "Shift+" : ""}${a.code}`)
      .join("|"),
    !r.skipped && !r.assisted && r.reactionTimeMs > data.stats.threshold,
    r.resumed,
    data.durationMs,
    data.stats.accuracy,
    r.expectedAnswer,
    JSON.stringify(summarizeMistakes(r.incorrectAttempts)),
    !!r.skipped, !!r.assisted, r.elapsedTimeMs ?? r.reactionTimeMs,
  ]);
  return (
    "\uFEFF" +
    [header, ...rows].map((row) => row.map(cell).join(",")).join("\r\n")
  );
}

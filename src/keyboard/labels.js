const modifiers = [["shiftRequired", "Shift"], ["ctrlRequired", "Ctrl"], ["altRequired", "Alt"], ["metaRequired", "Meta"]];
export function bindingLabel(binding) {
  const codes = binding.acceptableCodes ?? [binding.code];
  const prefix = modifiers.filter(([flag]) => binding[flag]).map(([, label]) => label);
  const label = codes.map(code => [...prefix, code.replace(/^Key/, "").replace(/^Digit/, "")].join(" + ")).join(" / ");
  return binding.key && binding.code.startsWith("Numpad") ? `${label} (${binding.key})` : label;
}
export function answerLabel(target) {
  return [target, ...(target.alternativeBindings ?? [])].map(bindingLabel).join(" or ");
}
export function attemptLabel(attempt) {
  const prefix = [["shiftKey", "Shift"], ["ctrlKey", "Ctrl"], ["altKey", "Alt"], ["metaKey", "Meta"]].filter(([flag]) => attempt[flag]).map(([, label]) => label);
  return `${[...prefix, attempt.code].join(" + ")} [${attempt.key}]`;
}
export function summarizeMistakes(attempts) {
  const counts = new Map();
  for (const attempt of attempts) {
    const label = attemptLabel(attempt);
    counts.set(label, (counts.get(label) ?? 0) + 1);
  }
  return [...counts].map(([pressed, count]) => ({pressed, count}));
}

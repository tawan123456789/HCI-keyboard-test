const navigation = {
  Home: "Numpad7",
  ArrowUp: "Numpad8",
  PageUp: "Numpad9",
  ArrowLeft: "Numpad4",
  ArrowRight: "Numpad6",
  End: "Numpad1",
  ArrowDown: "Numpad2",
  PageDown: "Numpad3",
  Delete: "NumpadDecimal",
};
const operators = {
  "+": "NumpadAdd",
  "-": "NumpadSubtract",
  "*": "NumpadMultiply",
  "/": "NumpadDivide",
  ".": "NumpadDecimal",
  "=": "NumpadEqual",
};

export function withNumpadAlternatives(target) {
  let code;
  if (target.category === "number") code = `Numpad${target.display}`;
  if (target.category === "symbol") code = operators[target.display];
  if (["editing", "navigation"].includes(target.category)) {
    code = navigation[target.code];
    if (target.code === "Enter") code = "NumpadEnter";
  }
  // The generated key disambiguates the effective Num Lock layer. This also
  // handles keyboards/OSes where Shift temporarily reverses Num Lock.
  return code ? {
    ...target,
    alternativeBindings: [{ code, key: target.display, shiftRequired: false }],
  } : target;
}

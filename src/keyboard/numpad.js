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
  // These navigation targets accept the physical numpad position on either
  // Num Lock layer. Other alternatives still validate their generated key.
  const physicalNavigation = ["Home", "End", "PageUp", "PageDown"].includes(target.code);
  return code ? {
    ...target,
    alternativeBindings: [{ code, ...(physicalNavigation ? {} : {key: target.display}), shiftRequired: false }],
  } : target;
}

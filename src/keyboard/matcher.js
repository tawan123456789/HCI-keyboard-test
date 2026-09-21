const modifiers = {
  shiftKey: ["ShiftLeft", "ShiftRight"],
  ctrlKey: ["ControlLeft", "ControlRight"],
  altKey: ["AltLeft", "AltRight"],
  metaKey: ["MetaLeft", "MetaRight"],
};
const requirements = {
  shiftKey: "shiftRequired",
  ctrlKey: "ctrlRequired",
  altKey: "altRequired",
  metaKey: "metaRequired",
};
export function matchesTarget(event, target) {
  if (!(target.acceptableCodes ?? [target.code]).includes(event.code))
    return false;
  return Object.entries(modifiers).every(
    ([flag, codes]) =>
      Boolean(event[flag]) ===
      (codes.includes(event.code) || Boolean(target[requirements[flag]])),
  );
}
export function isModifierPrelude(event, target) {
  return Object.entries(modifiers).some(
    ([flag, codes]) =>
      codes.includes(event.code) &&
      target[requirements[flag]] &&
      Object.keys(requirements).every(
        (f) => !event[f] || f === flag || target[requirements[f]],
      ),
  );
}

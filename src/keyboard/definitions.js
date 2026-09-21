import { thaiKeys } from "./thaiKedmanee.js";
import { withNumpadAlternatives } from "./numpad.js";
export const categories = {
  thai: "Thai",
  english: "English",
  number: "Numbers",
  symbol: "Symbols",
  function: "Function keys",
  editing: "Editing",
  navigation: "Navigation",
  modifier: "Modifiers",
};
const key = (display, code, category, shiftRequired = false) => ({
  id: `${category}-${code}-${shiftRequired}`,
  display,
  code,
  category,
  shiftRequired,
});
export const englishKeys = [..."abcdefghijklmnopqrstuvwxyz"].map((c) =>
  key(c, `Key${c.toUpperCase()}`, "english"),
);
export const numberKeys = [..."0123456789"].map((c) =>
  key(c, `Digit${c}`, "number"),
);
const punctuation = [
  ["Minus", "-", "_"],
  ["Equal", "=", "+"],
  ["BracketLeft", "[", "{"],
  ["BracketRight", "]", "}"],
  ["Backslash", "\\", "|"],
  ["Semicolon", ";", ":"],
  ["Quote", "'", '"'],
  ["Comma", ",", "<"],
  ["Period", ".", ">"],
  ["Slash", "/", "?"],
  ["Backquote", "`", "~"],
];
export const symbolKeys = [
  ...punctuation.flatMap(([code, a, b]) => [
    key(a, code, "symbol"),
    key(b, code, "symbol", true),
  ]),
  ...[...")!@#$%^&*("].map((c, i) => key(c, `Digit${i}`, "symbol", true)),
];
export const specialKeys = [
  ...Array.from({ length: 12 }, (_, i) =>
    key(`F${i + 1}`, `F${i + 1}`, "function"),
  ),
  ...["Backspace", "Delete", "Enter", "Tab", "Escape", "Space"].map((c) =>
    key(c, c, "editing"),
  ),
  ...[
    "ArrowUp",
    "ArrowDown",
    "ArrowLeft",
    "ArrowRight",
    "Home",
    "End",
    "PageUp",
    "PageDown",
  ].map((c) => key(c, c, "navigation")),
  ...[
    ["Shift", "Shift"],
    ["Ctrl", "Control"],
    ["Alt", "Alt"],
  ].map(([display, code]) => ({
    ...key(display, `${code}Left`, "modifier"),
    acceptableCodes: [`${code}Left`, `${code}Right`],
  })),
];
// ASCII symbols on Kedmanee have different positions from US symbols. Keep
// those in the mapping, but exclude them from the Thai experiment pool so a
// visible target never has two conflicting physical answers in a mixed test.
export const allKeys = [
  ...thaiKeys.filter((k) => /^[\u0E00-\u0E7F]$/.test(k.display)),
  ...englishKeys,
  ...numberKeys,
  ...symbolKeys,
  ...specialKeys,
].map(withNumpadAlternatives);
export function getPool(enabled, uppercase = false) {
  return allKeys
    .filter((k) => enabled.includes(k.category))
    .map((k) =>
      k.category === "english" && uppercase
        ? {
            ...k,
            id: `${k.id}-upper`,
            display: k.display.toUpperCase(),
            shiftRequired: true,
          }
        : k,
    );
}

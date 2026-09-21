// Standard Microsoft Thai Kedmanee (KBDTH0), physical ANSI positions.
// https://github.com/MicrosoftDocs/globalization/blob/main/globalization/keyboards/kbdth0.html
const rows = [
  [
    "Backquote Digit1 Digit2 Digit3 Digit4 Digit5 Digit6 Digit7 Digit8 Digit9 Digit0 Minus Equal",
    "_ๅ/-ภถุึคตจขช",
    "%+๑๒๓๔ู฿๕๖๗๘๙",
  ],
  [
    "KeyQ KeyW KeyE KeyR KeyT KeyY KeyU KeyI KeyO KeyP BracketLeft BracketRight Backslash",
    "ๆไำพะัีรนยบลฃ",
    '๐"ฎฑธํ๊ณฯญฐ,ฅ',
  ],
  [
    "KeyA KeyS KeyD KeyF KeyG KeyH KeyJ KeyK KeyL Semicolon Quote",
    "ฟหกดเ้่าสวง",
    "ฤฆฏโฌ็๋ษศซ.",
  ],
  [
    "KeyZ KeyX KeyC KeyV KeyB KeyN KeyM Comma Period Slash",
    "ผปแอิืทมใฝ",
    "()ฉฮฺ์?ฒฬฦ",
  ],
];
export const thaiKeys = rows.flatMap(([codes, base, shifted]) =>
  codes
    .split(" ")
    .flatMap((code, i) =>
      [false, true].map((shiftRequired) => ({
        id: `thai-${code}-${shiftRequired ? "shift" : "base"}`,
        display: [...(shiftRequired ? shifted : base)][i],
        code,
        shiftRequired,
        category: "thai",
      })),
    ),
);

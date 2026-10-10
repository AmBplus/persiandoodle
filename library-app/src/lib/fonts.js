// ثبت پویا ۲۵ فونت تایپوگرافی از TYPO_FONTS موتور رندر
import { TYPO_FONTS } from "../../../library/typography/effects.js";

const FONT_DIR = "../skills/anidoodle/engine/assets/fonts/";

export function ensureFontCss() {
  if (document.getElementById("dyn-fonts")) return;
  const st = document.createElement("style");
  st.id = "dyn-fonts";
  st.textContent = TYPO_FONTS.map(
    ([fam, file]) =>
      `@font-face{font-family:"${fam}";src:url("${FONT_DIR}${file}") format("truetype");font-display:swap;}`
  ).join("\n");
  document.head.appendChild(st);
}

export async function loadFont(fam, weight = "700") {
  ensureFontCss();
  try {
    await document.fonts.load(`${weight} 48px "${fam}"`, "متن آزمون");
    await document.fonts.ready;
  } catch {
    /* اگر فونتی لود نشد، فونت جایگزین سیستم کشیده می‌شود */
  }
}

export const FONT_NAMES = TYPO_FONTS.map(([fam]) => fam);

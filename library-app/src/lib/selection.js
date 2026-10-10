// ابزارهای انتخاب چندگانه — ساخت «پرامنت» هر مورد برای گزارش/کپی
// کاربر چند مورد را تیک می‌زند و خروجی متنی را برای درخواست اصلاح کپی می‌کند.

export async function copyText(text) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    try {
      const ta = document.createElement("textarea");
      ta.value = text;
      ta.style.cssText = "position:fixed;top:0;left:0;opacity:0";
      document.body.appendChild(ta);
      ta.focus();
      ta.select();
      const ok = document.execCommand("copy");
      ta.remove();
      return ok;
    } catch {
      return false;
    }
  }
}

// «پرامنت» هر مورد: مشخصات کامل و قابل‌ارجاع (شناسه دقیق برای پیدا کردن در مخزن)
export function itemPrompt(it) {
  if (it.kind === "typo") {
    const m = it.model || {};
    return [
      `### ${it.title}`,
      `- شناسه: \`${it.id}\``,
      `- نوع: تایپوگرافی متحرک (زنده)`,
      `- توضیح: ${it.desc || "—"}`,
      `- افکت: \`${m.effectKey || "—"}\` · فونت: \`${it.font}\` · متن پیش‌فرض: «${it.text}»`,
      `- مدت: ${it.frames} فریم در ${it.fps}fps · رنگ تأکید: \`${it.accent}\``,
      `- برچسب‌ها: ${(it.tags || []).join("، ") || "—"}`,
      it.media?.video ? `- ویدیوی نمونه: ${it.media.video}` : `- ویدیوی نمونه: ندارد`,
    ].join("\n");
  }
  return [
    `### ${it.title}`,
    `- شناسه: \`${it.id}\``,
    `- نوع: کامپوننت کاتالوگ`,
    `- دسته: ${it.category} · منبع: ${it.source}`,
    `- توضیح: ${it.desc || "—"}`,
    `- وضعیت: ${it.status || "—"}${it.duration ? ` · مدت: ${it.duration}` : ""}${it.energy ? ` · انرژی: ${it.energy}` : ""}`,
    `- برچسب‌ها: ${(it.tags || []).join("، ") || "—"}`,
  ].join("\n");
}

export function namesList(items) {
  return items.map((it) => `${it.title} — ${it.id}`).join("\n");
}

export function buildReport(items, note = "") {
  const head = `موارد انتخاب‌شده از کتابخانهٔ موشن فارسی (${items.length} مورد)`;
  const lines = [head];
  if (note && note.trim()) lines.push(`درخواست: ${note.trim()}`);
  lines.push(...items.map(itemPrompt));
  return lines.join("\n\n");
}

export function buildJson(items) {
  return JSON.stringify(
    items.map((it) => ({
      id: it.id,
      title: it.title,
      kind: it.kind,
      category: it.category,
      source: it.source,
      desc: it.desc || "",
      tags: it.tags || [],
      ...(it.kind === "typo"
        ? { font: it.font, text: it.text, accent: it.accent, effectKey: it.model?.effectKey, frames: it.frames, fps: it.fps }
        : { status: it.status, duration: it.duration }),
    })),
    null,
    2
  );
}

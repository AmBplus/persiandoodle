import { useState } from "react";

export default function CodeBlock({ code, label }) {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(code);
    } catch {
      const ta = document.createElement("textarea");
      ta.value = code;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      ta.remove();
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 1600);
  };

  return (
    <div className="codeblock">
      <div className="codeblock-bar">
        <span className="codeblock-lang">{label}</span>
        <button type="button" className={`copy-btn ${copied ? "done" : ""}`} onClick={copy}>
          {copied ? "کپی شد ✓" : "کپی کد"}
        </button>
      </div>
      <pre dir="ltr">
        <code>{code}</code>
      </pre>
    </div>
  );
}

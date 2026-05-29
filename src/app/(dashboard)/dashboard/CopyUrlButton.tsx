"use client";

import { useState } from "react";

export default function CopyUrlButton({ url }: { url: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      // Reset after 2s — short enough that a second copy still re-shows
      // the feedback, long enough that the user actually sees it.
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // navigator.clipboard can fail in non-HTTPS contexts (some dev setups
      // behind reverse proxies). Fall back to a contenteditable trick.
      try {
        const ta = document.createElement("textarea");
        ta.value = url;
        document.body.appendChild(ta);
        ta.select();
        document.execCommand("copy");
        document.body.removeChild(ta);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      } catch {
        // Give up gracefully.
      }
    }
  };

  return (
    <button
      type="button"
      onClick={handleCopy}
      className="btn-secondary text-sm"
      aria-label="Copy URL"
    >
      {copied ? "Copied!" : "Copy"}
    </button>
  );
}

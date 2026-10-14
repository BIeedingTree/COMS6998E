"use client";

import { useEffect, useRef, useState } from "react";
import Icon from "@/components/Icon";

export default function CopyButton({ text }: { text: string }) {
  const [status, setStatus] = useState<"idle" | "copied" | "error">("idle");
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);

  async function copy() {
    if (timer.current) clearTimeout(timer.current);
    try {
      await navigator.clipboard.writeText(text);
      setStatus("copied");
      timer.current = setTimeout(() => setStatus("idle"), 2000);
    } catch {
      setStatus("error");
    }
  }

  return (
    <div className="copy-control">
      <button type="button" onClick={copy} className={`copy-button ${status === "copied" ? "is-copied" : ""}`} aria-label="Copy message">
        <Icon name={status === "copied" ? "check" : "copy"} />
        {status === "copied" ? "Copied" : "Copy"}
      </button>
      <span role="status" className={status === "error" ? "copy-error" : "sr-only"}>
        {status === "copied" ? "Message copied." : status === "error" ? "Couldn’t copy. Select the message text to copy it." : ""}
      </span>
    </div>
  );
}

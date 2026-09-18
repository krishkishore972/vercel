"use client";
import { useCallback, useEffect, useRef, useState } from "react";

// Shared copy-to-clipboard with "copied" feedback that auto-resets.
// Usage: const [copied, copy] = useCopy();
//   copy(text) -> copied === text until timeout
//   copy(text, key) -> copied === key until timeout (for fixed flags)
export function useCopy(timeout = 1500) {
  const [copied, setCopied] = useState(null);
  const timer = useRef(null);

  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    []
  );

  const copy = useCallback(
    async (text, key) => {
      try {
        await navigator.clipboard.writeText(text);
        setCopied(key ?? text);
        if (timer.current) clearTimeout(timer.current);
        timer.current = setTimeout(() => setCopied(null), timeout);
        return true;
      } catch {
        return false;
      }
    },
    [timeout]
  );

  return [copied, copy];
}

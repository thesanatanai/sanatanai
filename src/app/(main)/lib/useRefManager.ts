import { useCallback, useMemo, useRef } from "react";

/**
 * Holds a DOM element in a ref and lets effects run code "after it is available",
 * either immediately (if it is already mounted) or as soon as React attaches it.
 */
export default function useRefManager<T extends HTMLElement>() {
  const element = useRef<T | null>(null);
  const queue = useRef<Array<(el: T) => void>>([]);

  const set = useCallback((el: T | null) => {
    element.current = el;
    if (el) {
      const pending = queue.current.splice(0);
      pending.forEach((callback) => callback(el));
    } else {
      queue.current = [];
    }
  }, []);

  const afterAvail = useCallback((callback: (el: T) => void) => {
    if (element.current) callback(element.current);
    else queue.current.push(callback);
  }, []);

  return useMemo(() => ({ set, afterAvail }), [set, afterAvail]);
}

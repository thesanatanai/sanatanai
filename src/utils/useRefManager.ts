"use client";
import { useMemo } from "react";

/**
### How to use:
```jsx
const ref = React.useMemo(() => refManager<YourReturnType>(), [])
```
*/
export function refManager<K = HTMLElement>() {
  let item: K | null = null;
  let queue: Array<(x: K) => void> = [];

  return {
    set(instance: K | null) {
      if(!instance) return
      item = instance;
      queue.forEach(fn => fn(instance));
      queue = [];
    },

    afterAvail(fn: (x: K) => void) {
      if (item) return fn(item);
      else queue.push(fn);
    },

    current: () => item
  };
}

export default function useRefManager<K = HTMLElement>() {
  return useMemo(() => refManager<K>(), []);
}

export type RefManger<K = HTMLElement> = ReturnType<typeof refManager<K>>
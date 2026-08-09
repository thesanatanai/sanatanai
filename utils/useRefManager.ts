/**
### How to use:
```jsx
const ref = React.useMemo(() => refManager<YourReturnType>(), [])
```
*/
export default function refManager<K = HTMLElement>() {
  let item: K | null = null;
  let queue: Array<(x: K) => void> = [];

  return {
    set(instance: K) {
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
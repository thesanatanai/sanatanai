/** Same shape as a React `setState` argument: a value or an update from the previous value. */
export type Updater<K> = K | ((value: K) => K);

export const resolve = <K>(value: Updater<K>, previous: K): K =>
  typeof value === "function" ? (value as (value: K) => K)(previous) : value;

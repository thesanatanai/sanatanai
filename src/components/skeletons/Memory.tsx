import { randomNum } from "./Messages";

export default function MemorySkeleton() {
  const skeleton = [];
  for (let i = 0; i < 9; i++) {
    const width = randomNum(i, i + 1) + "%";
    const animationDuration = randomNum(i) % 10 + 3 + "s";
    skeleton.push(
      <div className="skeleton" style={{ width, animationDuration }} key={i}></div>,
    );
  }
  return skeleton;
}
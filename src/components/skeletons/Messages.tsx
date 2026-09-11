export default function Messages() {
  const userSkeleton = [];
  for (let i = 0; i < 4; i++) {
    const width = randomNum(i, i + 1) + "%";
    const animationDuration = randomNum(i) % 10 + 3 + "s";
    userSkeleton.push(
      <div className="skeleton" style={{ width, animationDuration }} key={i}></div>,
    );
  }
  const botSkeleton = [
    <div className="skeleton w-0" key={10} /> // For Logo
  ];
  for (let i = 0; i < 10; i++) {
    const width = randomNum(i) + "%";
    const animationDuration = randomNum(i) % 10 + 3 + "s";
    botSkeleton.push(
      <div className="skeleton" style={{ width, animationDuration }} key={i}></div>,
    );
  }
  botSkeleton.push(
    <div className="skeleton w-1/4" key={botSkeleton.length}></div>,
  );
  return (
    <>
      <div className="user-message col">{userSkeleton}</div>
      <div className="bot-message">{botSkeleton}</div>
    </>
  );
}

/** Get random number between 20 to 65 using seeds */
function randomNum(seed1: number, seed2 = 1) {
  let seed = Math.imul(seed1, 31) ^ seed2;

  let t = (seed += 0x6d2b79f5);
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);

  return (((t ^ (t >>> 14)) >>> 0) % 46) + 20;
}

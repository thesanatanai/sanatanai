export function initGestures(sidebar: HTMLDivElement, isSwipeIncluded = true, hideClass = "makeSmall", btnClass = "menuopen") {
  document.addEventListener("click", handleTouch);
  let destroy = () => {
    document.removeEventListener("click", handleTouch);
  };
  if (isSwipeIncluded) {
    let touchStartX = 0;
    let touchEndX = 0;
    document.addEventListener("touchstart", updateStartX);
    document.addEventListener("touchend", updateEndX);
    destroy = () => {
      document.removeEventListener("touchstart", updateStartX);
      document.removeEventListener("touchend", updateEndX);
      document.removeEventListener("click", handleTouch);
    };
    function updateStartX(e: TouchEvent) {
      touchStartX = e.changedTouches[0].screenX;
    }
    function updateEndX(e: TouchEvent) {
      touchEndX = e.changedTouches[0].screenX;
      handleSwipe();
    }
    function handleSwipe() {
      if (!sidebar) return;
      const SWIPE_THRESHOLD = 50;

      if (touchEndX - touchStartX > SWIPE_THRESHOLD) {
        if (touchStartX < 30 && !sidebar.classList.contains(hideClass)) {
          sidebar.classList.add(hideClass);
        }
      }
    }
  }
  function handleTouch(e: PointerEvent) {
    if (
      !sidebar.classList.contains(hideClass) &&
      !sidebar.contains(e.target as Element) &&
      !(e.target as Element)?.closest("."+btnClass)
    ) {
      sidebar.classList.add(hideClass);
    }
  }
  return destroy;
}

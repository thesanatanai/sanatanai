import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { initGestures } from "@/utils/gestures";

let sidebar: HTMLDivElement;
let outside: HTMLButtonElement;
let toggle: HTMLButtonElement;

beforeEach(() => {
  document.body.innerHTML = `
    <div id="sidebar"><button id="inside"></button></div>
    <button id="outside"></button>
    <button class="menuopen" id="toggle"><span id="toggle-icon"></span></button>`;
  sidebar = document.getElementById("sidebar") as HTMLDivElement;
  outside = document.getElementById("outside") as HTMLButtonElement;
  toggle = document.getElementById("toggle") as HTMLButtonElement;
});
afterEach(() => {
  document.body.innerHTML = "";
});

const touch = (type: "touchstart" | "touchend", screenX: number) => {
  const event = new Event(type);
  Object.defineProperty(event, "changedTouches", { value: [{ screenX }] });
  document.dispatchEvent(event);
};

describe("initGestures: clicks", () => {
  it("hides the sidebar when the user clicks outside it", () => {
    const destroy = initGestures(sidebar);
    outside.click();
    expect(sidebar.classList.contains("makeSmall")).toBe(true);
    destroy();
  });

  it("keeps the sidebar open for clicks inside it", () => {
    const destroy = initGestures(sidebar);
    document.getElementById("inside")!.click();
    expect(sidebar.classList.contains("makeSmall")).toBe(false);
    destroy();
  });

  it("keeps the sidebar alone for clicks on the menu button (or inside it)", () => {
    const destroy = initGestures(sidebar);
    toggle.click();
    document.getElementById("toggle-icon")!.click();
    expect(sidebar.classList.contains("makeSmall")).toBe(false);
    destroy();
  });

  it("supports custom class names", () => {
    const destroy = initGestures(sidebar, false, "hide", "close-magic");
    outside.click();
    expect(sidebar.classList.contains("hide")).toBe(true);
    destroy();
  });

  it("stops listening once destroyed", () => {
    initGestures(sidebar)();
    outside.click();
    expect(sidebar.classList.contains("makeSmall")).toBe(false);
  });
});

describe("initGestures: swipes", () => {
  it("hides the sidebar on a swipe that starts at the left edge", () => {
    const destroy = initGestures(sidebar);
    touch("touchstart", 10);
    touch("touchend", 120);
    expect(sidebar.classList.contains("makeSmall")).toBe(true);
    destroy();
  });

  it.each([
    ["starts away from the edge", 200, 320],
    ["is too short", 10, 40],
    ["goes the wrong way", 10, -80],
  ])("ignores a swipe that %s", (_label, start, end) => {
    const destroy = initGestures(sidebar);
    touch("touchstart", start);
    touch("touchend", end);
    expect(sidebar.classList.contains("makeSmall")).toBe(false);
    destroy();
  });

  it("ignores swipes when swipe support is switched off", () => {
    const destroy = initGestures(sidebar, false);
    touch("touchstart", 10);
    touch("touchend", 120);
    expect(sidebar.classList.contains("makeSmall")).toBe(false);
    destroy();
  });

  it("stops listening for swipes once destroyed", () => {
    initGestures(sidebar)();
    touch("touchstart", 10);
    touch("touchend", 120);
    expect(sidebar.classList.contains("makeSmall")).toBe(false);
  });
});

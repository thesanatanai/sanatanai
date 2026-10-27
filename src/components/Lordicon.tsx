"use client"
import React, { useEffect, useContext } from "react";
import { All } from "@/app/(root)/AllContext";
import useRefManager from "@/utils/useRefManager";
import { LordIcon, LordIconProps } from "@/app/types/lordicon";
import { logger } from "@/utils/utils";

// Global tracker to ensure @lordicon/element custom element is registered only once
let isLordiconDefined = false;

export const Icon: React.FC<LordIconProps> = React.memo(({
  src,
  trigger = "hover",
  colors,
  stroke = "bold",
  state,
  speed,
  target,
  loading,
  style,
  size,
  className,
  onReady
}) => {
  const manager = useRefManager<LordIcon>();

  useEffect(() => {
    const controller = new AbortController();

    // Define the custom element dynamically
    async function initLordicon() {
      if (!isLordiconDefined) {
        try {
          const { defineElement } = await import("@lordicon/element");
          defineElement();
          isLordiconDefined = true;
        } catch (error) {
          logger("Failed to load Lordicon element:", error);
        }
      }
    };
    void initLordicon();
  
    // If target specifies a parent element, attach a mouseenter trigger to that parent
    if (typeof target === "string") {
      manager.afterAvail((icon) => {
        if (controller.signal.aborted) return;
        let current: HTMLElement | null = icon.parentElement;
        const match = (/^parent\*(\d+)$/).exec(target);
        if (match) {
          const depth = Number(match[1]);
          // Ascend 'depth - 1' times since we already took parentElement once
          for (let i = 1; i < depth; i++) {
            current = current?.parentElement || null;
          }
        } else if (target === "parent") void 0;
        else return;

        icon.target = current;
      });
    }

    // Attach ready event listener
    manager.afterAvail((iconEl) => {
      if (controller.signal.aborted || !onReady) return;
      iconEl.addEventListener("ready", onReady);
    });

    // Cleanup event listeners on unmount
    return () => controller.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Compute container styling with fallback sizes
  const resolvedStyle: React.CSSProperties = {
    ...style,
    width: size || style?.width,
    height: size || style?.height,
  };

  return (
    <lord-icon
      ref={manager.set}
      src={(() => {
        let realSrc = src;
        if (!realSrc.endsWith(".json")) realSrc += ".json";
        // Absolute path, so it also resolves correctly on /hi.
        if (!realSrc.startsWith("/icons/")) realSrc = "/icons/" + realSrc.replace(/^icons\//, "");
        return realSrc;
      })()}
      trigger={trigger}
      colors={colors}
      stroke={stroke}
      state={state}
      speed={speed}
      target={targetCss(target)}
      loading={loading}
      style={resolvedStyle}
      className={className}
    />
  );
});
Icon.displayName = "Icon";

const Lordicon: React.FC<LordIconProps> = React.memo(({
  src,
  trigger = "hover",
  colors,
  stroke = "bold",
  state,
  speed,
  target,
  loading,
  style,
  size,
  className,
  onReady,
  ...props
}) => {
  // Derive textColor from theme context
  const { theme: [theme] } = useContext(All);
  const textColor = theme == "dark" ? "#fff" : "#000";

  return (
    <Icon
      src={src}
      trigger={trigger}
      colors={colors || `primary:${textColor},secondary:${textColor}`}
      stroke={stroke}
      state={state}
      speed={speed}
      target={target}
      size={size}
      onReady={onReady}
      loading={loading}
      style={style}
      className={className}
      {...props}
    />
  );
});

Lordicon.displayName = "Lordicon";

export default Lordicon;

/**
 * Filter out parent-relative target strings for CSS selection.
 */
function targetCss(target: string | undefined): string | undefined {
  if (!target) return undefined;
  if (target === "parent" || /^parent\*\d+$/.test(target)) {
    return undefined;
  }
  return target;
}
"use client"
import React, { useEffect, useContext } from "react";
import { All } from "@/app/(root)/AllContext";
import useRefManager from "@/utils/useRefManager";
import { LordIcon, LordIconProps } from "@/app/types/lordicon";
import { logger } from "@/utils/utils";

// Global tracker to ensure @lordicon/element custom element is registered only once
let isLordiconDefined = false;

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
  const manager = useRefManager<LordIcon>();
  // Derive textColor from theme context
  const { theme: [theme] } = useContext(All);
  const textColor = theme == "dark" ? "#fff" : "#000";

  useEffect(() => {
    let isMounted = true;
    let targetElement: HTMLElement | null = null;

    // Define the custom element dynamically
    const initLordicon = async () => {
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
    initLordicon();

    const handleReady = () => {
      if (onReady) {
        onReady();
      }
    };

    const play = () => {
      manager.afterAvail((element) => {
        if (element.playerInstance) {
          element.playerInstance.playFromStart();
        }
      });
    };
    // If target specifies a parent element, attach a mouseenter trigger to that parent
    if (typeof target === "string" && (target === "parent" || /^parent\*\d+$/.test(target))) {
      manager.afterAvail((iconEl) => {
        if (!isMounted) return;

        let currentEl: HTMLElement | null = iconEl.parentElement;
        const match = (/^parent\*(\d+)$/).exec(target);

        if (match) {
          const depth = Number(match[1]);
          // Ascend 'depth - 1' times since we already took parentElement once
          for (let i = 1; i < depth; i++) {
            currentEl = currentEl?.parentElement || null;
          }
        }

        if (currentEl) {
          targetElement = currentEl;
          targetElement.addEventListener("mouseenter", play);
        }
      });
    }

    // Attach ready event listener
    manager.afterAvail((iconEl) => {
      if (!isMounted) return;
      iconEl.addEventListener("ready", handleReady);
    });

    // Pass custom arbitrary properties to the custom element safely without explicit 'any' types
    Object.keys(props).forEach((prop) => {
      manager.afterAvail((iconEl) => {
        if (!isMounted) return;
        const val = (props as Record<string, unknown>)[prop];
        if (val !== undefined && val !== null) {
          iconEl.setAttribute(prop, String(val));
        }
      });
    });

    // Cleanup event listeners on unmount
    return () => {
      isMounted = false;
      if (targetElement) {
        targetElement.removeEventListener("mouseenter", play);
      }
      manager.afterAvail((iconEl) => {
        iconEl.removeEventListener("ready", handleReady);
      });
    };
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
        if(!realSrc.endsWith(".json")) realSrc += ".json"
        if(!realSrc.startsWith("icons/")) realSrc = "icons/" + realSrc
        return realSrc
      })()}
      trigger={trigger}
      colors={colors || `primary:${textColor},secondary:${textColor}`}
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
import useRefManager from "@/utils/useRefManager";
import { Player, Element as LordIconElement } from "@lordicon/element";
interface LordIconProps {
  /** URL path to the icon JSON file */
  src: string;
  /** Animation trigger type */
  trigger?:
    | "in"
    | "click"
    | "hover"
    | "loop"
    | "loop-on-hover"
    | "morph"
    | "boomerang"
    | "sequence";
  /** Color palette in key-value format (e.g., "primary:#ff0000,secondary:#00ff00") */
  colors?: string;
  /** Line thickness for supported icons */
  stroke?: "light" | "regular" | "bold" | 1 | 2 | 3;
  /** Specific animation state to play */
  state?: string;
  /** Animation playback speed multiplier (default is 1) */
  speed?: number;
  /** CSS selector for the element that should receive trigger events instead of the icon itself */
  target?: string;
  /** Loading strategy for performance optimization */
  loading?: "lazy" | "interaction" | "delay";
  /** Inline styles for the container */
  style?: React.CSSProperties;
  /** Square size of the icon */
  size?: number;
  /** CSS class name */
  className?: string;
  /** Callback fired when the player is initialized and ready */
  onReady?: () => void;
}
declare module "react/jsx-runtime" {
  namespace JSX {
    interface IntrinsicElements {
      "lord-icon": React.DetailedHTMLProps<
        React.HTMLAttributes<HTMLElement>,
        HTMLElement, Player
      > & LordIconProps
    }
  }
}
type LordIcon = LordIconElement;
type usedRef<X = HTMLElement> = ReturnType<typeof useRefManager<X>>;
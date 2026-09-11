/* eslint-disable react-hooks/refs */
/* eslint-disable react-hooks/purity */
"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type PointerEvent,
  type ReactNode,
  type WheelEvent,
} from "react";
import mermaid from "mermaid";
import { type MermaidBlockNodeProps } from "markstream-react";
import useRefManager from "@/utils/useRefManager";
import { usedRef } from "@/app/types/lordicon";


/* Helpers */
const MIN_SCALE = 0.25;
const MAX_SCALE = 5;
const ZOOM_STEP = 1.2;
const WHEEL_ZOOM_SPEED = 0.002;

type Point = {
  x: number;
  y: number;
};

type Transform = {
  x: number;
  y: number;
  scale: number;
};

type Props = Readonly<MermaidBlockNodeProps>;

function distance(a: Point, b: Point): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function midpoint(a: Point, b: Point): Point {
  return {
    x: (a.x + b.x) / 2,
    y: (a.y + b.y) / 2,
  };
}

function clampScale(scale: number): number {
  return Math.min(MAX_SCALE, Math.max(MIN_SCALE, scale));
}

function applyTransform(element: HTMLDivElement, transform: Transform): void {
  element.style.transform =
    `translate(${transform.x}px, ${transform.y}px) ` +
    `scale(${transform.scale})`;
}

// Main Zooming Component
function MermaidZoom({
  children,
  contentRef
}: Readonly<{
  children: ReactNode;
  contentRef: usedRef<HTMLDivElement>
}>) {
  const viewportRef = useRef<HTMLDivElement>(null);

  /*
   * Transform is intentionally kept in a ref.

   * Panning and pinching can generate dozens of pointer events per second.
   * Putting every update into React state would cause a React render for
   * every movement. The transform itself is purely visual, so it is more
   * efficient to update the DOM directly.
   */
  const transformRef = useRef<Transform>({
    x: 0,
    y: 0,
    scale: 1,
  });

  const [isZoomed, setIsZoomed] = useState(false);

  const pointers = useRef(new Map<number, Point>());

  const dragRef = useRef<{
    active: boolean;
    x: number;
    y: number;
  }>({
    active: false,
    x: 0,
    y: 0,
  });

  const pinchRef = useRef<{
    distance: number;
    scale: number;
    midpoint: Point;
  } | null>(null);

  const updateTransform = useCallback((next: Transform) => {
    const clamped = {
      x: next.x,
      y: next.y,
      scale: clampScale(next.scale),
    };

    transformRef.current = clamped;

    contentRef.afterAvail(content => applyTransform(content, clamped));

    const zoomed = clamped.scale > 1;

    setIsZoomed((previous) => (previous === zoomed ? previous : zoomed));
  }, [contentRef]);

  /*
   * Zoom around a viewport point while keeping the point beneath the
   * cursor/fingers stationary.
   */
  const zoomAt = useCallback(
    (clientX: number, clientY: number, requestedScale: number) => {
      const viewport = viewportRef.current;

      if (!viewport) {
        return;
      }

      const rect = viewport.getBoundingClientRect();

      const pointerX = clientX - rect.left;
      const pointerY = clientY - rect.top;

      const current = transformRef.current;
      const nextScale = clampScale(requestedScale);

      const worldX = (pointerX - current.x) / current.scale;

      const worldY = (pointerY - current.y) / current.scale;

      updateTransform({
        scale: nextScale,
        x: pointerX - worldX * nextScale,
        y: pointerY - worldY * nextScale,
      });
    },
    [updateTransform],
  );

  const handleWheel = useCallback(
    (event: WheelEvent) => {
      if (!event.ctrlKey) {
        return;
      }

      event.preventDefault();

      const factor = Math.exp(-event.deltaY * WHEEL_ZOOM_SPEED);

      const current = transformRef.current;

      zoomAt(event.clientX, event.clientY, current.scale * factor);
    },
    [zoomAt],
  );

  useEffect(() => {
    const viewport = viewportRef.current;

    if (!viewport) {
      return;
    }

    const listener = (event: globalThis.WheelEvent) => {
      handleWheel(event as unknown as WheelEvent);
    };

    viewport.addEventListener("wheel", listener, {
      passive: false,
    });

    return () => {
      viewport.removeEventListener("wheel", listener);
    };
  }, [handleWheel]);

  const handlePointerDown = useCallback(
    (event: PointerEvent<HTMLDivElement>) => {
      event.currentTarget.setPointerCapture(event.pointerId);

      pointers.current.set(event.pointerId, {
        x: event.clientX,
        y: event.clientY,
      });

      /*
       * Two active pointers means pinch mode.
       */
      if (pointers.current.size === 2) {
        const iterator = pointers.current.values();
        const a = iterator.next().value as Point;
        const b = iterator.next().value as Point;

        const current = transformRef.current;

        pinchRef.current = {
          distance: Math.max(distance(a, b), 1),
          scale: current.scale,
          midpoint: midpoint(a, b),
        };

        dragRef.current.active = false;
        return;
      }

      /*
       * Mouse can always drag.
       *
       * Touch can drag once the diagram has been zoomed in. At scale 1,
       * a single finger is intentionally left available for normal page
       * interaction.
       */
      if (event.pointerType === "mouse" || transformRef.current.scale > 1) {
        dragRef.current = {
          active: true,
          x: event.clientX,
          y: event.clientY,
        };
      }
    },
    [],
  );

  const handlePointerMove = useCallback(
    (event: PointerEvent<HTMLDivElement>) => {
      if (!pointers.current.has(event.pointerId)) {
        return;
      }

      pointers.current.set(event.pointerId, {
        x: event.clientX,
        y: event.clientY,
      });

      /*
       * Pinch + two-finger pan.
       *
       * Everything is calculated first and applied through ONE transform
       * update instead of calling setState twice.
       */
      if (pointers.current.size === 2 && pinchRef.current) {
        const iterator = pointers.current.values();
        const a = iterator.next().value as Point;
        const b = iterator.next().value as Point;

        const pinch = pinchRef.current;

        const currentDistance = Math.max(distance(a, b), 1);

        const currentMidpoint = midpoint(a, b);

        const nextScale = clampScale(
          pinch.scale * (currentDistance / pinch.distance),
        );

        /*
         * Convert the current midpoint to viewport-local
         * coordinates before calculating the zoom.
         */
        const viewport = viewportRef.current;

        if (!viewport) {
          return;
        }

        const rect = viewport.getBoundingClientRect();

        const pointerX = currentMidpoint.x - rect.left;

        const pointerY = currentMidpoint.y - rect.top;

        const current = transformRef.current;

        /*
         * Keep the content underneath the pinch midpoint fixed
         * while scaling.
         */
        const worldX = (pointerX - current.x) / current.scale;

        const worldY = (pointerY - current.y) / current.scale;

        const zoomedX = pointerX - worldX * nextScale;

        const zoomedY = pointerY - worldY * nextScale;

        /*
         * Add the movement of the pinch midpoint itself.
         */
        const dx = currentMidpoint.x - pinch.midpoint.x;

        const dy = currentMidpoint.y - pinch.midpoint.y;

        updateTransform({
          scale: nextScale,
          x: zoomedX + dx,
          y: zoomedY + dy,
        });

        pinch.midpoint = currentMidpoint;

        return;
      }

      /*
       * Mouse/single-pointer panning.
       */
      if (!dragRef.current.active) {
        return;
      }

      const drag = dragRef.current;

      const dx = event.clientX - drag.x;
      const dy = event.clientY - drag.y;

      const current = transformRef.current;

      updateTransform({
        ...current,
        x: current.x + dx,
        y: current.y + dy,
      });

      drag.x = event.clientX;
      drag.y = event.clientY;
    },
    [updateTransform],
  );

  const handlePointerUp = useCallback((event: PointerEvent<HTMLDivElement>) => {
    pointers.current.delete(event.pointerId);

    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }

    /*
     * If one of the two pinch pointers disappears, terminate
     * pinch mode. A new pointer-down will establish a fresh
     * pinch baseline.
     */
    if (pointers.current.size < 2) {
      pinchRef.current = null;
    }

    if (pointers.current.size === 0) {
      dragRef.current.active = false;
    }
  }, []);

  const handlePointerCancel = useCallback(
    (event: PointerEvent<HTMLDivElement>) => {
      pointers.current.delete(event.pointerId);

      if (event.currentTarget.hasPointerCapture(event.pointerId)) {
        event.currentTarget.releasePointerCapture(event.pointerId);
      }

      pinchRef.current = null;

      if (pointers.current.size === 0) {
        dragRef.current.active = false;
      }
    },
    [],
  );

  const zoomButton = useCallback(
    (factor: number) => {
      const viewport = viewportRef.current;

      if (!viewport) {
        return;
      }

      const rect = viewport.getBoundingClientRect();

      zoomAt(
        rect.left + rect.width / 2,
        rect.top + rect.height / 2,
        transformRef.current.scale * factor,
      );
    },
    [zoomAt],
  );

  /*
   * Reset the DOM transform when this component is mounted.
   * This also makes the imperative transform explicit instead of
   * depending on React's initial render.
   */
  useEffect(() => {
    contentRef.afterAvail(content => applyTransform(content, transformRef.current));
  }, [contentRef]);

  return (
    <div
      className="mermaid"
      style={{
        position: "relative",
        width: "100%",
      }}
    >
      <div
        style={{
          position: "absolute",
          top: 8,
          right: 8,
          zIndex: 10,
          display: "flex",
          flexDirection: "column",
          gap: 4,
        }}
      >
        <button
          type="button"
          onClick={() => zoomButton(ZOOM_STEP)}
          title="Zoom in"
          style={{
            width: 32,
            height: 32,
            padding: 0,
            fontSize: 20,
            lineHeight: 1,
            cursor: "pointer",
          }}
        >
          +
        </button>

        <button
          type="button"
          onClick={() => zoomButton(1 / ZOOM_STEP)}
          title="Zoom out"
          style={{
            width: 32,
            height: 32,
            padding: 0,
            fontSize: 20,
            lineHeight: 1,
            cursor: "pointer",
          }}
        >
          −
        </button>
      </div>

      <div
        ref={viewportRef}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerCancel}
        style={{
          position: "relative",
          width: "100%",
          minHeight: 100,
          overflow: "hidden",
          touchAction: "none",
          userSelect: "none",
          cursor: isZoomed
            ? "grab"
            : "default",
        }}
      >
          {children}
        </div>
      </div>
  );
}

export default function Mermaid(props: Props) {
  /*
   * Mermaid IDs need to be stable for the lifetime of this
   * component instance.
   */
  const id = useMemo(
    () => `mermaid-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    [],
  );

  const divRef = useRefManager<HTMLDivElement>();

  useEffect(() => {
    mermaid.initialize({
      darkMode: props.isDark,
      theme: props.isDark ? "dark" : "default",
      securityLevel: "strict",
    });

    divRef.afterAvail(async (div) => {
      if(props.loading) return;
      const dark = props.isDark;
      const { code } = props.node;

      try {
        /*
         * The ref may technically become unavailable while the
         * asynchronous Mermaid render is in progress.
         */
        if (!div.isConnected) {
          return;
        }

        const { svg } = await mermaid.render(id, code);

        div.innerHTML = svg;
      } catch (error) {
        if (!div.isConnected) {
          return;
        }

        div.className = dark ? "dark" : "light";

        div.textContent =
          error instanceof Error ? error.message : String(error);
      }
    });
  }, [divRef, id, props.isDark, props.loading, props.node]);

  return (
    <MermaidZoom contentRef={divRef}>
      <div ref={divRef.set} style={{
        transformOrigin: "0 0"
      }} />
    </MermaidZoom>
  );
}

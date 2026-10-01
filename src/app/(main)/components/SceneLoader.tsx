"use client";

import dynamic from "next/dynamic";

// three.js is client-only and heavy, so it loads after the page content.
const MandalaScene = dynamic(() => import("./MandalaScene"), { ssr: false });

export default function SceneLoader() {
  return <MandalaScene />;
}

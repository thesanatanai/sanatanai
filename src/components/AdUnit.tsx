"use client";

import { useEffect, useRef } from "react";

declare global {
  interface Window {
    adsbygoogle?: Array<Record<string, unknown>>;
  }
}

export default function AdUnit({ className = "" }: Readonly<{ className?: string }>) {
  const adRef = useRef<HTMLModElement>(null);
  const initialized = useRef(false);

  useEffect(() => {
    const ad = adRef.current;

    if (!ad || initialized.current) return;

    // Do not initialize the same ad element twice.
    if (ad.dataset["adsbygoogle-status"]) {
      initialized.current = true;
      return;
    }

    try {
      (window.adsbygoogle = window.adsbygoogle || []).push({});

      initialized.current = true;
    } catch (error) {
      console.error("AdSense initialization failed:", error);
    }
  }, []);

  return (
    <div className={`ad-container ${className}`}>
      <ins
        ref={adRef}
        className="adsbygoogle"
        style={{
          display: "block",
          width: "100%",
        }}
        data-ad-client="ca-pub-3342425038494765"
        data-ad-slot="8997681240"
        data-ad-format="auto"
        data-full-width-responsive="true"
      />
    </div>
  );
}

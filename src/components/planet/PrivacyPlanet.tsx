"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";

/**
 * The app's plain planet, live in 3D: a still first, then the model once the
 * section comes near (it's a couple of megabytes, so not before). Drag to spin.
 */
export function PrivacyPlanet() {
  const canvas = useRef<HTMLCanvasElement>(null);
  const [live, setLive] = useState(false);

  useEffect(() => {
    const element = canvas.current;
    if (!element) return;
    let disposed = false;
    let dispose: (() => void) | undefined;
    const near = new IntersectionObserver(
      async ([entry]) => {
        if (!entry.isIntersecting) return;
        near.disconnect();
        try {
          const { createPlanetViewer } = await import("./viewer");
          if (disposed) return;
          const viewer = await createPlanetViewer({ canvas: element, onReady: () => setLive(true) });
          if (disposed) viewer.dispose();
          else dispose = viewer.dispose;
        } catch (error) {
          console.warn("Planet 3D viewer unavailable", error);
        }
      },
      { rootMargin: "600px 0px" },
    );
    near.observe(element);
    return () => {
      disposed = true;
      near.disconnect();
      dispose?.();
    };
  }, []);

  return (
    <div className="planet-stage">
      <Image
        className={`planet-still${live ? " is-hidden" : ""}`}
        src="/assets/planet.png"
        alt=""
        width={558}
        height={560}
        sizes="(max-width: 860px) 320px, 440px"
      />
      <canvas
        ref={canvas}
        className={`planet-3d${live ? " is-live" : ""}`}
        role="img"
        aria-label="Apila's little planet in 3D: meadows, beaches and sea. Drag to spin it."
      />
    </div>
  );
}

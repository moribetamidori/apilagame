"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";

/**
 * Apila in the hero: a still render first, then the live 3D model once it has
 * loaded (three.js is fetched only then). Drag to turn her, tap to make her
 * nod; her eyes follow the mouse. Stays a still for reduced motion or without WebGL.
 */
export function HeroApila() {
  const canvas = useRef<HTMLCanvasElement>(null);
  const [live, setLive] = useState(false);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let disposed = false;
    let dispose: (() => void) | undefined;
    (async () => {
      try {
        const { createViewer } = await import("./viewer");
        if (disposed || !canvas.current) return;
        const viewer = await createViewer({ canvas: canvas.current, model: "apila", onReady: () => setLive(true) });
        if (disposed) viewer.dispose();
        else dispose = viewer.dispose;
      } catch (error) {
        // No WebGL, or the model didn't load: the still stays.
        console.warn("Apila 3D viewer unavailable", error);
      }
    })();
    return () => {
      disposed = true;
      dispose?.();
    };
  }, []);

  return (
    <>
      <Image
        className={`apila${live ? " is-hidden" : ""}`}
        src="/assets/apila-hero.png"
        alt=""
        width={408}
        height={900}
        sizes="(max-width: 860px) 150px, 200px"
        priority
      />
      <canvas
        ref={canvas}
        className={`apila-3d${live ? " is-live" : ""}`}
        aria-label="Apila in 3D. Drag to turn her, tap to make her nod."
        role="img"
      />
    </>
  );
}

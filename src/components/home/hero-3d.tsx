"use client";

import { useReducedMotion } from "framer-motion";
import dynamic from "next/dynamic";
import Image from "next/image";
import { useEffect, useState } from "react";

// The 3D bundle (three.js + R3F) is fetched only when the browser is idle and capable.
const HeroScene = dynamic(() => import("./hero-scene"), { ssr: false, loading: () => null });

function webglAvailable(): boolean {
  try {
    const c = document.createElement("canvas");
    return Boolean(c.getContext("webgl2") || c.getContext("webgl"));
  } catch {
    return false;
  }
}

type NavigatorHints = Navigator & { connection?: { saveData?: boolean; effectiveType?: string }; deviceMemory?: number };

/**
 * Hero visual. Server-rendered, it is a normal photo (fast LCP, works without JavaScript or WebGL).
 * When the device is capable it upgrades to the live 3D scene. Core shopping never depends on this.
 */
export function Hero3D() {
  const [load, setLoad] = useState(false);
  const [ready, setReady] = useState(false);
  const reduced = Boolean(useReducedMotion());

  useEffect(() => {
    const nav = navigator as NavigatorHints;
    const weak =
      nav.connection?.saveData === true ||
      /(^|-)2g$/.test(nav.connection?.effectiveType ?? "") ||
      (nav.deviceMemory !== undefined && nav.deviceMemory < 2) ||
      (nav.hardwareConcurrency !== undefined && nav.hardwareConcurrency < 2);
    if (weak || !webglAvailable()) return;

    const start = () => setLoad(true);
    const hasIdle = typeof window.requestIdleCallback === "function";
    const id = hasIdle ? window.requestIdleCallback(start, { timeout: 2000 }) : window.setTimeout(start, 600);
    return () => {
      if (hasIdle) window.cancelIdleCallback(id);
      else window.clearTimeout(id);
    };
  }, []);

  return (
    <div className="relative size-full min-h-[360px] overflow-hidden" data-hero3d={ready ? "ready" : load ? "loading" : "static"}>
      {/* Static fallback: always rendered, hidden once the live scene has painted. */}
      <Image
        src="/images/hero-fudgie.jpg"
        alt="A stack of rich, fudgy chocolate brownies"
        fill
        priority
        sizes="(min-width: 1024px) 50vw, 100vw"
        className={`object-cover object-[50%_40%] transition-opacity duration-1000 ${ready ? "opacity-0" : "opacity-100"}`}
      />
      <div className={`absolute inset-0 bg-[radial-gradient(60%_55%_at_50%_45%,rgba(213,180,119,0.22),transparent_70%)] transition-opacity duration-1000 ${ready ? "opacity-100" : "opacity-0"}`} aria-hidden />
      {load && (
        <div aria-hidden className={`absolute inset-0 transition-opacity duration-1000 ${ready ? "opacity-100" : "opacity-0"}`}>
          <HeroScene reduced={reduced} onReady={() => setReady(true)} />
        </div>
      )}
    </div>
  );
}

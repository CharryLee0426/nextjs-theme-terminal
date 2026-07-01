"use client";

import { Canvas } from "@react-three/fiber";
import { Physics } from "@react-three/rapier";
import { Suspense, useEffect, useRef, useState } from "react";
import { CAMERA_TARGET_Y } from "./constants";
import { GalleryBadgeBand } from "./GalleryBadgeBand";

type Props = {
  title: string;
  coverUrl?: string;
  onCardClick: () => void;
};

function BadgeFallback() {
  return <div className="gallery-badge-stage__fallback" aria-hidden />;
}

/**
 * Mounts the interactive 3D badge (physics lanyard + card) only once it
 * scrolls into view, so off-screen gallery cards never pay the WebGL /
 * physics-engine cost.
 */
export function GalleryBadgeStage({ title, coverUrl, onCardClick }: Props) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = wrapRef.current;
    if (!el || typeof IntersectionObserver === "undefined") {
      setVisible(true);
      return;
    }
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { rootMargin: "200px" },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <div className="gallery-badge-stage" ref={wrapRef}>
      {visible ? (
        <Suspense fallback={<BadgeFallback />}>
          <Canvas
            gl={{ antialias: true, alpha: true }}
            camera={{
              position: [0, CAMERA_TARGET_Y * 0.4, 3.1],
              fov: 32,
            }}
            dpr={[1, 1.75]}
            onCreated={({ camera }) => {
              camera.lookAt(0, CAMERA_TARGET_Y, 0);
            }}
          >
            <ambientLight intensity={0.9} />
            <directionalLight position={[2, 4, 3]} intensity={1.4} />
            <Physics gravity={[0, -30, 0]} timeStep={1 / 60}>
              <GalleryBadgeBand
                title={title}
                coverUrl={coverUrl}
                onCardClick={onCardClick}
              />
            </Physics>
          </Canvas>
        </Suspense>
      ) : (
        <BadgeFallback />
      )}
      <span className="gallery-badge-stage__hint">drag the badge ↴</span>
    </div>
  );
}

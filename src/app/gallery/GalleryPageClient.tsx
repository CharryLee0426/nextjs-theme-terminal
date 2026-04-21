"use client";

import dynamic from "next/dynamic";

const GalleryView = dynamic(
  () =>
    import("@/components/gallery/GalleryView").then((mod) => ({
      default: mod.GalleryView,
    })),
  {
    ssr: false,
    loading: () => (
      <div className="gallery-loading">
        <span className="terminal-prompt">charry@terminal:~$</span>
        <span className="terminal-command">loading gallery…</span>
      </div>
    ),
  },
);

export function GalleryPageClient() {
  return <GalleryView />;
}

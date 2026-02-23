"use client";

import dynamic from "next/dynamic";

// Dynamically import MapView with no SSR -- Mapbox GL requires the browser DOM
const MapView = dynamic(() => import("@/components/Map/MapView"), {
  ssr: false,
  loading: () => (
    <div className="flex h-[calc(100vh-4rem)] items-center justify-center">
      <div className="text-center">
        <div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-teal-400 border-t-transparent" />
        <p className="mt-3 text-sm text-slate-400">Loading map...</p>
      </div>
    </div>
  ),
});

export default function Home() {
  return <MapView />;
}

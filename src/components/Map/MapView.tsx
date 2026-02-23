"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import MapGL, { Source, Layer } from "react-map-gl/mapbox";
import type { MapRef, MapMouseEvent, LayerProps } from "react-map-gl/mapbox";
import type { FeatureCollection, Feature, Geometry } from "geojson";
import type { PropertyWithMetrics, CommunityStats } from "@/lib/types";

import MetricSelector from "./MetricSelector";
import PropertyTooltip from "./PropertyTooltip";
import CommunityStatsBar from "./CommunityStatsBar";
import {
  type MetricKey,
  computePropertyMetrics,
  getMetricDomain,
} from "./metrics";

const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN ?? "";

const STYLE_DARK = "mapbox://styles/mapbox/dark-v11";
const STYLE_SATELLITE = "mapbox://styles/mapbox/satellite-streets-v12";

interface HoveredProperty {
  property: PropertyWithMetrics;
  metricValue: number | null;
  x: number;
  y: number;
}

export default function MapView() {
  const mapRef = useRef<MapRef>(null);

  const [properties, setProperties] = useState<PropertyWithMetrics[]>([]);
  const [geojson, setGeojson] = useState<FeatureCollection | null>(null);
  const [stats, setStats] = useState<CommunityStats | null>(null);
  const [selectedMetric, setSelectedMetric] = useState<MetricKey>("total_return_pct");
  const [mapStyle, setMapStyle] = useState(STYLE_DARK);
  const [hovered, setHovered] = useState<HoveredProperty | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Fetch all data on mount
  useEffect(() => {
    async function fetchData() {
      try {
        const [propRes, geoRes, statsRes] = await Promise.all([
          fetch("/api/properties"),
          fetch("/api/geojson"),
          fetch("/api/stats"),
        ]);
        const [propData, geoData, statsData] = await Promise.all([
          propRes.json(),
          geoRes.json(),
          statsRes.json(),
        ]);
        setProperties(propData as PropertyWithMetrics[]);
        setGeojson(geoData as FeatureCollection);
        setStats(statsData.stats as CommunityStats);
      } catch (err) {
        console.error("Failed to fetch data:", err);
      } finally {
        setIsLoading(false);
      }
    }
    fetchData();
  }, []);

  // Build a lookup from pcn -> property for hover tooltips
  const propertyMap = useMemo(() => {
    const lookup = new globalThis.Map<string, PropertyWithMetrics>();
    for (const p of properties) {
      lookup.set(p.pcn, p);
    }
    return lookup;
  }, [properties]);

  // Compute all metric values keyed by pcn
  const metricMap = useMemo(
    () => computePropertyMetrics(properties),
    [properties]
  );

  // Build the enriched GeoJSON with metric values baked into feature properties
  const enrichedGeojson = useMemo(() => {
    if (!geojson) return null;

    const features: Feature<Geometry>[] = geojson.features.map((feature) => {
      const pcn = feature.properties?.pcn as string | undefined;
      const metrics = pcn ? metricMap.get(pcn) : undefined;

      return {
        ...feature,
        properties: {
          ...feature.properties,
          total_return_pct: metrics?.total_return_pct ?? null,
          annualized_return_pct: metrics?.annualized_return_pct ?? null,
          total_gain_dollars: metrics?.total_gain_dollars ?? null,
          price_per_sqft_current: metrics?.price_per_sqft_current ?? null,
          price_per_sqft_purchase: metrics?.price_per_sqft_purchase ?? null,
          estimated_equity: metrics?.estimated_equity ?? null,
          years_held: metrics?.years_held ?? null,
        },
      };
    });

    return { type: "FeatureCollection" as const, features };
  }, [geojson, metricMap]);

  // Compute domain for the currently selected metric
  const domain = useMemo(
    () => getMetricDomain(metricMap, selectedMetric),
    [metricMap, selectedMetric]
  );

  // Determine color type for the selected metric
  const colorType = useMemo(() => {
    const returnMetrics: MetricKey[] = [
      "total_return_pct",
      "annualized_return_pct",
    ];
    return returnMetrics.includes(selectedMetric) ? "return" : "dollar";
  }, [selectedMetric]);

  // Fill layer paint with data-driven color
  const fillLayer = useMemo((): LayerProps => {
    const metricProp = ["get", selectedMetric];
    const [lo, hi] = domain;

    // For return metrics: red (low/negative) -> yellow (mid) -> green (high)
    // For dollar metrics: light blue (low) -> dark blue (high)
    let fillColorExpr: unknown;

    if (colorType === "return") {
      const mid = (lo + hi) / 2;
      fillColorExpr = [
        "case",
        ["==", metricProp, null],
        "rgba(100,116,139,0.3)",
        [
          "interpolate",
          ["linear"],
          metricProp,
          lo,
          "#ef4444",
          mid,
          "#eab308",
          hi,
          "#22c55e",
        ],
      ];
    } else {
      fillColorExpr = [
        "case",
        ["==", metricProp, null],
        "rgba(100,116,139,0.3)",
        [
          "interpolate",
          ["linear"],
          metricProp,
          lo,
          "#7dd3fc",
          hi,
          "#1e3a8a",
        ],
      ];
    }

    return {
      id: "parcels-fill",
      type: "fill",
      paint: {
        "fill-color": fillColorExpr,
        "fill-opacity": 0.7,
      },
    } as LayerProps;
  }, [selectedMetric, domain, colorType]);

  // Outline layer
  const outlineLayer = useMemo(
    (): LayerProps =>
      ({
        id: "parcels-outline",
        type: "line",
        paint: {
          "line-color": "#94a3b8",
          "line-width": 1,
          "line-opacity": 0.5,
        },
      }) as LayerProps,
    []
  );

  // Hover highlight layer
  const highlightLayer = useMemo(
    (): LayerProps =>
      ({
        id: "parcels-highlight",
        type: "line",
        paint: {
          "line-color": "#2dd4bf",
          "line-width": 2.5,
          "line-opacity": 1,
        },
        filter: ["==", ["get", "pcn"], ""],
      }) as LayerProps,
    []
  );

  // Handle mouse move on parcels
  const onMouseMove = useCallback(
    (e: MapMouseEvent) => {
      if (!e.features || e.features.length === 0) {
        setHovered(null);
        if (mapRef.current) {
          mapRef.current.getMap().getCanvas().style.cursor = "";
          mapRef.current.getMap().setFilter("parcels-highlight", ["==", ["get", "pcn"], ""]);
        }
        return;
      }

      const feature = e.features[0];
      const pcn = feature.properties?.pcn as string;
      const property = propertyMap.get(pcn);
      const metrics = metricMap.get(pcn);

      if (property && metrics) {
        setHovered({
          property,
          metricValue: metrics[selectedMetric],
          x: e.point.x,
          y: e.point.y,
        });
      }

      if (mapRef.current) {
        mapRef.current.getMap().getCanvas().style.cursor = "pointer";
        mapRef.current.getMap().setFilter("parcels-highlight", ["==", ["get", "pcn"], pcn]);
      }
    },
    [propertyMap, metricMap, selectedMetric]
  );

  const onMouseLeave = useCallback(() => {
    setHovered(null);
    if (mapRef.current) {
      mapRef.current.getMap().getCanvas().style.cursor = "";
      mapRef.current.getMap().setFilter("parcels-highlight", ["==", ["get", "pcn"], ""]);
    }
  }, []);

  // Toggle satellite/dark
  const toggleStyle = useCallback(() => {
    setMapStyle((s) => (s === STYLE_DARK ? STYLE_SATELLITE : STYLE_DARK));
  }, []);

  if (isLoading) {
    return (
      <div className="flex h-[calc(100vh-4rem)] items-center justify-center">
        <div className="text-center">
          <div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-teal-400 border-t-transparent" />
          <p className="mt-3 text-sm text-slate-400">Loading map data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative h-[calc(100vh-4rem)] w-full">
      <MetricSelector selected={selectedMetric} onChange={setSelectedMetric} />

      <MapGL
        ref={mapRef}
        mapboxAccessToken={MAPBOX_TOKEN}
        initialViewState={{
          latitude: 26.361,
          longitude: -80.147,
          zoom: 16,
        }}
        mapStyle={mapStyle}
        interactiveLayerIds={["parcels-fill"]}
        onMouseMove={onMouseMove}
        onMouseLeave={onMouseLeave}
        style={{ width: "100%", height: "100%" }}
        attributionControl={false}
      >
        {enrichedGeojson && (
          <Source id="parcels" type="geojson" data={enrichedGeojson}>
            <Layer {...fillLayer} />
            <Layer {...outlineLayer} />
            <Layer {...highlightLayer} />
          </Source>
        )}
      </MapGL>

      {hovered && (
        <PropertyTooltip
          property={hovered.property}
          metricValue={hovered.metricValue}
          metricKey={selectedMetric}
          x={hovered.x}
          y={hovered.y}
        />
      )}

      <CommunityStatsBar stats={stats} />

      {/* Style toggle button */}
      <button
        onClick={toggleStyle}
        className="absolute bottom-16 right-4 z-10 rounded-lg border border-white/10 bg-slate-950/90 px-3 py-2 text-xs font-medium text-slate-300 backdrop-blur-md transition-colors hover:bg-slate-800/90 hover:text-white"
        title="Toggle map style"
      >
        {mapStyle === STYLE_DARK ? "Satellite" : "Street"}
      </button>

      {/* Color legend */}
      <div className="absolute bottom-16 left-4 z-10 rounded-lg border border-white/10 bg-slate-950/90 px-3 py-2 backdrop-blur-md">
        <p className="mb-1 text-[10px] font-medium uppercase tracking-wider text-slate-400">
          {colorType === "return" ? "Return" : "Value"}
        </p>
        <div className="flex items-center gap-1">
          <span className="text-[10px] text-slate-400">Low</span>
          <div
            className="h-2.5 w-24 rounded-sm"
            style={{
              background:
                colorType === "return"
                  ? "linear-gradient(to right, #ef4444, #eab308, #22c55e)"
                  : "linear-gradient(to right, #7dd3fc, #1e3a8a)",
            }}
          />
          <span className="text-[10px] text-slate-400">High</span>
        </div>
      </div>
    </div>
  );
}

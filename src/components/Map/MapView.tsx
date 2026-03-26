"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import MapGL, { Source, Layer } from "react-map-gl/mapbox";
import type { MapRef, MapMouseEvent, LayerProps } from "react-map-gl/mapbox";
import type { FeatureCollection, Feature, Geometry, Position } from "geojson";
import type { PropertyWithMetrics, SaleRecord, CommunityStats } from "@/lib/types";

import MetricSelector from "./MetricSelector";
import PropertyTooltip from "./PropertyTooltip";
import CommunityStatsBar from "./CommunityStatsBar";
import PropertyDetailPanel from "@/components/PropertyCard/PropertyDetailPanel";
import {
  type MetricKey,
  computePropertyMetrics,
  getMetricDomain,
} from "./metrics";

const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN ?? "";

/** Compute bounding box [minLng, minLat, maxLng, maxLat] from a GeoJSON FeatureCollection */
function computeBounds(fc: FeatureCollection): [number, number, number, number] | null {
  let minLng = Infinity, minLat = Infinity, maxLng = -Infinity, maxLat = -Infinity;
  let found = false;

  function visitCoord(coord: Position) {
    found = true;
    if (coord[0] < minLng) minLng = coord[0];
    if (coord[1] < minLat) minLat = coord[1];
    if (coord[0] > maxLng) maxLng = coord[0];
    if (coord[1] > maxLat) maxLat = coord[1];
  }

  for (const feature of fc.features) {
    const geom = feature.geometry;
    if (!geom) continue;
    if (geom.type === "Polygon") {
      for (const ring of geom.coordinates) ring.forEach(visitCoord);
    } else if (geom.type === "MultiPolygon") {
      for (const poly of geom.coordinates) for (const ring of poly) ring.forEach(visitCoord);
    }
  }

  return found ? [minLng, minLat, maxLng, maxLat] : null;
}

const STYLE_DARK = "mapbox://styles/mapbox/dark-v11";
const STYLE_SATELLITE = "mapbox://styles/mapbox/satellite-streets-v12";

interface HoveredProperty {
  property: PropertyWithMetrics;
  metricValue: number | null;
  x: number;
  y: number;
}

interface SelectedPropertyData {
  property: PropertyWithMetrics;
  saleHistory: SaleRecord[];
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
  const [mapLoaded, setMapLoaded] = useState(false);

  // Property detail panel state
  const [selectedPcn, setSelectedPcn] = useState<string | null>(null);
  const [selectedData, setSelectedData] = useState<SelectedPropertyData | null>(null);
  const [isPanelLoading, setIsPanelLoading] = useState(false);

  // Flip detection state
  const [flipPcns, setFlipPcns] = useState<Set<string>>(new Set());
  const [showFlips, setShowFlips] = useState(true);

  // Gradient exclusion state
  const [excludedPcns, setExcludedPcns] = useState<Set<string>>(new Set());

  // Fetch all data on mount
  useEffect(() => {
    async function fetchData() {
      try {
        const [propRes, geoRes, statsRes, flipsRes] = await Promise.all([
          fetch("/api/properties"),
          fetch("/api/geojson"),
          fetch("/api/stats"),
          fetch("/api/flips"),
        ]);
        const [propData, geoData, statsData, flipsData] = await Promise.all([
          propRes.json(),
          geoRes.json(),
          statsRes.json(),
          flipsRes.json(),
        ]);
        setProperties(propData as PropertyWithMetrics[]);
        setGeojson(geoData as FeatureCollection);
        setStats(statsData.stats as CommunityStats);

        // Build flip PCN set
        const pcns = new Set<string>();
        for (const flip of flipsData as { pcn: string }[]) {
          pcns.add(flip.pcn);
        }
        setFlipPcns(pcns);
      } catch (err) {
        console.error("Failed to fetch data:", err);
      } finally {
        setIsLoading(false);
      }
    }
    fetchData();
  }, []);

  // Fetch detail data when a parcel is selected
  useEffect(() => {
    if (!selectedPcn) {
      setSelectedData(null);
      return;
    }

    let cancelled = false;
    setIsPanelLoading(true);

    async function fetchDetail() {
      try {
        const res = await fetch(`/api/properties/${encodeURIComponent(selectedPcn!)}`);
        if (!res.ok) {
          console.error("Failed to fetch property detail:", res.status);
          setSelectedPcn(null);
          return;
        }
        const data = await res.json();
        if (!cancelled) {
          setSelectedData({
            property: data.property as PropertyWithMetrics,
            saleHistory: (data.saleHistory ?? []) as SaleRecord[],
          });
        }
      } catch (err) {
        console.error("Failed to fetch property detail:", err);
        if (!cancelled) setSelectedPcn(null);
      } finally {
        if (!cancelled) setIsPanelLoading(false);
      }
    }
    fetchDetail();

    return () => {
      cancelled = true;
    };
  }, [selectedPcn]);

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
          is_flip: pcn ? (flipPcns.has(pcn) ? 1 : 0) : 0,
          is_excluded: pcn ? (excludedPcns.has(pcn) ? 1 : 0) : 0,
        },
      };
    });

    return { type: "FeatureCollection" as const, features };
  }, [geojson, metricMap, flipPcns, excludedPcns]);

  // Compute domain for the currently selected metric (excluding excluded parcels)
  const domain = useMemo(
    () => getMetricDomain(metricMap, selectedMetric, excludedPcns),
    [metricMap, selectedMetric, excludedPcns]
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

    // Base color expression per metric type
    let baseColorExpr: unknown;
    if (colorType === "return") {
      const mid = (lo + hi) / 2;
      baseColorExpr = [
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
      baseColorExpr = [
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

    // Wrap with exclusion check: excluded parcels render gray
    fillColorExpr = [
      "case",
      ["==", ["get", "is_excluded"], 1],
      "rgba(100,116,139,0.4)",
      baseColorExpr,
    ];

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

  // Selected parcel highlight layer (thicker, different color)
  const selectedLayer = useMemo(
    (): LayerProps =>
      ({
        id: "parcels-selected",
        type: "line",
        paint: {
          "line-color": "#f59e0b",
          "line-width": 3.5,
          "line-opacity": 1,
        },
        filter: ["==", ["get", "pcn"], selectedPcn ?? ""],
      }) as LayerProps,
    [selectedPcn]
  );

  // Flip indicator: amber fill overlay (semi-transparent wash)
  const flipFillLayer = useMemo(
    (): LayerProps =>
      ({
        id: "parcels-flip-fill",
        type: "fill",
        paint: {
          "fill-color": "#f59e0b",
          "fill-opacity": 0.25,
        },
        filter: showFlips
          ? ["==", ["get", "is_flip"], 1]
          : ["==", ["get", "is_flip"], -1], // impossible value = hidden
      }) as LayerProps,
    [showFlips]
  );

  // Flip indicator: solid amber border
  const flipOutlineLayer = useMemo(
    (): LayerProps =>
      ({
        id: "parcels-flip-outline",
        type: "line",
        paint: {
          "line-color": "#f59e0b",
          "line-width": 2.5,
          "line-opacity": 0.9,
        },
        filter: showFlips
          ? ["==", ["get", "is_flip"], 1]
          : ["==", ["get", "is_flip"], -1],
      }) as LayerProps,
    [showFlips]
  );

  // Safely set a layer filter only when the map style is loaded
  const safeSetFilter = useCallback((layerId: string, filter: unknown[]) => {
    const map = mapRef.current?.getMap();
    if (map && map.isStyleLoaded() && map.getLayer(layerId)) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      map.setFilter(layerId, filter as any);
    }
  }, []);

  // Handle mouse move on parcels
  const onMouseMove = useCallback(
    (e: MapMouseEvent) => {
      if (!mapLoaded) return;

      if (!e.features || e.features.length === 0) {
        setHovered(null);
        if (mapRef.current) {
          mapRef.current.getMap().getCanvas().style.cursor = "";
          safeSetFilter("parcels-highlight", ["==", ["get", "pcn"], ""]);
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
        safeSetFilter("parcels-highlight", ["==", ["get", "pcn"], pcn]);
      }
    },
    [mapLoaded, propertyMap, metricMap, selectedMetric, safeSetFilter]
  );

  const onMouseLeave = useCallback(() => {
    setHovered(null);
    if (mapRef.current) {
      mapRef.current.getMap().getCanvas().style.cursor = "";
      safeSetFilter("parcels-highlight", ["==", ["get", "pcn"], ""]);
    }
  }, [safeSetFilter]);

  // Handle click on parcels to open detail panel
  const onClick = useCallback(
    (e: MapMouseEvent) => {
      if (!e.features || e.features.length === 0) return;

      const feature = e.features[0];
      const pcn = feature.properties?.pcn as string;
      if (!pcn) return;

      // Toggle: click same parcel closes panel
      if (pcn === selectedPcn) {
        setSelectedPcn(null);
      } else {
        setSelectedPcn(pcn);
      }
    },
    [selectedPcn]
  );

  // Right-click to toggle exclusion from gradient
  const onContextMenu = useCallback(
    (e: MapMouseEvent) => {
      e.preventDefault();
      if (!e.features || e.features.length === 0) return;
      const pcn = e.features[0].properties?.pcn as string;
      if (!pcn) return;

      setExcludedPcns((prev) => {
        const next = new Set(prev);
        if (next.has(pcn)) {
          next.delete(pcn);
        } else {
          next.add(pcn);
        }
        return next;
      });
    },
    []
  );

  // Clear all exclusions
  const clearExclusions = useCallback(() => {
    setExcludedPcns(new Set());
  }, []);

  // Close detail panel
  const handleClosePanel = useCallback(() => {
    setSelectedPcn(null);
  }, []);

  // Handle map style load -- fit bounds to neighborhood
  const onMapLoad = useCallback(() => {
    setMapLoaded(true);
    if (geojson && mapRef.current) {
      const bounds = computeBounds(geojson);
      if (bounds) {
        mapRef.current.fitBounds(
          [[bounds[0], bounds[1]], [bounds[2], bounds[3]]],
          { padding: 40, duration: 0 }
        );
      }
    }
  }, [geojson]);

  // Toggle satellite/dark
  const toggleStyle = useCallback(() => {
    setMapLoaded(false);
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
        onLoad={onMapLoad}
        onMouseMove={onMouseMove}
        onMouseLeave={onMouseLeave}
        onClick={onClick}
        onContextMenu={onContextMenu}
        style={{ width: "100%", height: "100%" }}
        attributionControl={false}
      >
        {enrichedGeojson && (
          <Source id="parcels" type="geojson" data={enrichedGeojson}>
            <Layer {...fillLayer} />
            <Layer {...flipFillLayer} />
            <Layer {...outlineLayer} />
            <Layer {...flipOutlineLayer} />
            <Layer {...highlightLayer} />
            <Layer {...selectedLayer} />
          </Source>
        )}
      </MapGL>

      {hovered && !selectedPcn && (
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
        {flipPcns.size > 0 && (
          <button
            onClick={() => setShowFlips((v) => !v)}
            className="mt-1.5 flex items-center gap-1.5 transition-opacity"
            style={{ opacity: showFlips ? 1 : 0.5 }}
            title={showFlips ? "Click to hide flip indicators" : "Click to show flip indicators"}
          >
            <div className="h-2.5 w-4 rounded-sm border-2 border-amber-500 bg-amber-500/25" />
            <span className="text-[10px] text-slate-400">
              Likely Flip ({flipPcns.size})
            </span>
          </button>
        )}
        {excludedPcns.size > 0 && (
          <div className="mt-1.5 flex items-center gap-1.5">
            <div className="h-2.5 w-4 rounded-sm bg-slate-500/40" />
            <span className="text-[10px] text-slate-400">
              Excluded ({excludedPcns.size})
            </span>
            <button
              onClick={clearExclusions}
              className="text-[10px] text-teal-400 hover:text-teal-300"
            >
              Clear
            </button>
          </div>
        )}
      </div>

      {/* Property detail panel */}
      {selectedPcn && isPanelLoading && (
        <div className="absolute right-0 top-0 z-30 flex h-full w-full max-w-[400px] items-center justify-center border-l border-white/10 bg-slate-800/95 shadow-[-4px_0_24px_rgba(0,0,0,0.4)] backdrop-blur-md animate-slide-in-right">
          <div className="text-center">
            <div className="mx-auto h-6 w-6 animate-spin rounded-full border-2 border-teal-400 border-t-transparent" />
            <p className="mt-2 text-xs text-slate-400">Loading details...</p>
          </div>
        </div>
      )}

      {selectedPcn && selectedData && !isPanelLoading && (
        <PropertyDetailPanel
          property={selectedData.property}
          saleHistory={selectedData.saleHistory}
          onClose={handleClosePanel}
          isFlip={flipPcns.has(selectedPcn)}
        />
      )}
    </div>
  );
}

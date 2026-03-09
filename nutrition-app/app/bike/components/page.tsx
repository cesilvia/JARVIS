"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Navigation from "../../components/Navigation";
import CircuitBackground from "../../hub/CircuitBackground";
import CyclingIcon from "../CyclingIcon";

const hubTheme = {
  primary: "#00D9FF",
  secondary: "#67C7EB",
  background: "#000000",
};

const BIKE_TYPES = ["Road", "Gravel", "MTB", "Hybrid", "TT/Tri", "Other"];
const COMPONENT_CATEGORIES = ["Frame", "Wheels", "Drivetrain", "Brakes", "Cockpit", "Saddle", "Pedals", "Other"];

const BIKE_COLORS = [
  "#000000", "#ffffff", "#c0392b", "#27ae60", "#2980b9", "#8e44ad",
  "#f39c12", "#1abc9c", "#e74c3c", "#3498db", "#9b59b6", "#2ecc71",
];

interface BikeComponent {
  id: string;
  name: string;
  category: string;
  brand?: string;
  model?: string;
  notes?: string;
  installDate?: string;
  mileageAtInstall?: number;
  serviceIntervalMiles?: number;
  weight?: number;
  size?: string;
}

interface BikeAttachment {
  id: string;
  name: string;
  dataUrl: string;
  type: string;
}

interface Bike {
  id: string;
  name: string;
  type: string;
  color?: string;
  notes?: string;
  attachments?: BikeAttachment[];
  components: BikeComponent[];
  stravaGearId?: string;
  totalMiles?: number;
  indoorMiles?: number;
  roadMiles?: number;
  lastSyncAt?: string;
}

const MAX_FILE_SIZE_MB = 2;
const MAX_FILE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;

const STORAGE_KEY = "jarvis-bikes";
const OLD_STORAGE_KEY = "jarvis-bike-components";
const STRAVA_TOKENS_KEY = "jarvis-strava-tokens";
const METERS_TO_MILES = 1 / 1609.34;

interface StravaGearOption {
  id: string;
  name: string;
}

function BikeEditForm({
  bike,
  onSave,
  onCancel,
  bikeTypes,
  bikeColors,
  stravaGearOptions,
}: {
  bike: Bike;
  onSave: (updates: Partial<Pick<Bike, "name" | "type" | "color" | "notes" | "stravaGearId">>) => void;
  onCancel: () => void;
  bikeTypes: string[];
  bikeColors: string[];
  stravaGearOptions: StravaGearOption[];
}) {
  const [name, setName] = useState(bike.name);
  const [type, setType] = useState(bike.type);
  const [color, setColor] = useState(bike.color ?? bikeColors[0]);
  const [notes, setNotes] = useState(bike.notes ?? "");
  const [stravaGearId, setStravaGearId] = useState(bike.stravaGearId ?? "");

  return (
    <div className="mb-4 p-4 rounded-lg border border-[#00D9FF]/30 bg-[rgba(0,217,255,0.05)] space-y-3">
      <div>
        <label className="block text-sm font-medium text-[#67C7EB] mb-1">Bike name *</label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full px-4 py-2 border border-[#00D9FF]/50 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#00D9FF]/50 bg-black/30 text-[#00D9FF]"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-[#67C7EB] mb-1">Type</label>
        <select
          value={type}
          onChange={(e) => setType(e.target.value)}
          className="w-full px-4 py-2 border border-[#00D9FF]/50 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#00D9FF]/50 bg-black/30 text-[#00D9FF]"
        >
          {bikeTypes.map((t) => (
            <option key={t} value={t}>{t}</option>
          ))}
        </select>
      </div>
      <div>
        <label className="block text-sm font-medium text-[#67C7EB] mb-1">Color</label>
        <div className="flex gap-2 flex-wrap">
          {bikeColors.map((hex) => (
            <button
              key={hex}
              type="button"
              onClick={() => setColor(hex)}
              className={`w-8 h-8 rounded-full border-2 transition-all ${
                color === hex ? "border-[#00D9FF] scale-110" : "border-[#00D9FF]/30 hover:border-[#00D9FF]/60"
              }`}
              style={{ backgroundColor: hex }}
              aria-label={`Color ${hex}`}
            />
          ))}
        </div>
      </div>
      <div>
        <label className="block text-sm font-medium text-[#67C7EB] mb-1">Notes</label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Optional notes"
          rows={3}
          className="w-full px-4 py-2 border border-[#00D9FF]/50 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#00D9FF]/50 bg-black/30 text-[#00D9FF] placeholder-[#67C7EB]/50 resize-y"
        />
      </div>
      {stravaGearOptions.length > 0 && (
        <div>
          <label className="block text-sm font-medium text-[#67C7EB] mb-1">Link to Strava bike</label>
          <select
            value={stravaGearId}
            onChange={(e) => setStravaGearId(e.target.value)}
            className="w-full px-4 py-2 border border-[#00D9FF]/50 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#00D9FF]/50 bg-black/30 text-[#00D9FF]"
          >
            <option value="">None</option>
            {stravaGearOptions.map((g) => (
              <option key={g.id} value={g.id}>{g.name}</option>
            ))}
          </select>
        </div>
      )}
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => {
            const trimmed = name.trim();
            if (!trimmed) return;
            onSave({
              name: trimmed,
              type,
              color,
              notes: notes.trim() || undefined,
              stravaGearId: stravaGearId || undefined,
            });
          }}
          className="px-4 py-2 rounded-lg border border-[#00D9FF]/50 bg-[rgba(0,217,255,0.2)] text-[#00D9FF] hover:bg-[rgba(0,217,255,0.3)] text-sm"
        >
          Save
        </button>
        <button type="button" onClick={onCancel} className="px-4 py-2 text-[#67C7EB] hover:text-[#00D9FF] text-sm">
          Cancel
        </button>
      </div>
    </div>
  );
}

function migrateFromOldFormat(): Bike[] {
  if (typeof window === "undefined") return [];
  const old = localStorage.getItem(OLD_STORAGE_KEY);
  if (!old) return [];
  try {
    const parsed = JSON.parse(old);
    if (Array.isArray(parsed) && parsed.length > 0) {
      const bike: Bike = {
        id: crypto.randomUUID(),
        name: "My bike",
        type: "Road",
        attachments: [],
        components: parsed.map((c: { id?: string; name: string; category: string; brand?: string; model?: string; notes?: string }) => ({
          id: c.id || crypto.randomUUID(),
          name: c.name,
          category: c.category,
          brand: c.brand,
          model: c.model,
          notes: c.notes,
        })),
      };
      localStorage.removeItem(OLD_STORAGE_KEY);
      return [bike];
    }
  } catch {
    localStorage.removeItem(OLD_STORAGE_KEY);
  }
  return [];
}

export default function ComponentListPage() {
  const [bikes, setBikes] = useState<Bike[]>([]);
  const [expandedBikeId, setExpandedBikeId] = useState<string | null>(null);
  const [showAddBike, setShowAddBike] = useState(false);
  const [showAddComponent, setShowAddComponent] = useState<string | null>(null);
  const [editingBikeId, setEditingBikeId] = useState<string | null>(null);

  const [newBike, setNewBike] = useState({ name: "", type: BIKE_TYPES[0], color: BIKE_COLORS[0], notes: "" });
  const [newComponent, setNewComponent] = useState({
    name: "",
    category: COMPONENT_CATEGORIES[0],
    brand: "",
    model: "",
    notes: "",
    installDate: "",
    mileageAtInstall: "",
    serviceIntervalMiles: "",
    weight: "",
    size: "",
  });

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        const parsed = JSON.parse(stored) as Bike[];
        setBikes(parsed.map((b) => ({ ...b, attachments: b.attachments || [] })));
      } catch {
        const migrated = migrateFromOldFormat();
        setBikes(migrated);
      }
    } else {
      const migrated = migrateFromOldFormat();
      if (migrated.length > 0) setBikes(migrated);
    }
  }, []);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(bikes));
  }, [bikes]);

  const addBike = () => {
    const name = newBike.name.trim();
    if (!name) return;
    const bike: Bike = {
      id: crypto.randomUUID(),
      name,
      type: newBike.type,
      color: newBike.color,
      notes: newBike.notes.trim() || undefined,
      attachments: [],
      components: [],
    };
    setBikes((prev) => [...prev, bike]);
    setNewBike({ name: "", type: BIKE_TYPES[0], color: BIKE_COLORS[0], notes: "" });
    setShowAddBike(false);
    setExpandedBikeId(bike.id);
  };

  const updateBike = (id: string, updates: Partial<Pick<Bike, "name" | "type" | "color" | "notes" | "stravaGearId">>) => {
    setBikes((prev) =>
      prev.map((b) => (b.id === id ? { ...b, ...updates } : b))
    );
    setEditingBikeId(null);
  };

  const [stravaTokens, setStravaTokens] = useState<{ accessToken: string; refreshToken: string; expiresAt: number } | null>(null);
  const [stravaGearOptions, setStravaGearOptions] = useState<StravaGearOption[]>([]);
  const [stravaSyncing, setStravaSyncing] = useState(false);
  const [stravaError, setStravaError] = useState<string | null>(null);

  useEffect(() => {
    const stored = localStorage.getItem(STRAVA_TOKENS_KEY);
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        if (parsed.accessToken && parsed.refreshToken) {
          setStravaTokens(parsed);
        }
      } catch {
        localStorage.removeItem(STRAVA_TOKENS_KEY);
      }
    }
  }, []);

  useEffect(() => {
    const hash = typeof window !== "undefined" ? window.location.hash : "";
    if (!hash) return;
    const params = new URLSearchParams(hash.slice(1));
    const accessToken = params.get("strava_access_token");
    const refreshToken = params.get("strava_refresh_token");
    const expiresAt = params.get("strava_expires_at");
    if (accessToken && refreshToken && expiresAt) {
      const tokens = { accessToken, refreshToken, expiresAt: parseInt(expiresAt, 10) };
      setStravaTokens(tokens);
      localStorage.setItem(STRAVA_TOKENS_KEY, JSON.stringify(tokens));
      window.history.replaceState(null, "", window.location.pathname + window.location.search);
    }
  }, []);

  useEffect(() => {
    const err = typeof window !== "undefined" ? new URLSearchParams(window.location.search).get("strava_error") : null;
    if (err) {
      const decoded = decodeURIComponent(err);
      const friendly: Record<string, string> = {
        config: "Strava not configured. Add STRAVA_CLIENT_ID and STRAVA_CLIENT_SECRET to .env.local and restart.",
        no_code: "Strava authorization was cancelled or failed. Try connecting again.",
        access_denied: "Strava authorization was denied.",
      };
      setStravaError(friendly[decoded] || decoded);
      window.history.replaceState(null, "", window.location.pathname);
    }
  }, []);

  const disconnectStrava = () => {
    if (confirm("Disconnect Strava? Mileage data will remain but you won't be able to sync.")) {
      setStravaTokens(null);
      setStravaGearOptions([]);
      localStorage.removeItem(STRAVA_TOKENS_KEY);
    }
  };

  const syncFromStrava = async () => {
    if (!stravaTokens?.accessToken) return;
    setStravaSyncing(true);
    setStravaError(null);
    try {
      let accessToken = stravaTokens.accessToken;
      const expiresIn = stravaTokens.expiresAt - Math.floor(Date.now() / 1000);
      if (expiresIn < 3600) {
        const refreshRes = await fetch("/api/strava/refresh", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ refreshToken: stravaTokens.refreshToken }),
        });
        if (refreshRes.ok) {
          const data = await refreshRes.json();
          accessToken = data.accessToken;
          const newTokens = {
            accessToken: data.accessToken,
            refreshToken: data.refreshToken,
            expiresAt: data.expiresAt,
          };
          setStravaTokens(newTokens);
          localStorage.setItem(STRAVA_TOKENS_KEY, JSON.stringify(newTokens));
        }
      }
      const [activitiesRes, gearRes] = await Promise.all([
        fetch("/api/strava/activities", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ accessToken }),
        }),
        fetch("/api/strava/gear", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ accessToken }),
        }),
      ]);

      if (!activitiesRes.ok) {
        const err = await activitiesRes.json().catch(() => ({}));
        throw new Error(err.error || `Activities: ${activitiesRes.status}`);
      }
      if (!gearRes.ok) {
        const err = await gearRes.json().catch(() => ({}));
        throw new Error(err.error || `Gear: ${gearRes.status}`);
      }

      const { activities } = await activitiesRes.json();
      const { gear } = await gearRes.json();

      setStravaGearOptions((gear || []).map((g: { id: string; name: string }) => ({ id: g.id, name: g.name })));

      const byGear: Record<string, { total: number; indoor: number; road: number }> = {};
      for (const a of activities) {
        const gearId = a.gear_id || "unassigned";
        if (!byGear[gearId]) byGear[gearId] = { total: 0, indoor: 0, road: 0 };
        const miles = (a.distance || 0) * METERS_TO_MILES;
        byGear[gearId].total += miles;
        if (a.trainer) {
          byGear[gearId].indoor += miles;
        } else {
          byGear[gearId].road += miles;
        }
      }

      const now = new Date().toISOString();
      setBikes((prev) =>
        prev.map((b) => {
          const gearId = b.stravaGearId;
          if (!gearId || !byGear[gearId]) return b;
          const { total, indoor, road } = byGear[gearId];
          return {
            ...b,
            totalMiles: Math.round(total * 10) / 10,
            indoorMiles: Math.round(indoor * 10) / 10,
            roadMiles: Math.round(road * 10) / 10,
            lastSyncAt: now,
          };
        })
      );
    } catch (err) {
      setStravaError(err instanceof Error ? err.message : "Sync failed");
    } finally {
      setStravaSyncing(false);
    }
  };

  const addAttachment = (bikeId: string, file: File) => {
    if (file.size > MAX_FILE_BYTES) {
      alert(`File too large. Max ${MAX_FILE_SIZE_MB}MB per file.`);
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      const attachment: BikeAttachment = {
        id: crypto.randomUUID(),
        name: file.name,
        dataUrl,
        type: file.type,
      };
      setBikes((prev) =>
        prev.map((b) =>
          b.id === bikeId
            ? { ...b, attachments: [...(b.attachments || []), attachment] }
            : b
        )
      );
    };
    reader.readAsDataURL(file);
  };

  const removeAttachment = (bikeId: string, attachmentId: string) => {
    if (confirm("Remove this attachment?")) {
      setBikes((prev) =>
        prev.map((b) =>
          b.id === bikeId
            ? { ...b, attachments: (b.attachments || []).filter((a) => a.id !== attachmentId) }
            : b
        )
      );
    }
  };

  const removeBike = (id: string) => {
    if (confirm("Remove this bike and all its components?")) {
      setBikes((prev) => prev.filter((b) => b.id !== id));
      if (expandedBikeId === id) setExpandedBikeId(null);
      setEditingBikeId((prev) => (prev === id ? null : prev));
    }
  };

  const addComponent = (bikeId: string) => {
    const name = newComponent.name.trim() || `${newComponent.category} - ${newComponent.brand || newComponent.model || "Unknown"}`.trim();
    if (!name) return;
    const comp: BikeComponent = {
      id: crypto.randomUUID(),
      name,
      category: newComponent.category,
      brand: newComponent.brand.trim() || undefined,
      model: newComponent.model.trim() || undefined,
      notes: newComponent.notes.trim() || undefined,
      installDate: newComponent.installDate || undefined,
      mileageAtInstall: newComponent.mileageAtInstall ? parseInt(newComponent.mileageAtInstall, 10) : undefined,
      serviceIntervalMiles: newComponent.serviceIntervalMiles ? parseInt(newComponent.serviceIntervalMiles, 10) : undefined,
      weight: newComponent.weight ? parseFloat(newComponent.weight) : undefined,
      size: newComponent.size.trim() || undefined,
    };
    setBikes((prev) =>
      prev.map((b) =>
        b.id === bikeId ? { ...b, components: [...b.components, comp] } : b
      )
    );
    setNewComponent({
      name: "",
      category: COMPONENT_CATEGORIES[0],
      brand: "",
      model: "",
      notes: "",
      installDate: "",
      mileageAtInstall: "",
      serviceIntervalMiles: "",
      weight: "",
      size: "",
    });
    setShowAddComponent(null);
  };

  const removeComponent = (bikeId: string, componentId: string) => {
    if (confirm("Remove this component?")) {
      setBikes((prev) =>
        prev.map((b) =>
          b.id === bikeId ? { ...b, components: b.components.filter((c) => c.id !== componentId) } : b
        )
      );
    }
  };

  const getComponentByCategory = (components: BikeComponent[]) =>
    COMPONENT_CATEGORIES.reduce<Record<string, BikeComponent[]>>((acc, cat) => {
      const list = components.filter((c) => c.category === cat);
      if (list.length > 0) acc[cat] = list;
      return acc;
    }, {});

  const totalBikes = bikes.length;
  const totalComponents = bikes.reduce((sum, b) => sum + b.components.length, 0);

  return (
    <div className="min-h-screen hud-scifi-bg relative" style={{ backgroundColor: hubTheme.background, color: hubTheme.primary }}>
      <CircuitBackground />
      <main className="container mx-auto px-4 py-8 max-w-4xl relative z-10">
        <div className="grid grid-cols-3 items-center gap-4 mb-8">
          <div className="flex justify-start w-20 h-20 min-w-20 min-h-20">
            <Navigation />
          </div>
          <h2 className="text-2xl font-semibold hud-text text-center">Component list</h2>
          <div className="flex justify-end">
            <Link href="/bike" title="Cycling" aria-label="Cycling" className="inline-flex items-center justify-center transition-transform hover:scale-110" style={{ width: 80, height: 80, minWidth: 80, minHeight: 80 }}>
              <CyclingIcon className="shrink-0" style={{ width: 80, height: 80, minWidth: 80, minHeight: 80 }} stroke={hubTheme.primary} />
            </Link>
          </div>
        </div>

        {/* Strava */}
        <div className="mb-6 p-4 rounded-lg border border-[#00D9FF]/20 bg-[rgba(0,217,255,0.05)]">
          <h3 className="text-lg font-semibold text-[#00D9FF] mb-2">Mileage from Strava</h3>
          {stravaError && (
            <p className="text-red-400 text-sm mb-2">{stravaError}</p>
          )}
          {stravaTokens ? (
            <div className="flex flex-wrap gap-2 items-center">
              <span className="text-[#67C7EB] text-sm">Connected to Strava</span>
              <button
                type="button"
                onClick={syncFromStrava}
                disabled={stravaSyncing}
                className="px-4 py-2 rounded-lg border border-[#00D9FF]/50 bg-[rgba(0,217,255,0.15)] text-[#00D9FF] hover:bg-[rgba(0,217,255,0.25)] text-sm disabled:opacity-50"
              >
                {stravaSyncing ? "Syncing…" : "Sync from Strava"}
              </button>
              <button
                type="button"
                onClick={disconnectStrava}
                className="px-4 py-2 text-[#67C7EB] hover:text-[#00D9FF] text-sm"
              >
                Disconnect
              </button>
            </div>
          ) : (
            <a
              href="/api/strava/auth"
              className="inline-block px-4 py-2 rounded-lg border border-[#00D9FF]/50 bg-[rgba(0,217,255,0.15)] text-[#00D9FF] hover:bg-[rgba(0,217,255,0.25)] text-sm"
            >
              Connect Strava
            </a>
          )}
          <p className="text-[#67C7EB]/80 text-xs mt-2">
            Link each bike to a Strava bike in Edit mode. Sync to pull total, indoor, and road miles.
          </p>
          <p className="text-[#67C7EB]/60 text-xs mt-1">
            Setup: Add STRAVA_CLIENT_ID and STRAVA_CLIENT_SECRET to .env.local. In Strava API settings, set Authorization Callback Domain to <code className="bg-black/30 px-1 rounded">localhost</code> for local dev.
          </p>
        </div>

        {/* Quick stats */}
        {(totalBikes > 0 || totalComponents > 0) && (
          <div className="flex gap-4 mb-6 text-sm text-[#67C7EB]">
            <span>{totalBikes} bike{totalBikes !== 1 ? "s" : ""}</span>
            <span>{totalComponents} component{totalComponents !== 1 ? "s" : ""}</span>
          </div>
        )}

        <div className="hud-card rounded-lg p-6 mb-6 border border-[#00D9FF]/20">
          <div className="flex items-center justify-center relative mb-4">
            <h3 className="text-lg font-semibold text-[#00D9FF]">Bikes and parts</h3>
            <button
              type="button"
              onClick={() => setShowAddBike(!showAddBike)}
              className="absolute right-0 px-4 py-2 rounded-lg border border-[#00D9FF]/50 bg-[rgba(0,217,255,0.15)] text-[#00D9FF] hover:bg-[rgba(0,217,255,0.25)] text-sm transition-colors"
            >
              {showAddBike ? "Cancel" : "Add bike"}
            </button>
          </div>

          {showAddBike && (
            <div className="mb-6 p-4 rounded-lg border border-[#00D9FF]/30 bg-[rgba(0,217,255,0.05)] space-y-3">
              <div>
                <label className="block text-sm font-medium text-[#67C7EB] mb-1">Bike name *</label>
                <input
                  type="text"
                  value={newBike.name}
                  onChange={(e) => setNewBike({ ...newBike, name: e.target.value })}
                  placeholder="e.g., Road bike, Gravel rig"
                  className="w-full px-4 py-2 border border-[#00D9FF]/50 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#00D9FF]/50 bg-black/30 text-[#00D9FF] placeholder-[#67C7EB]/50"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-[#67C7EB] mb-1">Type</label>
                  <select
                    value={newBike.type}
                    onChange={(e) => setNewBike({ ...newBike, type: e.target.value })}
                    className="w-full px-4 py-2 border border-[#00D9FF]/50 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#00D9FF]/50 bg-black/30 text-[#00D9FF]"
                  >
                    {BIKE_TYPES.map((t) => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-[#67C7EB] mb-1">Color</label>
                  <div className="flex gap-2 flex-wrap items-center">
                    {BIKE_COLORS.map((hex) => (
                      <button
                        key={hex}
                        type="button"
                        onClick={() => setNewBike({ ...newBike, color: hex })}
                        className={`w-8 h-8 rounded-full border-2 transition-all ${
                          newBike.color === hex ? "border-[#00D9FF] scale-110" : "border-[#00D9FF]/30 hover:border-[#00D9FF]/60"
                        }`}
                        style={{ backgroundColor: hex }}
                        aria-label={`Color ${hex}`}
                      />
                    ))}
                  </div>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-[#67C7EB] mb-1">Notes</label>
                <textarea
                  value={newBike.notes}
                  onChange={(e) => setNewBike({ ...newBike, notes: e.target.value })}
                  placeholder="Optional notes about this bike"
                  rows={3}
                  className="w-full px-4 py-2 border border-[#00D9FF]/50 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#00D9FF]/50 bg-black/30 text-[#00D9FF] placeholder-[#67C7EB]/50 resize-y"
                />
              </div>
              <button
                type="button"
                onClick={addBike}
                className="px-4 py-2 rounded-lg border border-[#00D9FF]/50 bg-[rgba(0,217,255,0.2)] text-[#00D9FF] hover:bg-[rgba(0,217,255,0.3)] text-sm"
              >
                Add bike
              </button>
            </div>
          )}

          {bikes.length === 0 ? (
            <p className="text-[#67C7EB] text-center py-8">No bikes yet. Add a bike to start tracking components.</p>
          ) : (
            <div className="space-y-3">
              {bikes.map((bike) => {
                const isExpanded = expandedBikeId === bike.id;
                const byCategory = getComponentByCategory(bike.components);
                const orderedCats = COMPONENT_CATEGORIES.filter((c) => (byCategory[c]?.length ?? 0) > 0);

                return (
                  <div
                    key={bike.id}
                    className="rounded-lg border border-[#00D9FF]/20 bg-[rgba(0,217,255,0.05)] overflow-hidden"
                  >
                    <button
                      type="button"
                      onClick={() => setExpandedBikeId(isExpanded ? null : bike.id)}
                      className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-[rgba(0,217,255,0.08)] transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        {bike.color && (
                          <div
                            className="w-6 h-6 rounded-full border border-[#00D9FF]/30 flex-shrink-0"
                            style={{ backgroundColor: bike.color }}
                          />
                        )}
                        <div>
                          <span className="font-semibold text-[#00D9FF]">{bike.name}</span>
                          <span className="text-[#67C7EB] text-sm ml-2">{bike.type}</span>
                        </div>
                        <span className="text-[#67C7EB] text-xs">
                          {bike.components.length} component{bike.components.length !== 1 ? "s" : ""}
                        </span>
                        {(bike.totalMiles != null || bike.indoorMiles != null || bike.roadMiles != null) && (
                          <span className="text-[#67C7EB] text-xs">
                            · {(bike.totalMiles ?? 0).toFixed(1)} mi total
                            {bike.indoorMiles != null && bike.indoorMiles > 0 && ` · ${bike.indoorMiles.toFixed(1)} indoor`}
                            {bike.roadMiles != null && bike.roadMiles > 0 && ` · ${bike.roadMiles.toFixed(1)} road`}
                            {bike.lastSyncAt && (
                              <span className="opacity-75"> (synced {new Date(bike.lastSyncAt).toLocaleDateString()})</span>
                            )}
                          </span>
                        )}
                      </div>
                      <span className="text-[#67C7EB] text-lg">{isExpanded ? "−" : "+"}</span>
                    </button>

                    {isExpanded && (
                      <div className="px-4 pb-4 pt-0 border-t border-[#00D9FF]/10">
                        <div className="flex flex-wrap justify-end gap-2 mt-2 mb-3">
                          <button
                            type="button"
                            onClick={() => setEditingBikeId(editingBikeId === bike.id ? null : bike.id)}
                            className="px-3 py-1.5 rounded border border-[#00D9FF]/50 bg-[rgba(0,217,255,0.15)] text-[#00D9FF] hover:bg-[rgba(0,217,255,0.25)] text-sm"
                          >
                            {editingBikeId === bike.id ? "Cancel edit" : "Edit bike"}
                          </button>
                          <button
                            type="button"
                            onClick={() => setShowAddComponent(showAddComponent === bike.id ? null : bike.id)}
                            className="px-3 py-1.5 rounded border border-[#00D9FF]/50 bg-[rgba(0,217,255,0.15)] text-[#00D9FF] hover:bg-[rgba(0,217,255,0.25)] text-sm"
                          >
                            {showAddComponent === bike.id ? "Cancel" : "Add component"}
                          </button>
                          <button
                            type="button"
                            onClick={() => removeBike(bike.id)}
                            className="px-3 py-1.5 text-red-400 hover:text-red-300 text-sm"
                          >
                            Remove bike
                          </button>
                        </div>

                        {editingBikeId === bike.id && (
                          <BikeEditForm
                            bike={bike}
                            onSave={(updates) => updateBike(bike.id, updates)}
                            onCancel={() => setEditingBikeId(null)}
                            bikeTypes={BIKE_TYPES}
                            bikeColors={BIKE_COLORS}
                            stravaGearOptions={stravaGearOptions}
                          />
                        )}

                        {editingBikeId !== bike.id && (bike.notes || (bike.attachments?.length ?? 0) > 0) && (
                          <div className="mb-4 space-y-3">
                            {bike.notes && (
                              <div className="p-3 rounded-lg border border-[#00D9FF]/20 bg-[rgba(0,217,255,0.03)]">
                                <div className="text-xs font-semibold text-[#67C7EB] mb-1">Notes</div>
                                <p className="text-sm text-[#00D9FF]/90 whitespace-pre-wrap">{bike.notes}</p>
                              </div>
                            )}
                            {(bike.attachments?.length ?? 0) > 0 && (
                              <div className="p-3 rounded-lg border border-[#00D9FF]/20 bg-[rgba(0,217,255,0.03)]">
                                <div className="text-xs font-semibold text-[#67C7EB] mb-2">Attachments</div>
                                <div className="flex flex-wrap gap-2">
                                  {(bike.attachments || []).map((a) => (
                                    <div key={a.id} className="flex items-center gap-2">
                                      {a.type.startsWith("image/") ? (
                                        <a href={a.dataUrl} target="_blank" rel="noopener noreferrer" className="block">
                                          <img src={a.dataUrl} alt={a.name} className="h-16 w-auto rounded border border-[#00D9FF]/30 object-cover" />
                                        </a>
                                      ) : (
                                        <a href={a.dataUrl} download={a.name} className="text-[#00D9FF] hover:underline text-sm truncate max-w-[120px]">
                                          📎 {a.name}
                                        </a>
                                      )}
                                      <button
                                        type="button"
                                        onClick={() => removeAttachment(bike.id, a.id)}
                                        className="text-red-400 hover:text-red-300 text-xs"
                                        aria-label="Remove attachment"
                                      >
                                        ×
                                      </button>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        )}

                        {editingBikeId === bike.id && (
                          <div className="mb-4 p-4 rounded-lg border border-[#00D9FF]/30 bg-[rgba(0,217,255,0.05)]">
                            <div className="text-sm font-medium text-[#67C7EB] mb-2">Attach files (max {MAX_FILE_SIZE_MB}MB each)</div>
                            <input
                              type="file"
                              accept="image/*,.pdf"
                              onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) addAttachment(bike.id, file);
                                e.target.value = "";
                              }}
                              className="block w-full text-sm text-[#67C7EB] file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:bg-[rgba(0,217,255,0.2)] file:text-[#00D9FF] hover:file:bg-[rgba(0,217,255,0.3)]"
                            />
                            {(bike.attachments?.length ?? 0) > 0 && (
                              <div className="mt-2 flex flex-wrap gap-2">
                                {(bike.attachments || []).map((a) => (
                                  <div key={a.id} className="flex items-center gap-1 text-xs">
                                    <span className="text-[#67C7EB] truncate max-w-[100px]">{a.name}</span>
                                    <button type="button" onClick={() => removeAttachment(bike.id, a.id)} className="text-red-400 hover:text-red-300">×</button>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        )}

                        {editingBikeId !== bike.id && (
                          <div className="mb-4">
                            <label className="block text-xs font-medium text-[#67C7EB] mb-1">Attach files</label>
                            <input
                              type="file"
                              accept="image/*,.pdf"
                              onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) addAttachment(bike.id, file);
                                e.target.value = "";
                              }}
                              className="block w-full text-sm text-[#67C7EB] file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:bg-[rgba(0,217,255,0.2)] file:text-[#00D9FF] hover:file:bg-[rgba(0,217,255,0.3)]"
                            />
                          </div>
                        )}

                        {showAddComponent === bike.id && (
                          <div className="mb-4 p-4 rounded-lg border border-[#00D9FF]/30 bg-[rgba(0,217,255,0.05)] space-y-3">
                            <div>
                              <label className="block text-sm font-medium text-[#67C7EB] mb-1">Name *</label>
                              <input
                                type="text"
                                value={newComponent.name}
                                onChange={(e) => setNewComponent({ ...newComponent, name: e.target.value })}
                                placeholder="e.g., Carbon wheels, Ultegra groupset"
                                className="w-full px-4 py-2 border border-[#00D9FF]/50 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#00D9FF]/50 bg-black/30 text-[#00D9FF] placeholder-[#67C7EB]/50"
                              />
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-[#67C7EB] mb-1">Category</label>
                              <select
                                value={newComponent.category}
                                onChange={(e) => setNewComponent({ ...newComponent, category: e.target.value })}
                                className="w-full px-4 py-2 border border-[#00D9FF]/50 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#00D9FF]/50 bg-black/30 text-[#00D9FF]"
                              >
                                {COMPONENT_CATEGORIES.map((c) => (
                                  <option key={c} value={c}>{c}</option>
                                ))}
                              </select>
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                              <div>
                                <label className="block text-sm font-medium text-[#67C7EB] mb-1">Brand</label>
                                <input
                                  type="text"
                                  value={newComponent.brand}
                                  onChange={(e) => setNewComponent({ ...newComponent, brand: e.target.value })}
                                  placeholder="e.g., Shimano"
                                  className="w-full px-4 py-2 border border-[#00D9FF]/50 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#00D9FF]/50 bg-black/30 text-[#00D9FF] placeholder-[#67C7EB]/50"
                                />
                              </div>
                              <div>
                                <label className="block text-sm font-medium text-[#67C7EB] mb-1">Model</label>
                                <input
                                  type="text"
                                  value={newComponent.model}
                                  onChange={(e) => setNewComponent({ ...newComponent, model: e.target.value })}
                                  placeholder="e.g., Ultegra R8100"
                                  className="w-full px-4 py-2 border border-[#00D9FF]/50 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#00D9FF]/50 bg-black/30 text-[#00D9FF] placeholder-[#67C7EB]/50"
                                />
                              </div>
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                              <div>
                                <label className="block text-sm font-medium text-[#67C7EB] mb-1">Size</label>
                                <input
                                  type="text"
                                  value={newComponent.size}
                                  onChange={(e) => setNewComponent({ ...newComponent, size: e.target.value })}
                                  placeholder="e.g., 54cm, 120mm"
                                  className="w-full px-4 py-2 border border-[#00D9FF]/50 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#00D9FF]/50 bg-black/30 text-[#00D9FF] placeholder-[#67C7EB]/50"
                                />
                              </div>
                              <div>
                                <label className="block text-sm font-medium text-[#67C7EB] mb-1">Weight (g)</label>
                                <input
                                  type="number"
                                  value={newComponent.weight}
                                  onChange={(e) => setNewComponent({ ...newComponent, weight: e.target.value })}
                                  placeholder="Optional"
                                  className="w-full px-4 py-2 border border-[#00D9FF]/50 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#00D9FF]/50 bg-black/30 text-[#00D9FF] placeholder-[#67C7EB]/50"
                                />
                              </div>
                            </div>
                            <div className="grid grid-cols-3 gap-3">
                              <div>
                                <label className="block text-sm font-medium text-[#67C7EB] mb-1">Install date</label>
                                <input
                                  type="date"
                                  value={newComponent.installDate}
                                  onChange={(e) => setNewComponent({ ...newComponent, installDate: e.target.value })}
                                  className="w-full px-4 py-2 border border-[#00D9FF]/50 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#00D9FF]/50 bg-black/30 text-[#00D9FF]"
                                />
                              </div>
                              <div>
                                <label className="block text-sm font-medium text-[#67C7EB] mb-1">Mileage at install</label>
                                <input
                                  type="number"
                                  value={newComponent.mileageAtInstall}
                                  onChange={(e) => setNewComponent({ ...newComponent, mileageAtInstall: e.target.value })}
                                  placeholder="mi"
                                  className="w-full px-4 py-2 border border-[#00D9FF]/50 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#00D9FF]/50 bg-black/30 text-[#00D9FF] placeholder-[#67C7EB]/50"
                                />
                              </div>
                              <div>
                                <label className="block text-sm font-medium text-[#67C7EB] mb-1">Service interval (mi)</label>
                                <input
                                  type="number"
                                  value={newComponent.serviceIntervalMiles}
                                  onChange={(e) => setNewComponent({ ...newComponent, serviceIntervalMiles: e.target.value })}
                                  placeholder="e.g., 2000"
                                  className="w-full px-4 py-2 border border-[#00D9FF]/50 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#00D9FF]/50 bg-black/30 text-[#00D9FF] placeholder-[#67C7EB]/50"
                                />
                              </div>
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-[#67C7EB] mb-1">Notes</label>
                              <input
                                type="text"
                                value={newComponent.notes}
                                onChange={(e) => setNewComponent({ ...newComponent, notes: e.target.value })}
                                placeholder="Optional"
                                className="w-full px-4 py-2 border border-[#00D9FF]/50 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#00D9FF]/50 bg-black/30 text-[#00D9FF] placeholder-[#67C7EB]/50"
                              />
                            </div>
                            <button
                              type="button"
                              onClick={() => addComponent(bike.id)}
                              className="px-4 py-2 rounded-lg border border-[#00D9FF]/50 bg-[rgba(0,217,255,0.2)] text-[#00D9FF] hover:bg-[rgba(0,217,255,0.3)] text-sm"
                            >
                              Add component
                            </button>
                          </div>
                        )}

                        {bike.components.length === 0 && showAddComponent !== bike.id ? (
                          <p className="text-[#67C7EB]/80 text-sm py-4">No components yet. Add parts to this bike.</p>
                        ) : (
                          <div className="space-y-4">
                            {orderedCats.map((cat) => (
                              <div key={cat}>
                                <h4 className="text-xs font-semibold text-[#67C7EB] mb-2 uppercase tracking-wide">{cat}</h4>
                                <ul className="space-y-2">
                                  {(byCategory[cat] || []).map((c) => (
                                    <li
                                      key={c.id}
                                      className="flex items-start justify-between px-3 py-2 rounded-lg border border-[#00D9FF]/20 bg-[rgba(0,217,255,0.03)]"
                                    >
                                      <div className="min-w-0 flex-1">
                                        <span className="font-medium text-[#00D9FF]">{c.name}</span>
                                        {(c.brand || c.model) && (
                                          <span className="text-[#67C7EB] text-sm ml-2">
                                            {[c.brand, c.model].filter(Boolean).join(" ")}
                                          </span>
                                        )}
                                        <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-1 text-xs text-[#67C7EB]/80">
                                          {c.size && <span>Size: {c.size}</span>}
                                          {c.weight != null && <span>{c.weight}g</span>}
                                          {c.installDate && <span>Installed: {c.installDate}</span>}
                                          {c.serviceIntervalMiles != null && (
                                            <span>Service every {c.serviceIntervalMiles} mi</span>
                                          )}
                                        </div>
                                        {c.notes && (
                                          <p className="text-xs text-[#67C7EB]/70 mt-0.5">{c.notes}</p>
                                        )}
                                      </div>
                                      <button
                                        type="button"
                                        onClick={() => removeComponent(bike.id, c.id)}
                                        className="text-red-400 hover:text-red-300 text-xs px-2 py-1 flex-shrink-0"
                                        aria-label="Remove"
                                      >
                                        Remove
                                      </button>
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

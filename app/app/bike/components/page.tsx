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
const STRAVA_GEAR_KEY = "jarvis-strava-gear";

interface StravaGearOption {
  id: string;
  name: string;
}

function BikeEditForm({
  bike,
  onSave,
  onCancel,
  bikeTypes,
  stravaGearOptions,
}: {
  bike: Bike;
  onSave: (updates: Partial<Pick<Bike, "name" | "type" | "notes" | "stravaGearId">>) => void;
  onCancel: () => void;
  bikeTypes: string[];
  stravaGearOptions: StravaGearOption[];
}) {
  const [name, setName] = useState(bike.name);
  const [type, setType] = useState(bike.type);
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

function ComponentEditForm({
  component,
  onSave,
  onCancel,
}: {
  component: BikeComponent;
  onSave: (updates: Partial<Omit<BikeComponent, "id">>) => void;
  onCancel: () => void;
}) {
  const [name, setName] = useState(component.name);
  const [category, setCategory] = useState(component.category);
  const [brand, setBrand] = useState(component.brand ?? "");
  const [model, setModel] = useState(component.model ?? "");
  const [size, setSize] = useState(component.size ?? "");
  const [weight, setWeight] = useState(component.weight != null ? String(component.weight) : "");
  const [installDate, setInstallDate] = useState(component.installDate ?? "");
  const [mileageAtInstall, setMileageAtInstall] = useState(component.mileageAtInstall != null ? String(component.mileageAtInstall) : "");
  const [serviceIntervalMiles, setServiceIntervalMiles] = useState(component.serviceIntervalMiles != null ? String(component.serviceIntervalMiles) : "");
  const [notes, setNotes] = useState(component.notes ?? "");

  return (
    <div className="p-4 rounded-lg border border-[#00D9FF]/30 bg-[rgba(0,217,255,0.05)] space-y-3">
      <div>
        <label className="block text-sm font-medium text-[#67C7EB] mb-1">Name *</label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full px-4 py-2 border border-[#00D9FF]/50 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#00D9FF]/50 bg-black/30 text-[#00D9FF]"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-[#67C7EB] mb-1">Category</label>
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
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
          <input type="text" value={brand} onChange={(e) => setBrand(e.target.value)} placeholder="e.g., Shimano" className="w-full px-4 py-2 border border-[#00D9FF]/50 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#00D9FF]/50 bg-black/30 text-[#00D9FF] placeholder-[#67C7EB]/50" />
        </div>
        <div>
          <label className="block text-sm font-medium text-[#67C7EB] mb-1">Model</label>
          <input type="text" value={model} onChange={(e) => setModel(e.target.value)} placeholder="e.g., Ultegra R8100" className="w-full px-4 py-2 border border-[#00D9FF]/50 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#00D9FF]/50 bg-black/30 text-[#00D9FF] placeholder-[#67C7EB]/50" />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-sm font-medium text-[#67C7EB] mb-1">Size</label>
          <input type="text" value={size} onChange={(e) => setSize(e.target.value)} placeholder="e.g., 54cm, 120mm" className="w-full px-4 py-2 border border-[#00D9FF]/50 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#00D9FF]/50 bg-black/30 text-[#00D9FF] placeholder-[#67C7EB]/50" />
        </div>
        <div>
          <label className="block text-sm font-medium text-[#67C7EB] mb-1">Weight (g)</label>
          <input type="number" value={weight} onChange={(e) => setWeight(e.target.value)} placeholder="Optional" className="w-full px-4 py-2 border border-[#00D9FF]/50 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#00D9FF]/50 bg-black/30 text-[#00D9FF] placeholder-[#67C7EB]/50" />
        </div>
      </div>
      <div className="grid grid-cols-3 gap-3">
        <div>
          <label className="block text-sm font-medium text-[#67C7EB] mb-1">Install date</label>
          <input type="date" value={installDate} onChange={(e) => setInstallDate(e.target.value)} className="w-full px-4 py-2 border border-[#00D9FF]/50 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#00D9FF]/50 bg-black/30 text-[#00D9FF]" />
        </div>
        <div>
          <label className="block text-sm font-medium text-[#67C7EB] mb-1">Mileage at install</label>
          <input type="number" value={mileageAtInstall} onChange={(e) => setMileageAtInstall(e.target.value)} placeholder="mi" className="w-full px-4 py-2 border border-[#00D9FF]/50 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#00D9FF]/50 bg-black/30 text-[#00D9FF] placeholder-[#67C7EB]/50" />
        </div>
        <div>
          <label className="block text-sm font-medium text-[#67C7EB] mb-1">Service interval (mi)</label>
          <input type="number" value={serviceIntervalMiles} onChange={(e) => setServiceIntervalMiles(e.target.value)} placeholder="e.g., 2000" className="w-full px-4 py-2 border border-[#00D9FF]/50 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#00D9FF]/50 bg-black/30 text-[#00D9FF] placeholder-[#67C7EB]/50" />
        </div>
      </div>
      <div>
        <label className="block text-sm font-medium text-[#67C7EB] mb-1">Notes</label>
        <input type="text" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Optional" className="w-full px-4 py-2 border border-[#00D9FF]/50 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#00D9FF]/50 bg-black/30 text-[#00D9FF] placeholder-[#67C7EB]/50" />
      </div>
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => {
            const trimmed = name.trim();
            if (!trimmed) return;
            onSave({
              name: trimmed,
              category,
              brand: brand.trim() || undefined,
              model: model.trim() || undefined,
              size: size.trim() || undefined,
              weight: weight ? parseFloat(weight) : undefined,
              installDate: installDate || undefined,
              mileageAtInstall: mileageAtInstall ? parseInt(mileageAtInstall, 10) : undefined,
              serviceIntervalMiles: serviceIntervalMiles ? parseInt(serviceIntervalMiles, 10) : undefined,
              notes: notes.trim() || undefined,
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
  const [isLoaded, setIsLoaded] = useState(false);
  const [expandedBikeId, setExpandedBikeId] = useState<string | null>(null);
  const [showAddBike, setShowAddBike] = useState(false);
  const [showAddComponent, setShowAddComponent] = useState<string | null>(null);
  const [editingBikeId, setEditingBikeId] = useState<string | null>(null);
  const [editingComponentId, setEditingComponentId] = useState<string | null>(null);
  const [showDetailsId, setShowDetailsId] = useState<string | null>(null);

  const [newBike, setNewBike] = useState({ name: "", type: BIKE_TYPES[0], notes: "" });
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
    setIsLoaded(true);
  }, []);

  useEffect(() => {
    if (!isLoaded) return;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(bikes));
  }, [bikes, isLoaded]);

  const addBike = () => {
    const name = newBike.name.trim();
    if (!name) return;
    const bike: Bike = {
      id: crypto.randomUUID(),
      name,
      type: newBike.type,
      notes: newBike.notes.trim() || undefined,
      attachments: [],
      components: [],
    };
    setBikes((prev) => [...prev, bike]);
    setNewBike({ name: "", type: BIKE_TYPES[0], notes: "" });
    setShowAddBike(false);
    setExpandedBikeId(bike.id);
  };

  const updateBike = (id: string, updates: Partial<Pick<Bike, "name" | "type" | "notes" | "stravaGearId">>) => {
    setBikes((prev) =>
      prev.map((b) => (b.id === id ? { ...b, ...updates } : b))
    );
    setEditingBikeId(null);
  };

  const [stravaGearOptions, setStravaGearOptions] = useState<StravaGearOption[]>([]);

  useEffect(() => {
    const stored = localStorage.getItem(STRAVA_GEAR_KEY);
    if (stored) {
      try {
        setStravaGearOptions(JSON.parse(stored));
      } catch { /* ignore */ }
    }
  }, []);

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

  const updateComponent = (bikeId: string, componentId: string, updates: Partial<Omit<BikeComponent, "id">>) => {
    setBikes((prev) =>
      prev.map((b) =>
        b.id === bikeId
          ? { ...b, components: b.components.map((c) => (c.id === componentId ? { ...c, ...updates } : c)) }
          : b
      )
    );
    setEditingComponentId(null);
  };

  const getComponentByCategory = (components: BikeComponent[]) =>
    COMPONENT_CATEGORIES.reduce<Record<string, BikeComponent[]>>((acc, cat) => {
      const list = components.filter((c) => c.category === cat);
      if (list.length > 0) acc[cat] = list;
      return acc;
    }, {});


  return (
    <div className="min-h-screen hud-scifi-bg relative" style={{ backgroundColor: hubTheme.background, color: hubTheme.primary }}>
      <CircuitBackground />
      <main className="container mx-auto px-4 py-8 max-w-4xl relative z-10">
        <div className="grid grid-cols-3 items-center gap-4 mb-8">
          <div className="flex justify-start w-20 h-20 min-w-20 min-h-20">
            <Navigation />
          </div>
          <h2 className="text-2xl font-semibold hud-text text-center">Component List</h2>
          <div className="flex justify-end">
            <Link href="/bike" title="Cycling" aria-label="Cycling" className="inline-flex items-center justify-center transition-transform hover:scale-110" style={{ width: 80, height: 80, minWidth: 80, minHeight: 80 }}>
              <CyclingIcon className="shrink-0" style={{ width: 80, height: 80, minWidth: 80, minHeight: 80 }} stroke={hubTheme.primary} />
            </Link>
          </div>
        </div>


        <div className="hud-card rounded-lg p-6 mb-6 border border-[#00D9FF]/20">
          <div className="flex items-center justify-center relative mb-4">
            <h3 className="text-lg font-semibold text-[#00D9FF]">Bikes and Components</h3>
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
                            stravaGearOptions={stravaGearOptions}
                          />
                        )}

                        {editingBikeId !== bike.id && (bike.notes || (bike.attachments?.length ?? 0) > 0) && (
                          <div className="mb-4">
                            <button
                              type="button"
                              onClick={() => setShowDetailsId(showDetailsId === bike.id ? null : bike.id)}
                              className="flex items-center gap-1 text-xs text-[#67C7EB] hover:text-[#00D9FF] transition-colors mb-2"
                            >
                              <span>{showDetailsId === bike.id ? "▾" : "▸"}</span>
                              <span>Notes &amp; Attachments</span>
                            </button>
                            {showDetailsId === bike.id && (
                              <div className="space-y-3">
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
                                  {(byCategory[cat] || []).map((c) =>
                                    editingComponentId === c.id ? (
                                      <li key={c.id}>
                                        <ComponentEditForm
                                          component={c}
                                          onSave={(updates) => updateComponent(bike.id, c.id, updates)}
                                          onCancel={() => setEditingComponentId(null)}
                                        />
                                      </li>
                                    ) : (
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
                                        <div className="flex flex-col gap-1 flex-shrink-0">
                                          <button
                                            type="button"
                                            onClick={() => setEditingComponentId(c.id)}
                                            className="text-[#00D9FF] hover:text-[#67C7EB] text-xs px-2 py-1"
                                          >
                                            Edit
                                          </button>
                                          <button
                                            type="button"
                                            onClick={() => removeComponent(bike.id, c.id)}
                                            className="text-red-400 hover:text-red-300 text-xs px-2 py-1"
                                          >
                                            Remove
                                          </button>
                                        </div>
                                      </li>
                                    )
                                  )}
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

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

const GEAR_CATEGORIES = ["Helmets", "Jersey", "Bibs", "Shoes"];
const JERSEY_SLEEVE_LENGTHS = ["Short sleeve", "Long sleeve"];
const JERSEY_WEATHER = ["Warm", "Cool", "Cold"];

const MAX_FILE_SIZE_MB = 2;
const MAX_FILE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;

interface GearAttachment {
  id: string;
  name: string;
  dataUrl: string;
  type: string;
}

interface GearItem {
  id: string;
  name: string;
  category: string;
  brand?: string;
  size?: string;
  notes?: string;
  attachments?: GearAttachment[];
  purchaseDate?: string;
  replaceReminderYears?: number;
  // Jersey-only
  sleeveLength?: string;
  colors?: string[];
  weather?: string;
}

const STORAGE_KEY = "jarvis-gear-inventory";
export const GEAR_STORAGE_KEY = STORAGE_KEY;
const MIN_HELMET_REPLACE_YEARS = 3;
const MAX_HELMET_REPLACE_YEARS = 5;
const DEFAULT_HELMET_REPLACE_YEARS = 3;

function clampHelmetYears(val: number): number {
  return Math.min(MAX_HELMET_REPLACE_YEARS, Math.max(MIN_HELMET_REPLACE_YEARS, val));
}

export default function GearInventoryPage() {
  const [items, setItems] = useState<GearItem[]>([]);
  const [showAdd, setShowAdd] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterCategory, setFilterCategory] = useState<string>("");
  const [editingId, setEditingId] = useState<string | null>(null);

  const [newItem, setNewItem] = useState({
    name: "",
    category: GEAR_CATEGORIES[0],
    brand: "",
    size: "",
    notes: "",
    purchaseDate: "",
    replaceReminderYears: String(DEFAULT_HELMET_REPLACE_YEARS),
    sleeveLength: "",
    colors: [] as string[],
    weather: "",
  });

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        const parsed = JSON.parse(stored) as (GearItem & { color?: string })[];
        const migrated = parsed.map((i) => {
          if (i.color != null && !(i.colors && i.colors.length)) {
            const { color, ...rest } = i;
            return { ...rest, colors: [color] } as GearItem;
          }
          return i;
        });
        setItems(migrated);
      } catch {
        setItems([]);
      }
    }
  }, []);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  }, [items]);

  const addItem = () => {
    let name = newItem.name.trim();
    if (newItem.category === "Jersey" && !name) {
      name = "Jersey";
    } else if (!name) {
      return;
    }
    const replaceYears =
      newItem.category === "Helmets" && newItem.replaceReminderYears
        ? clampHelmetYears(parseInt(newItem.replaceReminderYears, 10) || DEFAULT_HELMET_REPLACE_YEARS)
        : undefined;
    const item: GearItem = {
      id: crypto.randomUUID(),
      name,
      category: newItem.category,
      brand: newItem.brand.trim() || undefined,
      size: newItem.size.trim() || undefined,
      notes: newItem.notes.trim() || undefined,
      attachments: [],
      purchaseDate: newItem.purchaseDate.trim() || undefined,
      replaceReminderYears: replaceYears,
      sleeveLength: newItem.category === "Jersey" ? (newItem.sleeveLength.trim() || undefined) : undefined,
      colors: newItem.category === "Jersey" ? newItem.colors.filter((c) => c.trim()).length ? newItem.colors.map((c) => c.trim()) : undefined : undefined,
      weather: newItem.category === "Jersey" ? (newItem.weather.trim() || undefined) : undefined,
    };
    setItems((prev) => [...prev, item]);
    setNewItem({
      name: "",
      category: GEAR_CATEGORIES[0],
      brand: "",
      size: "",
      notes: "",
      purchaseDate: "",
      replaceReminderYears: String(DEFAULT_HELMET_REPLACE_YEARS),
      sleeveLength: "",
      colors: [],
      weather: "",
    });
    setShowAdd(false);
  };

  const updateItem = (id: string, updates: Partial<GearItem>) => {
    setItems((prev) => prev.map((i) => (i.id === id ? { ...i, ...updates } : i)));
    setEditingId(null);
  };

  const removeItem = (id: string) => {
    if (confirm("Delete this item? This cannot be undone.")) {
      setItems((prev) => prev.filter((i) => i.id !== id));
      setEditingId(null);
    }
  };

  const addAttachment = (itemId: string, file: File) => {
    if (file.size > MAX_FILE_BYTES) {
      alert(`File too large. Max ${MAX_FILE_SIZE_MB}MB per file.`);
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const attachment: GearAttachment = {
        id: crypto.randomUUID(),
        name: file.name,
        dataUrl: reader.result as string,
        type: file.type,
      };
      setItems((prev) =>
        prev.map((i) =>
          i.id === itemId ? { ...i, attachments: [...(i.attachments || []), attachment] } : i
        )
      );
    };
    reader.readAsDataURL(file);
  };

  const removeAttachment = (itemId: string, attachmentId: string) => {
    setItems((prev) =>
      prev.map((i) =>
        i.id === itemId ? { ...i, attachments: (i.attachments || []).filter((a) => a.id !== attachmentId) } : i
      )
    );
  };

  const filteredItems = items.filter((item) => {
    const matchesSearch =
      !searchQuery ||
      item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (item.brand || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
      (item.notes || "").toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = !filterCategory || item.category === filterCategory;
    return matchesSearch && matchesCategory;
  });

  const categorySet = new Set(GEAR_CATEGORIES);
  filteredItems.forEach((i) => categorySet.add(i.category));
  const byCategory = [...categorySet].reduce<Record<string, GearItem[]>>((acc, cat) => {
    const list = filteredItems.filter((item) => item.category === cat);
    if (list.length > 0) acc[cat] = list;
    return acc;
  }, {});

  const orderedCategories = GEAR_CATEGORIES.filter((c) => (byCategory[c]?.length ?? 0) > 0);
  const legacyCategories = [...categorySet].filter((c) => !GEAR_CATEGORIES.includes(c));
  legacyCategories.forEach((c) => orderedCategories.push(c));

  return (
    <div className="min-h-screen hud-scifi-bg relative" style={{ backgroundColor: hubTheme.background, color: hubTheme.primary }}>
      <CircuitBackground />
      <main className="container mx-auto px-4 py-8 max-w-4xl relative z-10">
        <div className="grid grid-cols-3 items-center gap-4 mb-8">
          <div className="flex justify-start w-20 h-20 min-w-20 min-h-20">
            <Navigation />
          </div>
          <h2 className="text-2xl font-semibold hud-text text-center">Gear inventory</h2>
          <div className="flex justify-end">
            <Link href="/bike" title="Cycling" aria-label="Cycling" className="inline-flex items-center justify-center transition-transform hover:scale-110" style={{ width: 80, height: 80, minWidth: 80, minHeight: 80 }}>
              <CyclingIcon className="shrink-0" style={{ width: 80, height: 80, minWidth: 80, minHeight: 80 }} stroke={hubTheme.primary} />
            </Link>
          </div>
        </div>

        <div className="hud-card rounded-lg p-6 mb-6 border border-[#00D9FF]/20">
          <div className="flex items-center justify-center relative mb-4">
            <h3 className="text-lg font-semibold text-[#00D9FF]">Helmets, kit, tools</h3>
            <button
              type="button"
              onClick={() => setShowAdd(!showAdd)}
              className="absolute right-0 px-4 py-2 rounded-lg border border-[#00D9FF]/50 bg-[rgba(0,217,255,0.15)] text-[#00D9FF] hover:bg-[rgba(0,217,255,0.25)] text-sm transition-colors"
            >
              {showAdd ? "Cancel" : "Add item"}
            </button>
          </div>

          {showAdd && (
            <div className="mb-6 p-4 rounded-lg border border-[#00D9FF]/30 bg-[rgba(0,217,255,0.05)] space-y-3">
              <div>
                <label className="block text-sm font-medium text-[#67C7EB] mb-1">
                  Name {newItem.category !== "Jersey" ? "*" : ""}
                </label>
                <input
                  type="text"
                  value={newItem.name}
                  onChange={(e) => setNewItem({ ...newItem, name: e.target.value })}
                  placeholder={newItem.category === "Jersey" ? "Optional (e.g., Summer race)" : "e.g., Giro Helmet MIPS"}
                  className="w-full px-4 py-2 border border-[#00D9FF]/50 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#00D9FF]/50 bg-black/30 text-[#00D9FF] placeholder-[#67C7EB]/50"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-[#67C7EB] mb-1">Category</label>
                <select
                  value={newItem.category}
                  onChange={(e) => setNewItem({ ...newItem, category: e.target.value })}
                  className="w-full px-4 py-2 border border-[#00D9FF]/50 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#00D9FF]/50 bg-black/30 text-[#00D9FF]"
                >
                  {GEAR_CATEGORIES.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-[#67C7EB] mb-1">Brand</label>
                  <input
                    type="text"
                    value={newItem.brand}
                    onChange={(e) => setNewItem({ ...newItem, brand: e.target.value })}
                    placeholder="e.g., Giro"
                    className="w-full px-4 py-2 border border-[#00D9FF]/50 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#00D9FF]/50 bg-black/30 text-[#00D9FF] placeholder-[#67C7EB]/50"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[#67C7EB] mb-1">Size</label>
                  <input
                    type="text"
                    value={newItem.size}
                    onChange={(e) => setNewItem({ ...newItem, size: e.target.value })}
                    placeholder="e.g., M, 42"
                    className="w-full px-4 py-2 border border-[#00D9FF]/50 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#00D9FF]/50 bg-black/30 text-[#00D9FF] placeholder-[#67C7EB]/50"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-[#67C7EB] mb-1">Date purchased</label>
                  <input
                    type="date"
                    value={newItem.purchaseDate}
                    onChange={(e) => setNewItem({ ...newItem, purchaseDate: e.target.value })}
                    className="w-full px-4 py-2 border border-[#00D9FF]/50 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#00D9FF]/50 bg-black/30 text-[#00D9FF]"
                  />
                </div>
                {newItem.category === "Helmets" && (
                  <div>
                    <label className="block text-sm font-medium text-[#67C7EB] mb-1">Remind to replace after (years)</label>
                    <input
                      type="number"
                      min={MIN_HELMET_REPLACE_YEARS}
                      max={MAX_HELMET_REPLACE_YEARS}
                      value={newItem.replaceReminderYears}
                      onChange={(e) => setNewItem({ ...newItem, replaceReminderYears: e.target.value })}
                      placeholder="3"
                      className="w-full px-4 py-2 border border-[#00D9FF]/50 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#00D9FF]/50 bg-black/30 text-[#00D9FF] placeholder-[#67C7EB]/50"
                    />
                    <p className="text-xs text-[#67C7EB]/70 mt-1">Helmets should be replaced every 3–5 years.</p>
                  </div>
                )}
              </div>
              {newItem.category === "Jersey" && (
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-sm font-medium text-[#67C7EB] mb-1">Sleeve length</label>
                      <select
                        value={newItem.sleeveLength}
                        onChange={(e) => setNewItem({ ...newItem, sleeveLength: e.target.value })}
                        className="w-full px-4 py-2 border border-[#00D9FF]/50 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#00D9FF]/50 bg-black/30 text-[#00D9FF]"
                      >
                        <option value="">—</option>
                        {JERSEY_SLEEVE_LENGTHS.map((s) => (
                          <option key={s} value={s}>{s}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-[#67C7EB] mb-1">Weather</label>
                      <select
                        value={newItem.weather}
                        onChange={(e) => setNewItem({ ...newItem, weather: e.target.value })}
                        className="w-full px-4 py-2 border border-[#00D9FF]/50 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#00D9FF]/50 bg-black/30 text-[#00D9FF]"
                      >
                        <option value="">—</option>
                        {JERSEY_WEATHER.map((w) => (
                          <option key={w} value={w}>{w}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-[#67C7EB] mb-1">Colors</label>
                    {newItem.colors.map((c, i) => (
                      <div key={i} className="flex gap-2 mb-2">
                        <input
                          type="text"
                          value={c}
                          onChange={(e) => {
                            const next = [...newItem.colors];
                            next[i] = e.target.value;
                            setNewItem({ ...newItem, colors: next });
                          }}
                          placeholder="e.g., Red"
                          className="flex-1 px-4 py-2 border border-[#00D9FF]/50 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#00D9FF]/50 bg-black/30 text-[#00D9FF] placeholder-[#67C7EB]/50"
                        />
                        <button
                          type="button"
                          onClick={() => setNewItem({ ...newItem, colors: newItem.colors.filter((_, j) => j !== i) })}
                          className="px-3 py-2 text-red-400 hover:text-red-300 text-sm"
                        >
                          ×
                        </button>
                      </div>
                    ))}
                    <button
                      type="button"
                      onClick={() => setNewItem({ ...newItem, colors: [...newItem.colors, ""] })}
                      className="text-sm text-[#67C7EB] hover:text-[#00D9FF]"
                    >
                      + Add color
                    </button>
                  </div>
                </div>
              )}
              <div>
                <label className="block text-sm font-medium text-[#67C7EB] mb-1">Notes</label>
                <input
                  type="text"
                  value={newItem.notes}
                  onChange={(e) => setNewItem({ ...newItem, notes: e.target.value })}
                  placeholder="Optional"
                  className="w-full px-4 py-2 border border-[#00D9FF]/50 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#00D9FF]/50 bg-black/30 text-[#00D9FF] placeholder-[#67C7EB]/50"
                />
              </div>
              <button
                type="button"
                onClick={addItem}
                className="px-4 py-2 rounded-lg border border-[#00D9FF]/50 bg-[rgba(0,217,255,0.2)] text-[#00D9FF] hover:bg-[rgba(0,217,255,0.3)] text-sm"
              >
                Add
              </button>
            </div>
          )}

          {/* Filter & search */}
          {items.length > 0 && (
            <div className="mb-4 flex flex-wrap gap-2">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by name, brand, notes..."
                className="flex-1 min-w-[160px] px-3 py-2 border border-[#00D9FF]/50 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#00D9FF]/50 bg-black/30 text-[#00D9FF] placeholder-[#67C7EB]/50 text-sm"
              />
              <select
                value={filterCategory}
                onChange={(e) => setFilterCategory(e.target.value)}
                className="px-3 py-2 border border-[#00D9FF]/50 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#00D9FF]/50 bg-black/30 text-[#00D9FF] text-sm"
              >
                <option value="">All categories</option>
                {GEAR_CATEGORIES.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
          )}

          {items.length === 0 ? (
            <p className="text-[#67C7EB] text-center py-8">No gear yet. Add helmets, kit, tools, and more.</p>
          ) : filteredItems.length === 0 ? (
            <p className="text-[#67C7EB] text-center py-8">No items match your search.</p>
          ) : (
            <div className="space-y-6">
              {orderedCategories.map((cat) => (
                <div key={cat}>
                  <h4 className="text-xs font-semibold text-[#67C7EB] mb-2 uppercase tracking-wide">{cat}</h4>
                  <ul className="space-y-2">
                    {(byCategory[cat] || []).map((item) => (
                      <li
                        key={item.id}
                        className="rounded-lg border border-[#00D9FF]/20 bg-[rgba(0,217,255,0.05)] overflow-hidden"
                      >
                        {editingId === item.id ? (
                          <GearEditForm
                            item={item}
                            onSave={(updates) => updateItem(item.id, updates)}
                            onCancel={() => setEditingId(null)}
                            onDelete={() => removeItem(item.id)}
                            onAddAttachment={(file) => addAttachment(item.id, file)}
                            onRemoveAttachment={(aid) => removeAttachment(item.id, aid)}
                            categories={GEAR_CATEGORIES}
                          />
                        ) : (
                          <div className="flex items-center justify-between px-4 py-3">
                            <div>
                              <span className="font-medium text-[#00D9FF]">
                                {item.category === "Jersey" && !item.name?.trim() ? "Jersey" : item.name}
                              </span>
                              {item.brand && (
                                <span className="text-[#67C7EB] text-sm ml-2">{item.brand}</span>
                              )}
                              {(item.size || (item.category === "Jersey" && item.colors?.length)) && (
                                <span className="text-[#67C7EB]/80 text-xs ml-2">
                                  {item.category === "Jersey" && item.colors?.length
                                    ? [item.size, item.colors.join(", ")].filter(Boolean).join(" · ")
                                    : item.size}
                                </span>
                              )}
                              {item.category === "Jersey" && (item.brand || item.sleeveLength || item.weather) && (
                                <span className="text-[#67C7EB]/80 text-xs ml-2 block">
                                  {[item.brand, item.sleeveLength, item.weather].filter(Boolean).join(" · ")}
                                </span>
                              )}
                              {item.purchaseDate && (
                                <span className="text-[#67C7EB]/80 text-xs ml-2 block">
                                  Purchased {new Date(item.purchaseDate).toLocaleDateString()}
                                </span>
                              )}
                              {item.category === "Helmets" && item.purchaseDate && item.replaceReminderYears && (
                                <span className="text-[#67C7EB]/80 text-xs ml-2 block">
                                  Replace by {(() => {
                                    const d = new Date(item.purchaseDate!);
                                    d.setFullYear(d.getFullYear() + item.replaceReminderYears!);
                                    return d.toLocaleDateString();
                                  })()}
                                </span>
                              )}
                              {item.notes && (
                                <p className="text-xs text-[#67C7EB]/70 mt-0.5">{item.notes}</p>
                              )}
                              {(item.attachments?.length ?? 0) > 0 && (
                                <span className="text-xs text-[#67C7EB]/60 mt-1 block">
                                  {(item.attachments?.length ?? 0)} photo(s)
                                </span>
                              )}
                            </div>
                            <button
                              type="button"
                              onClick={() => setEditingId(item.id)}
                              className="px-3 py-1 rounded border border-[#00D9FF]/50 bg-[rgba(0,217,255,0.15)] text-[#00D9FF] hover:bg-[rgba(0,217,255,0.25)] text-sm"
                            >
                              Edit
                            </button>
                          </div>
                        )}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

function GearEditForm({
  item,
  onSave,
  onCancel,
  onDelete,
  onAddAttachment,
  onRemoveAttachment,
  categories,
  conditions,
}: {
  item: GearItem;
  onSave: (updates: Partial<GearItem>) => void;
  onCancel: () => void;
  onDelete: () => void;
  onAddAttachment: (file: File) => void;
  onRemoveAttachment: (attachmentId: string) => void;
  categories: string[];
}) {
  const [name, setName] = useState(item.name);
  const [category, setCategory] = useState(item.category);
  const [brand, setBrand] = useState(item.brand ?? "");
  const [size, setSize] = useState(item.size ?? "");
  const [notes, setNotes] = useState(item.notes ?? "");
  const [purchaseDate, setPurchaseDate] = useState(item.purchaseDate ?? "");
  const [replaceReminderYears, setReplaceReminderYears] = useState(
    item.replaceReminderYears ? String(item.replaceReminderYears) : String(DEFAULT_HELMET_REPLACE_YEARS)
  );
  const [sleeveLength, setSleeveLength] = useState(item.sleeveLength ?? "");
  const [colors, setColors] = useState<string[]>(item.colors?.length ? [...item.colors] : []);
  const [weather, setWeather] = useState(item.weather ?? "");

  return (
    <div className="p-4 space-y-3">
      <div>
        <label className="block text-xs font-medium text-[#67C7EB] mb-1">Name {category !== "Jersey" ? "*" : ""}</label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder={category === "Jersey" ? "Optional" : ""}
          className="w-full px-3 py-2 border border-[#00D9FF]/50 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#00D9FF]/50 bg-black/30 text-[#00D9FF] text-sm"
        />
      </div>
      <div>
        <label className="block text-xs font-medium text-[#67C7EB] mb-1">Category</label>
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          className="w-full px-3 py-2 border border-[#00D9FF]/50 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#00D9FF]/50 bg-black/30 text-[#00D9FF] text-sm"
        >
          {categories.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="block text-xs font-medium text-[#67C7EB] mb-1">Brand</label>
          <input
            type="text"
            value={brand}
            onChange={(e) => setBrand(e.target.value)}
            className="w-full px-3 py-2 border border-[#00D9FF]/50 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#00D9FF]/50 bg-black/30 text-[#00D9FF] text-sm"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-[#67C7EB] mb-1">Size</label>
          <input
            type="text"
            value={size}
            onChange={(e) => setSize(e.target.value)}
            className="w-full px-3 py-2 border border-[#00D9FF]/50 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#00D9FF]/50 bg-black/30 text-[#00D9FF] text-sm"
          />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="block text-xs font-medium text-[#67C7EB] mb-1">Date purchased</label>
          <input
            type="date"
            value={purchaseDate}
            onChange={(e) => setPurchaseDate(e.target.value)}
            className="w-full px-3 py-2 border border-[#00D9FF]/50 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#00D9FF]/50 bg-black/30 text-[#00D9FF] text-sm"
          />
        </div>
        {category === "Helmets" && (
          <div>
            <label className="block text-xs font-medium text-[#67C7EB] mb-1">Remind to replace after (years)</label>
            <input
              type="number"
              min={MIN_HELMET_REPLACE_YEARS}
              max={MAX_HELMET_REPLACE_YEARS}
              value={replaceReminderYears}
              onChange={(e) => setReplaceReminderYears(e.target.value)}
              className="w-full px-3 py-2 border border-[#00D9FF]/50 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#00D9FF]/50 bg-black/30 text-[#00D9FF] text-sm"
            />
            <p className="text-xs text-[#67C7EB]/70 mt-1">Helmets should be replaced every 3–5 years.</p>
          </div>
        )}
      </div>
      {category === "Jersey" && (
        <div className="space-y-2">
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-xs font-medium text-[#67C7EB] mb-1">Sleeve length</label>
              <select
                value={sleeveLength}
                onChange={(e) => setSleeveLength(e.target.value)}
                className="w-full px-3 py-2 border border-[#00D9FF]/50 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#00D9FF]/50 bg-black/30 text-[#00D9FF] text-sm"
              >
                <option value="">—</option>
                {JERSEY_SLEEVE_LENGTHS.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-[#67C7EB] mb-1">Weather</label>
              <select
                value={weather}
                onChange={(e) => setWeather(e.target.value)}
                className="w-full px-3 py-2 border border-[#00D9FF]/50 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#00D9FF]/50 bg-black/30 text-[#00D9FF] text-sm"
              >
                <option value="">—</option>
                {JERSEY_WEATHER.map((w) => (
                  <option key={w} value={w}>{w}</option>
                ))}
              </select>
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-[#67C7EB] mb-1">Colors</label>
            {colors.map((c, i) => (
              <div key={i} className="flex gap-2 mb-1">
                <input
                  type="text"
                  value={c}
                  onChange={(e) => {
                    const next = [...colors];
                    next[i] = e.target.value;
                    setColors(next);
                  }}
                  placeholder="e.g., Red"
                  className="flex-1 px-3 py-2 border border-[#00D9FF]/50 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#00D9FF]/50 bg-black/30 text-[#00D9FF] text-sm"
                />
                <button type="button" onClick={() => setColors(colors.filter((_, j) => j !== i))} className="px-2 py-1 text-red-400 hover:text-red-300 text-xs">×</button>
              </div>
            ))}
            <button type="button" onClick={() => setColors([...colors, ""])} className="text-xs text-[#67C7EB] hover:text-[#00D9FF]">+ Add color</button>
          </div>
        </div>
      )}
      <div>
        <label className="block text-xs font-medium text-[#67C7EB] mb-1">Notes</label>
        <input
          type="text"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          className="w-full px-3 py-2 border border-[#00D9FF]/50 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#00D9FF]/50 bg-black/30 text-[#00D9FF] text-sm"
        />
      </div>
      <div>
        <label className="block text-xs font-medium text-[#67C7EB] mb-1">Photos (max {MAX_FILE_SIZE_MB}MB each)</label>
        <input
          type="file"
          accept="image/*"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) onAddAttachment(file);
            e.target.value = "";
          }}
          className="block w-full text-sm text-[#67C7EB] file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:bg-[rgba(0,217,255,0.2)] file:text-[#00D9FF] hover:file:bg-[rgba(0,217,255,0.3)]"
        />
        {(item.attachments?.length ?? 0) > 0 && (
          <div className="mt-2 flex flex-wrap gap-2">
            {(item.attachments || []).map((a) => (
              <div key={a.id} className="flex items-center gap-1">
                {a.type.startsWith("image/") ? (
                  <a href={a.dataUrl} target="_blank" rel="noopener noreferrer">
                    <img src={a.dataUrl} alt={a.name} className="h-12 w-auto rounded border border-[#00D9FF]/30" />
                  </a>
                ) : (
                  <span className="text-xs text-[#67C7EB]">{a.name}</span>
                )}
                <button
                  type="button"
                  onClick={() => onRemoveAttachment(a.id)}
                  className="text-red-400 hover:text-red-300 text-xs"
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
      <div className="flex gap-2 pt-2">
        <button
          type="button"
          onClick={() =>
            (name.trim() || category === "Jersey") &&
            onSave({
              name: category === "Jersey" && !name.trim() ? "Jersey" : name.trim(),
              category,
              brand: brand.trim() || undefined,
              size: size.trim() || undefined,
              notes: notes.trim() || undefined,
              purchaseDate: purchaseDate.trim() || undefined,
              replaceReminderYears: category === "Helmets" ? clampHelmetYears(parseInt(replaceReminderYears, 10) || DEFAULT_HELMET_REPLACE_YEARS) : undefined,
              sleeveLength: category === "Jersey" ? (sleeveLength.trim() || undefined) : undefined,
              colors: category === "Jersey" && colors.filter((c) => c.trim()).length ? colors.map((c) => c.trim()) : undefined,
              weather: category === "Jersey" ? (weather.trim() || undefined) : undefined,
            })
          }
          className="px-3 py-1.5 rounded border border-[#00D9FF]/50 bg-[rgba(0,217,255,0.2)] text-[#00D9FF] hover:bg-[rgba(0,217,255,0.3)] text-sm"
        >
          Save
        </button>
        <button type="button" onClick={onCancel} className="px-3 py-1.5 text-[#67C7EB] hover:text-[#00D9FF] text-sm">
          Cancel
        </button>
        <button type="button" onClick={onDelete} className="px-3 py-1.5 text-red-400 hover:text-red-300 text-sm">
          Delete
        </button>
      </div>
    </div>
  );
}

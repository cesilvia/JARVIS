"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import {
  RideNote, RideNoteOption,
  MEAL_TIMING_OPTIONS, GI_SEVERITY_OPTIONS, CRAMPING_OPTIONS, LBS_TO_KG,
} from "./types";
import * as api from "../../lib/api-client";

const hubTheme = { primary: "#00D9FF", secondary: "#67C7EB" };

interface RideNotesPanelProps {
  activityId: number;
  activityName: string;
  trainer: boolean;
  movingTime: number; // seconds
  averageWatts?: number;
}

const DEBOUNCE_MS = 1500;

export default function RideNotesPanel({ activityId, activityName, trainer, movingTime, averageWatts }: RideNotesPanelProps) {
  const [note, setNote] = useState<Partial<RideNote>>({});
  const [options, setOptions] = useState<Record<string, RideNoteOption[]>>({});
  const [saving, setSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<string | null>(null);
  const [sections, setSections] = useState<Record<string, boolean>>({
    effort: true, nutrition: false, preride: false, recovery: false, notes: false,
  });
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const noteRef = useRef(note);
  noteRef.current = note;

  // Load note + options on mount
  useEffect(() => {
    (async () => {
      const [existing, rideTypes, electrolyteProducts] = await Promise.all([
        api.getRideNote(activityId),
        api.getRideNoteOptions("ride_type"),
        api.getRideNoteOptions("electrolyte_product"),
      ]);
      if (existing) {
        setNote(existing);
        setLastSaved(existing.updated_at);
      } else {
        // Auto-fill workout name and indoor/outdoor
        setNote({ workout_name: activityName });
      }
      setOptions({ ride_type: rideTypes, electrolyte_product: electrolyteProducts });
    })();
  }, [activityId, activityName]);

  // Compute derived fields
  const durationHours = movingTime / 3600;
  const carbsPerHour = note.calories_on_bike && durationHours > 0
    ? Math.round((note.calories_on_bike / 4) / durationHours * 10) / 10
    : null;
  const totalFluidOz = note.bottle_count && note.bottle_size_oz
    ? Math.round(note.bottle_count * note.bottle_size_oz * 10) / 10
    : null;
  const wattsPerKg = averageWatts && note.weight_lbs
    ? Math.round((averageWatts / (note.weight_lbs * LBS_TO_KG)) * 100) / 100
    : null;

  // Auto-save with debounce
  const doSave = useCallback(async (data: Partial<RideNote>) => {
    setSaving(true);
    const toSave = {
      ...data,
      carbs_per_hour: data.calories_on_bike && durationHours > 0
        ? Math.round((data.calories_on_bike / 4) / durationHours * 10) / 10
        : null,
      total_fluid_oz: data.bottle_count && data.bottle_size_oz
        ? Math.round(data.bottle_count * data.bottle_size_oz * 10) / 10
        : null,
      watts_per_kg: averageWatts && data.weight_lbs
        ? Math.round((averageWatts / (data.weight_lbs * LBS_TO_KG)) * 100) / 100
        : null,
    };
    await api.saveRideNote(activityId, toSave);
    setSaving(false);
    setLastSaved(new Date().toISOString());
    // Index in LightRAG (fire and forget)
    api.indexRideNoteInRAG(activityId).catch(() => {});
  }, [activityId, durationHours, averageWatts]);

  const updateField = useCallback((field: string, value: unknown) => {
    setNote(prev => {
      const updated = { ...prev, [field]: value === "" ? null : value };
      // Schedule debounced save
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => doSave(updated), DEBOUNCE_MS);
      return updated;
    });
  }, [doSave]);

  const toggleSection = (name: string) => {
    setSections(prev => ({ ...prev, [name]: !prev[name] }));
  };

  // Copy to clipboard
  const handleCopy = () => {
    const lines: string[] = [];
    lines.push(`Ride: ${note.workout_name ?? activityName}`);
    lines.push(`Date: ${new Date().toLocaleDateString()}`);
    lines.push(`Indoor/Outdoor: ${trainer ? "Indoor" : "Outdoor"}`);
    lines.push("");
    lines.push("── Effort ──");
    lines.push(`RPE: ${note.rpe ?? "—"}/10`);
    lines.push(`Ride Type: ${note.ride_type ?? "—"}`);
    lines.push(`Workout Name: ${note.workout_name ?? "—"}`);
    lines.push("");
    lines.push("── Nutrition ──");
    lines.push(`Calories on Bike: ${note.calories_on_bike ?? "—"}`);
    lines.push(`Carbs/hr: ${carbsPerHour ?? "—"} g/hr`);
    lines.push(`Bottles: ${note.bottle_count ?? "—"}`);
    lines.push(`Bottle Size: ${note.bottle_size_oz ?? "—"} oz`);
    lines.push(`Total Fluid: ${totalFluidOz ?? "—"} oz`);
    lines.push(`GI Issues: ${note.gi_issues ?? "—"}`);
    lines.push(`Electrolyte: ${note.electrolyte_mg ?? "—"} mg ${note.electrolyte_product ?? ""}`);
    lines.push("");
    lines.push("── Pre-Ride ──");
    lines.push(`Meal Timing: ${note.meal_timing ?? "—"}`);
    lines.push(`Pre-Ride Carbs: ${note.pre_carbs_g ?? "—"} g`);
    lines.push(`Pre-Ride Protein: ${note.pre_protein_g ?? "—"} g`);
    lines.push(`Pre-Ride Fat: ${note.pre_fat_g ?? "—"} g`);
    lines.push(`Leg Freshness: ${note.leg_freshness ?? "—"}/5`);
    lines.push(`Weight: ${note.weight_lbs ?? "—"} lbs`);
    if (wattsPerKg) lines.push(`Power-to-Weight: ${wattsPerKg} w/kg`);
    lines.push("");
    lines.push("── Recovery ──");
    lines.push(`Sleep Hours: ${note.sleep_hours ?? "—"}`);
    lines.push(`Sleep Quality: ${note.sleep_quality ?? "—"}/10`);
    lines.push(`Cramping: ${note.cramping ?? "—"}`);
    lines.push("");
    lines.push("── Notes ──");
    lines.push(note.notes ?? "—");
    navigator.clipboard.writeText(lines.join("\n"));
  };

  const sectionHeaderClass = (open: boolean) =>
    `flex items-center justify-between w-full px-3 py-2 rounded text-xs font-medium cursor-pointer transition-colors ${
      open
        ? "bg-[rgba(0,217,255,0.15)] text-[#00D9FF]"
        : "text-[#67C7EB] hover:bg-[rgba(0,217,255,0.08)]"
    }`;

  const inputClass = "w-full bg-[rgba(0,217,255,0.05)] border border-[#00D9FF]/20 rounded px-2 py-1.5 text-xs text-[#e0e0e0] focus:outline-none focus:border-[#00D9FF]/50";
  const selectClass = `${inputClass} appearance-none`;
  const labelClass = "text-[10px] text-[#67C7EB] mb-0.5 block";

  return (
    <div className="mt-3 border border-[#00D9FF]/20 rounded-lg overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 bg-[rgba(0,217,255,0.05)]">
        <span className="text-xs font-medium" style={{ color: hubTheme.primary }}>
          Ride Notes
        </span>
        <div className="flex items-center gap-2">
          {saving && <span className="text-[10px] text-[#FFD700]">Saving...</span>}
          {!saving && lastSaved && (
            <span className="text-[10px]" style={{ color: hubTheme.secondary }}>Saved</span>
          )}
          <button
            onClick={handleCopy}
            className="px-2 py-1 rounded text-[10px] border border-[#00D9FF]/30 text-[#00D9FF] hover:bg-[rgba(0,217,255,0.15)] transition-colors"
          >
            Copy
          </button>
        </div>
      </div>

      <div className="p-3 space-y-2">
        {/* Indoor/Outdoor + W/kg display */}
        <div className="flex gap-3 text-[10px] mb-2" style={{ color: hubTheme.secondary }}>
          <span>{trainer ? "Indoor" : "Outdoor"}</span>
          {wattsPerKg && <span>Power-to-Weight: <span style={{ color: hubTheme.primary }}>{wattsPerKg} w/kg</span></span>}
        </div>

        {/* ── EFFORT ── */}
        <div>
          <button onClick={() => toggleSection("effort")} className={sectionHeaderClass(sections.effort)}>
            <span>Effort</span>
            <span>{sections.effort ? "▾" : "▸"}</span>
          </button>
          {sections.effort && (
            <div className="grid grid-cols-3 gap-3 pt-2 px-1">
              {/* RPE Slider */}
              <div>
                <label className={labelClass}>RPE: {note.rpe ?? "—"}/10</label>
                <input
                  type="range" min={1} max={10} step={1}
                  value={note.rpe ?? 5}
                  onChange={(e) => updateField("rpe", Number(e.target.value))}
                  className="w-full accent-[#00D9FF] h-1.5"
                />
                <div className="flex justify-between text-[8px] text-[#67C7EB]/50">
                  <span>Easy</span><span>Max</span>
                </div>
              </div>
              {/* Ride Type */}
              <div>
                <label className={labelClass}>Ride Type</label>
                <select
                  value={note.ride_type ?? ""}
                  onChange={(e) => updateField("ride_type", e.target.value)}
                  className={selectClass}
                >
                  <option value="">—</option>
                  {(options.ride_type ?? []).map(o => (
                    <option key={o.id} value={o.label}>{o.label}</option>
                  ))}
                </select>
              </div>
              {/* Workout Name */}
              <div>
                <label className={labelClass}>Workout Name</label>
                <input
                  type="text"
                  value={note.workout_name ?? ""}
                  onChange={(e) => updateField("workout_name", e.target.value)}
                  className={inputClass}
                  placeholder={activityName}
                />
              </div>
            </div>
          )}
        </div>

        {/* ── NUTRITION ── */}
        <div>
          <button onClick={() => toggleSection("nutrition")} className={sectionHeaderClass(sections.nutrition)}>
            <span>Nutrition</span>
            <span>{sections.nutrition ? "▾" : "▸"}</span>
          </button>
          {sections.nutrition && (
            <div className="grid grid-cols-3 gap-3 pt-2 px-1">
              <div>
                <label className={labelClass}>Calories on Bike</label>
                <input
                  type="number"
                  value={note.calories_on_bike ?? ""}
                  onChange={(e) => updateField("calories_on_bike", e.target.value ? Number(e.target.value) : null)}
                  className={inputClass}
                  placeholder="0"
                />
              </div>
              <div>
                <label className={labelClass}>Carbs/hr (auto)</label>
                <div className={`${inputClass} bg-transparent`}>
                  {carbsPerHour ? `${carbsPerHour} g/hr` : "—"}
                </div>
              </div>
              <div>
                <label className={labelClass}>Bottles</label>
                <input
                  type="number"
                  value={note.bottle_count ?? ""}
                  onChange={(e) => updateField("bottle_count", e.target.value ? Number(e.target.value) : null)}
                  className={inputClass}
                  placeholder="0"
                  min={0}
                  step={1}
                />
              </div>
              <div>
                <label className={labelClass}>Bottle Size (oz)</label>
                <input
                  type="number"
                  value={note.bottle_size_oz ?? ""}
                  onChange={(e) => updateField("bottle_size_oz", e.target.value ? Number(e.target.value) : null)}
                  className={inputClass}
                  placeholder="24"
                  min={0}
                />
              </div>
              <div>
                <label className={labelClass}>Total Fluid (auto)</label>
                <div className={`${inputClass} bg-transparent`}>
                  {totalFluidOz ? `${totalFluidOz} oz` : "—"}
                </div>
              </div>
              <div>
                <label className={labelClass}>GI Issues</label>
                <select
                  value={note.gi_issues ?? ""}
                  onChange={(e) => updateField("gi_issues", e.target.value)}
                  className={selectClass}
                >
                  <option value="">—</option>
                  {GI_SEVERITY_OPTIONS.map(o => (
                    <option key={o} value={o}>{o.charAt(0).toUpperCase() + o.slice(1)}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className={labelClass}>Electrolyte (mg)</label>
                <input
                  type="number"
                  value={note.electrolyte_mg ?? ""}
                  onChange={(e) => updateField("electrolyte_mg", e.target.value ? Number(e.target.value) : null)}
                  className={inputClass}
                  placeholder="0"
                  min={0}
                />
              </div>
              <div>
                <label className={labelClass}>Product</label>
                <select
                  value={note.electrolyte_product ?? ""}
                  onChange={(e) => updateField("electrolyte_product", e.target.value)}
                  className={selectClass}
                >
                  <option value="">—</option>
                  {(options.electrolyte_product ?? []).map(o => (
                    <option key={o.id} value={o.label}>{o.label}</option>
                  ))}
                </select>
              </div>
            </div>
          )}
        </div>

        {/* ── PRE-RIDE ── */}
        <div>
          <button onClick={() => toggleSection("preride")} className={sectionHeaderClass(sections.preride)}>
            <span>Pre-Ride</span>
            <span>{sections.preride ? "▾" : "▸"}</span>
          </button>
          {sections.preride && (
            <div className="grid grid-cols-3 gap-3 pt-2 px-1">
              <div>
                <label className={labelClass}>Meal Timing</label>
                <select
                  value={note.meal_timing ?? ""}
                  onChange={(e) => updateField("meal_timing", e.target.value)}
                  className={selectClass}
                >
                  <option value="">—</option>
                  {MEAL_TIMING_OPTIONS.map(o => (
                    <option key={o} value={o}>{o}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className={labelClass}>Carbs (g)</label>
                <input
                  type="number"
                  value={note.pre_carbs_g ?? ""}
                  onChange={(e) => updateField("pre_carbs_g", e.target.value ? Number(e.target.value) : null)}
                  className={inputClass}
                  placeholder="0"
                  min={0}
                />
              </div>
              <div>
                <label className={labelClass}>Protein (g)</label>
                <input
                  type="number"
                  value={note.pre_protein_g ?? ""}
                  onChange={(e) => updateField("pre_protein_g", e.target.value ? Number(e.target.value) : null)}
                  className={inputClass}
                  placeholder="0"
                  min={0}
                />
              </div>
              <div>
                <label className={labelClass}>Fat (g)</label>
                <input
                  type="number"
                  value={note.pre_fat_g ?? ""}
                  onChange={(e) => updateField("pre_fat_g", e.target.value ? Number(e.target.value) : null)}
                  className={inputClass}
                  placeholder="0"
                  min={0}
                />
              </div>
              <div>
                <label className={labelClass}>Leg Freshness: {note.leg_freshness ?? "—"}/5</label>
                <input
                  type="range" min={1} max={5} step={1}
                  value={note.leg_freshness ?? 3}
                  onChange={(e) => updateField("leg_freshness", Number(e.target.value))}
                  className="w-full accent-[#00D9FF] h-1.5"
                />
                <div className="flex justify-between text-[8px] text-[#67C7EB]/50">
                  <span>Heavy</span><span>Fresh</span>
                </div>
              </div>
              <div>
                <label className={labelClass}>Weight (lbs)</label>
                <input
                  type="number"
                  value={note.weight_lbs ?? ""}
                  onChange={(e) => updateField("weight_lbs", e.target.value ? Number(e.target.value) : null)}
                  className={inputClass}
                  placeholder="0"
                  min={0}
                  step={0.1}
                />
              </div>
            </div>
          )}
        </div>

        {/* ── RECOVERY ── */}
        <div>
          <button onClick={() => toggleSection("recovery")} className={sectionHeaderClass(sections.recovery)}>
            <span>Recovery</span>
            <span>{sections.recovery ? "▾" : "▸"}</span>
          </button>
          {sections.recovery && (
            <div className="grid grid-cols-3 gap-3 pt-2 px-1">
              <div>
                <label className={labelClass}>Sleep Hours</label>
                <input
                  type="number"
                  value={note.sleep_hours ?? ""}
                  onChange={(e) => updateField("sleep_hours", e.target.value ? Number(e.target.value) : null)}
                  className={inputClass}
                  placeholder="0"
                  min={0}
                  max={24}
                  step={0.5}
                />
              </div>
              <div>
                <label className={labelClass}>Sleep Quality: {note.sleep_quality ?? "—"}/10</label>
                <input
                  type="range" min={1} max={10} step={1}
                  value={note.sleep_quality ?? 5}
                  onChange={(e) => updateField("sleep_quality", Number(e.target.value))}
                  className="w-full accent-[#00D9FF] h-1.5"
                />
                <div className="flex justify-between text-[8px] text-[#67C7EB]/50">
                  <span>Poor</span><span>Great</span>
                </div>
              </div>
              <div>
                <label className={labelClass}>Cramping</label>
                <select
                  value={note.cramping ?? ""}
                  onChange={(e) => updateField("cramping", e.target.value)}
                  className={selectClass}
                >
                  <option value="">—</option>
                  {CRAMPING_OPTIONS.map(o => (
                    <option key={o} value={o}>{o.charAt(0).toUpperCase() + o.slice(1)}</option>
                  ))}
                </select>
              </div>
            </div>
          )}
        </div>

        {/* ── NOTES ── */}
        <div>
          <button onClick={() => toggleSection("notes")} className={sectionHeaderClass(sections.notes)}>
            <span>Notes</span>
            <span>{sections.notes ? "▾" : "▸"}</span>
          </button>
          {sections.notes && (
            <div className="pt-2 px-1">
              <textarea
                value={note.notes ?? ""}
                onChange={(e) => updateField("notes", e.target.value)}
                className={`${inputClass} min-h-[80px] resize-y`}
                placeholder="Freeform notes..."
                rows={4}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

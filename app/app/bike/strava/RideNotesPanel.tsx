"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import {
  RideNote, RideNoteOption,
  MEAL_TIMING_OPTIONS, GI_SEVERITY_OPTIONS, CRAMPING_OPTIONS, LBS_TO_KG,
} from "./types";
import * as api from "../../lib/api-client";
import DrumPicker from "./DrumPicker";

const hubTheme = { primary: "#00D9FF", secondary: "#67C7EB" };

interface RideNotesPanelProps {
  activityId: number;
  activityName: string;
  trainer: boolean;
  movingTime: number; // seconds
  averageWatts?: number;
}

const DEBOUNCE_MS = 1500;

// ─── Scale definitions ──────────────────────────────────────────

const RPE_OPTIONS = [
  { value: 1, label: "Easy" },
  { value: 2, label: "Easy-Moderate" },
  { value: 3, label: "Moderate" },
  { value: 4, label: "Moderate-Hard" },
  { value: 5, label: "Hard" },
  { value: 6, label: "Hard-Very Hard" },
  { value: 7, label: "Very Hard" },
  { value: 8, label: "Very Hard-All Out" },
  { value: 9, label: "All Out" },
];

const LEG_FRESHNESS_OPTIONS = [
  { value: 1, label: "Heavy" },
  { value: 2, label: "Heavy-Tired" },
  { value: 3, label: "Tired" },
  { value: 4, label: "Tired-Normal" },
  { value: 5, label: "Normal" },
  { value: 6, label: "Normal-Good" },
  { value: 7, label: "Good" },
  { value: 8, label: "Good-Fresh" },
  { value: 9, label: "Fresh" },
];

const SLEEP_QUALITY_OPTIONS = [
  { value: 1, label: "Terrible" },
  { value: 2, label: "Terrible-Poor" },
  { value: 3, label: "Poor" },
  { value: 4, label: "Poor-OK" },
  { value: 5, label: "OK" },
  { value: 6, label: "OK-Good" },
  { value: 7, label: "Good" },
  { value: 8, label: "Good-Great" },
  { value: 9, label: "Great" },
];

function getLabelForValue(options: { value: number; label: string }[], val: number | null | undefined): string {
  if (val == null) return "";
  return options.find(o => o.value === val)?.label ?? "";
}

// ─── Sleep time helpers ─────────────────────────────────────────

function hoursToHHMM(hours: number | null | undefined): string {
  if (hours == null) return "";
  const h = Math.floor(hours);
  const m = Math.round((hours - h) * 60);
  return `${h}:${String(m).padStart(2, "0")}`;
}

function hhmmToHours(input: string): number | null {
  const trimmed = input.trim();
  if (!trimmed) return null;
  // Accept "7:30" or "7.5"
  if (trimmed.includes(":")) {
    const [hStr, mStr] = trimmed.split(":");
    const h = parseInt(hStr, 10);
    const m = parseInt(mStr || "0", 10);
    if (isNaN(h)) return null;
    return h + (isNaN(m) ? 0 : m / 60);
  }
  const num = parseFloat(trimmed);
  return isNaN(num) ? null : num;
}

export default function RideNotesPanel({ activityId, activityName, trainer, movingTime, averageWatts }: RideNotesPanelProps) {
  const [note, setNote] = useState<Partial<RideNote>>({});
  const [options, setOptions] = useState<Record<string, RideNoteOption[]>>({});
  const [saving, setSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<string | null>(null);
  const [carbsInput, setCarbsInput] = useState("");
  const [electrolyteInput, setElectrolyteInput] = useState("");
  const [sleepInput, setSleepInput] = useState("");
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
        if (existing.calories_on_bike) setCarbsInput(String(existing.calories_on_bike / 4));
        if (existing.electrolyte_g != null) setElectrolyteInput(String(existing.electrolyte_g));
        if (existing.sleep_hours != null) setSleepInput(hoursToHHMM(existing.sleep_hours));
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

  // Evaluate simple math expressions (e.g. "75+75") — only allows numbers and +-*/
  const evalMath = (expr: string): number | null => {
    const cleaned = expr.replace(/\s/g, "");
    if (!cleaned || !/^[\d.+\-*/()]+$/.test(cleaned)) return null;
    try { return Function(`"use strict"; return (${cleaned})`)() as number; } catch { return null; }
  };

  const handleCarbsBlur = () => {
    const grams = evalMath(carbsInput);
    if (grams != null && grams > 0) {
      const rounded = Math.round(grams * 10) / 10;
      setCarbsInput(String(rounded));
      updateField("calories_on_bike", Math.round(rounded * 4));
    } else if (!carbsInput.trim()) {
      updateField("calories_on_bike", null);
    }
  };

  const handleElectrolyteBlur = () => {
    const grams = evalMath(electrolyteInput);
    if (grams != null && grams > 0) {
      const rounded = Math.round(grams * 100) / 100;
      setElectrolyteInput(String(rounded));
      updateField("electrolyte_g", rounded);
    } else if (!electrolyteInput.trim()) {
      updateField("electrolyte_g", null);
    }
  };

  const handleSleepBlur = () => {
    const hours = hhmmToHours(sleepInput);
    if (hours != null && hours > 0) {
      setSleepInput(hoursToHHMM(hours));
      updateField("sleep_hours", Math.round(hours * 100) / 100);
    } else if (!sleepInput.trim()) {
      updateField("sleep_hours", null);
    }
  };

  const fallbackCopy = (text: string) => {
    const ta = document.createElement("textarea");
    ta.value = text;
    ta.style.position = "fixed";
    ta.style.opacity = "0";
    document.body.appendChild(ta);
    ta.focus();
    ta.select();
    document.execCommand("copy");
    document.body.removeChild(ta);
  };

  // Copy to clipboard
  const handleCopy = () => {
    const rpeLabel = getLabelForValue(RPE_OPTIONS, note.rpe);
    const legLabel = getLabelForValue(LEG_FRESHNESS_OPTIONS, note.leg_freshness);
    const sleepLabel = getLabelForValue(SLEEP_QUALITY_OPTIONS, note.sleep_quality);
    const lines: string[] = [];
    lines.push(`Ride: ${note.workout_name ?? activityName}`);
    lines.push(`Date: ${new Date().toLocaleDateString()}`);
    lines.push(`Indoor/Outdoor: ${trainer ? "Indoor" : "Outdoor"}`);
    lines.push("");
    lines.push("── Effort ──");
    lines.push(`RPE: ${note.rpe ?? "—"}/9${rpeLabel ? ` (${rpeLabel})` : ""}`);
    lines.push(`Ride Type: ${note.ride_type ?? "—"}`);
    lines.push(`Workout Name: ${note.workout_name ?? "—"}`);
    lines.push("");
    lines.push("── Nutrition ──");
    lines.push(`Carbs on Bike: ${note.calories_on_bike ? `${note.calories_on_bike / 4} g` : "—"}`);
    lines.push(`Calories on Bike: ${note.calories_on_bike ?? "—"}`);
    lines.push(`Carbs/hr: ${carbsPerHour ?? "—"} g/hr`);
    lines.push(`Bottles: ${note.bottle_count ?? "—"}`);
    lines.push(`Bottle Size: ${note.bottle_size_oz ?? "—"} oz`);
    lines.push(`Total Fluid: ${totalFluidOz ?? "—"} oz`);
    lines.push(`GI Issues: ${note.gi_issues ?? "—"}`);
    lines.push(`Electrolyte: ${note.electrolyte_g ?? "—"} g ${note.electrolyte_product ?? ""}`);
    lines.push("");
    lines.push("── Pre-Ride ──");
    lines.push(`Meal Timing: ${note.meal_timing ?? "—"}`);
    lines.push(`Pre-Ride Carbs: ${note.pre_carbs_g ?? "—"} g`);
    lines.push(`Pre-Ride Protein: ${note.pre_protein_g ?? "—"} g`);
    lines.push(`Pre-Ride Fat: ${note.pre_fat_g ?? "—"} g`);
    lines.push(`Leg Freshness: ${note.leg_freshness ?? "—"}/9${legLabel ? ` (${legLabel})` : ""}`);
    lines.push(`Weight: ${note.weight_lbs ?? "—"} lbs`);
    if (wattsPerKg) lines.push(`Power-to-Weight: ${wattsPerKg} w/kg`);
    lines.push("");
    lines.push("── Recovery ──");
    lines.push(`Sleep: ${note.sleep_hours != null ? hoursToHHMM(note.sleep_hours) : "—"}`);
    lines.push(`Sleep Quality: ${note.sleep_quality ?? "—"}/9${sleepLabel ? ` (${sleepLabel})` : ""}`);
    lines.push(`Cramping: ${note.cramping ?? "—"}`);
    lines.push("");
    lines.push("── Notes ──");
    lines.push(note.notes ?? "—");
    const text = lines.join("\r\n");
    if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard.writeText(text).catch(() => fallbackCopy(text));
    } else {
      fallbackCopy(text);
    }
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
              {/* RPE Drum Picker */}
              <div>
                <label className={labelClass}>RPE: {note.rpe ?? "—"}/9{note.rpe ? ` (${getLabelForValue(RPE_OPTIONS, note.rpe)})` : ""}</label>
                <DrumPicker
                  options={RPE_OPTIONS}
                  value={note.rpe ?? null}
                  onChange={(v) => updateField("rpe", v)}
                />
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
                <label className={labelClass}>Carbs on Bike (g)</label>
                <input
                  type="text"
                  value={carbsInput}
                  onChange={(e) => setCarbsInput(e.target.value)}
                  onBlur={handleCarbsBlur}
                  className={inputClass}
                  placeholder="e.g. 75+75"
                />
              </div>
              <div>
                <label className={labelClass}>Calories (auto)</label>
                <div className={`${inputClass} bg-transparent`}>
                  {note.calories_on_bike ? `${note.calories_on_bike} cal` : "—"}
                </div>
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
                <label className={labelClass}>Electrolyte (g)</label>
                <input
                  type="text"
                  value={electrolyteInput}
                  onChange={(e) => setElectrolyteInput(e.target.value)}
                  onBlur={handleElectrolyteBlur}
                  className={inputClass}
                  placeholder="e.g. 1.5+1.5"
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
              {/* Leg Freshness Drum Picker */}
              <div>
                <label className={labelClass}>Legs: {note.leg_freshness ?? "—"}/9{note.leg_freshness ? ` (${getLabelForValue(LEG_FRESHNESS_OPTIONS, note.leg_freshness)})` : ""}</label>
                <DrumPicker
                  options={LEG_FRESHNESS_OPTIONS}
                  value={note.leg_freshness ?? null}
                  onChange={(v) => updateField("leg_freshness", v)}
                />
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
                <label className={labelClass}>Sleep (h:mm)</label>
                <input
                  type="text"
                  value={sleepInput}
                  onChange={(e) => setSleepInput(e.target.value)}
                  onBlur={handleSleepBlur}
                  className={inputClass}
                  placeholder="7:30"
                />
              </div>
              {/* Sleep Quality Drum Picker */}
              <div>
                <label className={labelClass}>Sleep: {note.sleep_quality ?? "—"}/9{note.sleep_quality ? ` (${getLabelForValue(SLEEP_QUALITY_OPTIONS, note.sleep_quality)})` : ""}</label>
                <DrumPicker
                  options={SLEEP_QUALITY_OPTIONS}
                  value={note.sleep_quality ?? null}
                  onChange={(v) => updateField("sleep_quality", v)}
                />
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

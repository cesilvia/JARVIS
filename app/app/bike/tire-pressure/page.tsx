"use client";

import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import Link from "next/link";
import Navigation from "../../components/Navigation";
import CircuitBackground from "../../hub/CircuitBackground";
import CyclingIcon from "../CyclingIcon";
import * as api from "../../lib/api-client";

const hubTheme = {
  primary: "#00D9FF",
  secondary: "#67C7EB",
  background: "#000000",
};

const COMMON_TIRE_WIDTHS = [23, 25, 28, 30, 32, 35, 38, 40, 43, 45, 50];
const TIRE_TYPES = ["Clincher", "Tubeless", "Tubular"] as const;
const SURFACES = ["Smooth pavement", "Rough pavement", "Gravel", "Mixed"] as const;
const CONDITIONS = ["Dry", "Wet"] as const;
const OZ_PER_LB = 16;

type TireType = (typeof TIRE_TYPES)[number];
type Surface = (typeof SURFACES)[number];
type Condition = (typeof CONDITIONS)[number];

interface Bike {
  id: string;
  name: string;
  type: string;
  [key: string]: unknown;
}

interface NamedWeight {
  name: string;
  weight: number;
}

interface SavedDefaults {
  lastRiderAndKit: number;
  helmet: number;
  shoes: number;
  bike: number;
  wheelSets: NamedWeight[];
  bottles: NamedWeight[];
  repairKits: NamedWeight[];
  frontLight: number;
  rearLight: number;
  computer: number;
}

interface TireRef {
  id: string;
  brand: string;
  model: string;
  width: number;
  minPSI: number;
  maxPSI: number;
}

const BUILT_IN_TIRES: TireRef[] = [
  { id: "bontrager-r3", brand: "Bontrager", model: "R3 Hard-Case Lite", width: 32, minPSI: 55, maxPSI: 70 },
  { id: "conti-5000st", brand: "Continental", model: "GP 5000 S TR", width: 32, minPSI: 50, maxPSI: 73 },
];

const WHEEL_SET_NAMES = [
  "Bontrager Paradigm Comp 25",
  "Reserve 42.49 Turbulent Aero",
];

const BOTTLE_NAMES = [
  "950ml The Feed Bottle",
  "650ml Insulated",
  "26oz Hammer Bottle",
  "24oz",
];

const REPAIR_KIT_NAMES = ["Saddle Kit", "Tube Kit"];

const EMPTY_DEFAULTS: SavedDefaults = {
  lastRiderAndKit: 0,
  helmet: 0,
  shoes: 0,
  bike: 0,
  wheelSets: WHEEL_SET_NAMES.map((n) => ({ name: n, weight: 0 })),
  bottles: BOTTLE_NAMES.map((n) => ({ name: n, weight: 0 })),
  repairKits: REPAIR_KIT_NAMES.map((n) => ({ name: n, weight: 0 })),
  frontLight: 0,
  rearLight: 0,
  computer: 0,
};

const FRONT_REAR_PRESETS: Record<string, number> = {
  Road: 0.40,
  Gravel: 0.42,
  MTB: 0.44,
  Hybrid: 0.42,
  "TT/Tri": 0.38,
  Other: 0.40,
};

// Non-linear model calibrated against SILCA tire pressure data.
// PSI = k × wheelLoad^0.2 / width^0.625. The sub-linear load exponent
// prevents the rear tire from reading too high relative to the front.
const TIRE_TYPE_K: Record<TireType, number> = {
  Clincher: 290,
  Tubeless: 264,
  Tubular: 277,
};

const SURFACE_ADJUSTMENT: Record<Surface, number> = {
  "Smooth pavement": 1.0,
  "Rough pavement": 0.93,
  Gravel: 0.85,
  Mixed: 0.90,
};

const CONDITION_ADJUSTMENT: Record<Condition, number> = {
  Dry: 1.0,
  Wet: 0.95,
};

function calculatePSI(
  totalWeightLbs: number,
  tireWidthMm: number,
  tireType: TireType,
  surface: Surface,
  condition: Condition,
  weightFraction: number
): number {
  const wheelLoad = totalWeightLbs * weightFraction;
  const k = TIRE_TYPE_K[tireType];
  let psi = k * Math.pow(wheelLoad, 0.2) / Math.pow(tireWidthMm, 0.625);
  psi *= SURFACE_ADJUSTMENT[surface];
  psi *= CONDITION_ADJUSTMENT[condition];
  return Math.round(psi);
}

function psiRange(psi: number): { min: number; max: number } {
  return { min: Math.round(psi * 0.92), max: Math.round(psi * 1.08) };
}

function maxPSIForWidth(w: number): number {
  if (w <= 23) return 130;
  if (w <= 25) return 120;
  if (w <= 28) return 110;
  if (w <= 32) return 100;
  if (w <= 38) return 80;
  if (w <= 45) return 65;
  return 55;
}

function minPSIForWidth(w: number): number {
  if (w <= 25) return 60;
  if (w <= 32) return 40;
  if (w <= 40) return 30;
  return 20;
}

function clampPSI(psi: number, w: number, tireMaxPSI?: number): number {
  const ceiling = tireMaxPSI != null ? Math.min(maxPSIForWidth(w), tireMaxPSI) : maxPSIForWidth(w);
  return Math.max(minPSIForWidth(w), Math.min(ceiling, psi));
}

type DefaultField = "helmet" | "shoes" | "frontLight" | "rearLight" | "computer" | "bike";

const DEFAULT_LABELS: Record<DefaultField, string> = {
  helmet: "Helmet",
  shoes: "Shoes",
  bike: "Bike",
  frontLight: "Front Light",
  rearLight: "Rear Light",
  computer: "Computer",
};

export default function TirePressurePage() {
  const [bikes, setBikes] = useState<Bike[]>([]);
  const [defaults, setDefaults] = useState<SavedDefaults>(EMPTY_DEFAULTS);
  const [isLoaded, setIsLoaded] = useState(false);

  const [riderAndKit, setRiderAndKit] = useState("");
  const [helmet, setHelmet] = useState("");
  const [shoes, setShoes] = useState("");
  const [bikeWt, setBikeWt] = useState("");
  const [frontLightWt, setFrontLightWt] = useState("");
  const [rearLightWt, setRearLightWt] = useState("");
  const [computerWt, setComputerWt] = useState("");

  const [selectedWheelSet, setSelectedWheelSet] = useState(0);
  const [wheelWeights, setWheelWeights] = useState<string[]>(WHEEL_SET_NAMES.map(() => ""));

  const [bottleSelections, setBottleSelections] = useState<number[]>([0, 0, 0, 0]);
  const [bottleCount, setBottleCount] = useState(2);
  const [bottleWeights, setBottleWeights] = useState<string[]>(BOTTLE_NAMES.map(() => ""));

  const [saddleKit, setSaddleKit] = useState(false);
  const [tubeKit, setTubeKit] = useState(false);
  const [repairKitWeights, setRepairKitWeights] = useState<string[]>(REPAIR_KIT_NAMES.map(() => ""));

  const [pendingDefault, setPendingDefault] = useState<DefaultField | null>(null);

  const [customTires, setCustomTires] = useState<TireRef[]>([]);
  const [showAddTire, setShowAddTire] = useState(false);
  const [newTire, setNewTire] = useState({ brand: "", model: "", width: "", minPSI: "", maxPSI: "" });

  const [weightOpen, setWeightOpen] = useState(true);
  const [tireSettingsOpen, setTireSettingsOpen] = useState(true);

  const [frontWidth, setFrontWidth] = useState(32);
  const [rearWidth, setRearWidth] = useState(32);
  const [sameFrontRear, setSameFrontRear] = useState(true);
  const [tireType, setTireType] = useState<TireType>("Tubeless");
  const [surface, setSurface] = useState<Surface>("Rough pavement");
  const [condition, setCondition] = useState<Condition>("Dry");
  const [frontRearSplit, setFrontRearSplit] = useState(0.40);
  const [selectedBikeId, setSelectedBikeId] = useState<string>("");
  const [customFrontWidth, setCustomFrontWidth] = useState("");
  const [customRearWidth, setCustomRearWidth] = useState("");
  const [selectedFrontTireId, setSelectedFrontTireId] = useState<string>("");
  const [selectedRearTireId, setSelectedRearTireId] = useState<string>("");

  useEffect(() => {
    async function load() {
      try {
        const [bikesData, defaultsData, tiresData, selectedTiresData] = await Promise.all([
          api.getBikes<Bike>(),
          api.getKV<SavedDefaults>("tire-pressure-defaults"),
          api.getTireRefs<TireRef>(),
          api.getKV<{ front: string; rear: string }>("tire-pressure-selected-tires"),
        ]);
        if (bikesData.length) setBikes(bikesData);
        if (defaultsData) {
          const p = defaultsData;
          setDefaults(p);
          if (p.lastRiderAndKit) setRiderAndKit(String(p.lastRiderAndKit));
          if (p.helmet) setHelmet(String(p.helmet));
          if (p.shoes) setShoes(String(p.shoes));
          if (p.bike) setBikeWt(String(p.bike));
          if (p.frontLight) setFrontLightWt(String(p.frontLight));
          if (p.rearLight) setRearLightWt(String(p.rearLight));
          if (p.computer) setComputerWt(String(p.computer));
          if (p.wheelSets?.length) {
            setWheelWeights(WHEEL_SET_NAMES.map((_, i) => {
              const w = p.wheelSets[i]?.weight;
              return w ? String(w) : "";
            }));
          }
          if (p.bottles?.length) {
            setBottleWeights(BOTTLE_NAMES.map((_, i) => {
              const w = p.bottles[i]?.weight;
              return w ? String(w) : "";
            }));
          }
          if (p.repairKits?.length) {
            setRepairKitWeights(REPAIR_KIT_NAMES.map((_, i) => {
              const w = p.repairKits[i]?.weight;
              return w ? String(w) : "";
            }));
          }
        }
        if (tiresData.length) setCustomTires(tiresData);
        if (selectedTiresData) {
          if (selectedTiresData.front) setSelectedFrontTireId(selectedTiresData.front);
          if (selectedTiresData.rear) setSelectedRearTireId(selectedTiresData.rear);
        }
      } catch (err) {
        console.warn("Failed to load from API:", err);
      }
      setIsLoaded(true);
    }
    load();
  }, []);

  const prevTiresRef = useRef(customTires);
  useEffect(() => {
    if (!isLoaded) return;
    if (prevTiresRef.current === customTires) return;
    prevTiresRef.current = customTires;
    api.saveTireRefs(customTires);
  }, [customTires, isLoaded]);

  useEffect(() => {
    if (!isLoaded) return;
    api.setKV("tire-pressure-selected-tires", { front: selectedFrontTireId, rear: selectedRearTireId });
  }, [selectedFrontTireId, selectedRearTireId, isLoaded]);

  useEffect(() => {
    if (!isLoaded || selectedBikeId) return;
    const domane = bikes.find((b) => b.name.toLowerCase().includes("domane"));
    if (domane) {
      setSelectedBikeId(domane.id);
      setFrontRearSplit(FRONT_REAR_PRESETS[domane.type] ?? 0.40);
    }
  }, [isLoaded, bikes, selectedBikeId]);

  const saveDefaults = useCallback((updated: SavedDefaults) => {
    setDefaults(updated);
    api.setKV("tire-pressure-defaults", updated);
  }, []);

  const fieldValue = (field: DefaultField): string => {
    switch (field) {
      case "helmet": return helmet;
      case "shoes": return shoes;
      case "bike": return bikeWt;
      case "frontLight": return frontLightWt;
      case "rearLight": return rearLightWt;
      case "computer": return computerWt;
    }
  };

  const handleRiderBlur = () => {
    const val = parseFloat(riderAndKit) || 0;
    if (val > 0 && val !== defaults.lastRiderAndKit) {
      saveDefaults({ ...defaults, lastRiderAndKit: val });
    }
  };

  const handleDefaultBlur = (field: DefaultField) => {
    const cur = parseFloat(fieldValue(field)) || 0;
    if (cur <= 0) return;
    const saved = defaults[field];
    if (saved === 0) {
      saveDefaults({ ...defaults, [field]: cur });
    } else if (cur !== saved) {
      setPendingDefault(field);
    }
  };

  const confirmNewDefault = (field: DefaultField) => {
    const val = parseFloat(fieldValue(field)) || 0;
    saveDefaults({ ...defaults, [field]: val });
    setPendingDefault(null);
  };

  const revertToDefault = (field: DefaultField) => {
    const v = String(defaults[field]);
    switch (field) {
      case "helmet": setHelmet(v); break;
      case "shoes": setShoes(v); break;
      case "bike": setBikeWt(v); break;
      case "frontLight": setFrontLightWt(v); break;
      case "rearLight": setRearLightWt(v); break;
      case "computer": setComputerWt(v); break;
    }
    setPendingDefault(null);
  };

  const handleWheelBlur = (i: number) => {
    const val = parseFloat(wheelWeights[i]) || 0;
    if (val <= 0) return;
    const updated = { ...defaults, wheelSets: [...defaults.wheelSets] };
    updated.wheelSets[i] = { ...updated.wheelSets[i], weight: val };
    saveDefaults(updated);
  };

  const handleBottleBlur = (i: number) => {
    const val = parseFloat(bottleWeights[i]) || 0;
    if (val <= 0) return;
    const updated = { ...defaults, bottles: [...defaults.bottles] };
    updated.bottles[i] = { ...updated.bottles[i], weight: val };
    saveDefaults(updated);
  };

  const handleRepairKitBlur = (i: number) => {
    const val = parseFloat(repairKitWeights[i]) || 0;
    if (val <= 0) return;
    const updated = { ...defaults, repairKits: [...defaults.repairKits] };
    updated.repairKits[i] = { ...updated.repairKits[i], weight: val };
    saveDefaults(updated);
  };

  const totalWeightLbs = useMemo(() => {
    const rider = parseFloat(riderAndKit) || 0;
    const bike = parseFloat(bikeWt) || 0;
    const helmetOz = parseFloat(helmet) || 0;
    const shoesOz = parseFloat(shoes) || 0;
    const fLightOz = parseFloat(frontLightWt) || 0;
    const rLightOz = parseFloat(rearLightWt) || 0;
    const compOz = parseFloat(computerWt) || 0;
    const wheelOz = parseFloat(wheelWeights[selectedWheelSet]) || 0;
    let bottleOz = 0;
    for (let s = 0; s < bottleCount; s++) {
      const idx = bottleSelections[s] ?? 0;
      bottleOz += parseFloat(bottleWeights[idx]) || 0;
    }
    const sKitOz = saddleKit ? (parseFloat(repairKitWeights[0]) || 0) : 0;
    const tKitOz = tubeKit ? (parseFloat(repairKitWeights[1]) || 0) : 0;
    const gearOz = helmetOz + shoesOz + fLightOz + rLightOz + compOz + wheelOz + bottleOz + sKitOz + tKitOz;
    return rider + bike + gearOz / OZ_PER_LB;
  }, [riderAndKit, bikeWt, helmet, shoes, frontLightWt, rearLightWt, computerWt,
      wheelWeights, selectedWheelSet, bottleWeights, bottleSelections, bottleCount,
      saddleKit, tubeKit, repairKitWeights]);

  const effectiveRearWidth = sameFrontRear ? frontWidth : rearWidth;
  const allTires = [...BUILT_IN_TIRES, ...customTires];
  const selectedFrontTire = allTires.find((t) => t.id === selectedFrontTireId);
  const selectedRearTire = sameFrontRear ? selectedFrontTire : allTires.find((t) => t.id === selectedRearTireId);

  const frontRawPSI = useMemo(
    () => calculatePSI(totalWeightLbs, frontWidth, tireType, surface, condition, frontRearSplit),
    [totalWeightLbs, frontWidth, tireType, surface, condition, frontRearSplit]
  );
  const rearRawPSI = useMemo(
    () => calculatePSI(totalWeightLbs, effectiveRearWidth, tireType, surface, condition, 1 - frontRearSplit),
    [totalWeightLbs, effectiveRearWidth, tireType, surface, condition, frontRearSplit]
  );

  const frontPSI = clampPSI(frontRawPSI, frontWidth, selectedFrontTire?.maxPSI);
  const rearPSI = clampPSI(rearRawPSI, effectiveRearWidth, selectedRearTire?.maxPSI);
  const frontCapped = selectedFrontTire != null && frontRawPSI > selectedFrontTire.maxPSI;
  const rearCapped = selectedRearTire != null && rearRawPSI > selectedRearTire.maxPSI;

  const frontRange = psiRange(frontPSI);
  const rearRange = psiRange(rearPSI);

  const addTire = () => {
    const brand = newTire.brand.trim();
    const model = newTire.model.trim();
    const width = parseInt(newTire.width, 10);
    const minP = parseInt(newTire.minPSI, 10);
    const maxP = parseInt(newTire.maxPSI, 10);
    if (!brand || !model || isNaN(width) || isNaN(minP) || isNaN(maxP)) return;
    const tire: TireRef = { id: crypto.randomUUID(), brand, model, width, minPSI: minP, maxPSI: maxP };
    setCustomTires((prev) => [...prev, tire]);
    setNewTire({ brand: "", model: "", width: "", minPSI: "", maxPSI: "" });
    setShowAddTire(false);
  };

  const removeTire = (id: string) => {
    if (confirm("Remove this tire?")) {
      setCustomTires((prev) => prev.filter((t) => t.id !== id));
    }
  };

  const handleBikeSelect = (bikeId: string) => {
    setSelectedBikeId(bikeId);
    const bike = bikes.find((b) => b.id === bikeId);
    if (bike) setFrontRearSplit(FRONT_REAR_PRESETS[bike.type] ?? 0.40);
  };

  const handleTireSelect = (tireId: string, position: "front" | "rear") => {
    const setId = position === "front" ? setSelectedFrontTireId : setSelectedRearTireId;
    setId(tireId);
    if (tireId) {
      const tire = allTires.find((t) => t.id === tireId);
      if (tire) {
        if (position === "front") {
          setFrontWidth(tire.width);
          setCustomFrontWidth("");
          if (sameFrontRear) {
            setRearWidth(tire.width);
            setCustomRearWidth("");
            setSelectedRearTireId(tireId);
          }
        } else {
          setRearWidth(tire.width);
          setCustomRearWidth("");
        }
      }
    }
  };

  const inputSm = "w-24 px-2 py-1.5 border border-[#00D9FF]/50 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#00D9FF]/50 bg-black/30 text-[#00D9FF] placeholder-[#67C7EB]/50 text-sm text-right [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none";
  const selectCls = "w-full px-3 py-2 border border-[#00D9FF]/50 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#00D9FF]/50 bg-black/30 text-[#00D9FF]";
  const inputCls = "w-full px-3 py-2 border border-[#00D9FF]/50 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#00D9FF]/50 bg-black/30 text-[#00D9FF] placeholder-[#67C7EB]/50";
  const labelCls = "block text-sm font-medium text-[#67C7EB] mb-1";

  function ConfirmBanner({ field }: { field: DefaultField }) {
    if (pendingDefault !== field) return null;
    return (
      <div className="flex items-center gap-2 mt-1 text-xs">
        <span className="text-yellow-400">Set as new default?</span>
        <button type="button" onClick={() => confirmNewDefault(field)} className="text-[#00D9FF] hover:underline">Yes</button>
        <button type="button" onClick={() => revertToDefault(field)} className="text-[#67C7EB] hover:underline">No</button>
      </div>
    );
  }

  function DefaultRow({ field, value, setter, unit }: {
    field: DefaultField; value: string;
    setter: (v: string) => void; unit: string;
  }) {
    return (
      <div>
        <div className="flex items-center justify-between gap-4">
          <div className="flex-1">
            <label className="text-sm text-[#67C7EB]">{DEFAULT_LABELS[field]}</label>
            {defaults[field] > 0 && (
              <div className="text-xs text-[#67C7EB]/50">Default: {defaults[field]} {unit}</div>
            )}
          </div>
          <div className="flex items-center gap-2">
            <input type="number" value={value} onChange={(e) => setter(e.target.value)}
              onBlur={() => handleDefaultBlur(field)} placeholder={"\u2014"} className={inputSm} />
            <span className="text-xs text-[#67C7EB]/60 w-6">{unit}</span>
          </div>
        </div>
        <ConfirmBanner field={field} />
      </div>
    );
  }

  return (
    <div className="min-h-screen hud-scifi-bg relative" style={{ backgroundColor: hubTheme.background, color: hubTheme.primary }}>
      <CircuitBackground />
      <main className="container mx-auto px-4 py-8 max-w-4xl relative z-10">
        <div className="grid grid-cols-3 items-center gap-4 mb-8">
          <div className="flex justify-start w-20 h-20 min-w-20 min-h-20">
            <Navigation />
          </div>
          <h2 className="text-2xl font-semibold hud-text text-center">Tire Pressure</h2>
          <div className="flex justify-end">
            <Link href="/bike" title="Cycling" aria-label="Cycling"
              className="inline-flex items-center justify-center transition-transform hover:scale-110"
              style={{ width: 80, height: 80, minWidth: 80, minHeight: 80 }}>
              <CyclingIcon className="shrink-0" style={{ width: 80, height: 80, minWidth: 80, minHeight: 80 }} stroke={hubTheme.primary} />
            </Link>
          </div>
        </div>

        {/* PSI Results */}
        <div className="hud-card rounded-lg p-6 mb-6 border border-[#00D9FF]/20">
          <div className="grid grid-cols-2 gap-6">
            <div className="text-center">
              <div className="text-xs font-semibold text-[#67C7EB] uppercase tracking-wide mb-2">Front</div>
              <div className={`text-5xl font-bold ${frontCapped ? "text-yellow-400" : "text-[#00D9FF]"}`}>{frontPSI}</div>
              <div className="text-sm text-[#67C7EB] mt-1">PSI</div>
              <div className="text-xs text-[#67C7EB]/70 mt-1">{frontRange.min}&ndash;{frontRange.max} range</div>
              <div className="text-xs text-[#67C7EB]/50 mt-0.5">{frontWidth}mm {tireType.toLowerCase()}</div>
              {frontCapped && (
                <div className="text-xs text-yellow-400 mt-1">Capped at {selectedFrontTire!.maxPSI} PSI max</div>
              )}
            </div>
            <div className="text-center">
              <div className="text-xs font-semibold text-[#67C7EB] uppercase tracking-wide mb-2">Rear</div>
              <div className={`text-5xl font-bold ${rearCapped ? "text-yellow-400" : "text-[#00D9FF]"}`}>{rearPSI}</div>
              <div className="text-sm text-[#67C7EB] mt-1">PSI</div>
              <div className="text-xs text-[#67C7EB]/70 mt-1">{rearRange.min}&ndash;{rearRange.max} range</div>
              <div className="text-xs text-[#67C7EB]/50 mt-0.5">{effectiveRearWidth}mm {tireType.toLowerCase()}</div>
              {rearCapped && (
                <div className="text-xs text-yellow-400 mt-1">Capped at {selectedRearTire!.maxPSI} PSI max</div>
              )}
            </div>
          </div>
          <div className="text-center mt-4">
            <span className="text-sm text-[#67C7EB]">Total system weight: {totalWeightLbs.toFixed(1)} lbs</span>
          </div>
          <p className="text-center text-xs text-[#67C7EB]/60 mt-2">
            Based on 15% tire drop methodology. Always stay within tire and rim manufacturer limits.
          </p>
        </div>

        {/* Weight Components */}
        <div className="hud-card rounded-lg mb-6 border border-[#00D9FF]/20">
          <button type="button" onClick={() => setWeightOpen(!weightOpen)}
            className="w-full flex items-center justify-between px-6 py-4 text-left hover:bg-[rgba(0,217,255,0.05)] transition-colors">
            <h3 className="text-lg font-semibold text-[#00D9FF]">Weight</h3>
            <div className="flex items-center gap-3">
              <span className="text-sm text-[#67C7EB]">{totalWeightLbs.toFixed(1)} lbs</span>
              <span className="text-[#67C7EB] text-lg">{weightOpen ? "\u2212" : "+"}</span>
            </div>
          </button>
          {weightOpen && <div className="px-6 pb-6 space-y-4">

          {/* Rider & Kit */}
          <div className="flex items-center justify-between gap-4">
            <div className="flex-1">
              <label className="text-sm text-[#67C7EB]">Rider &amp; Kit</label>
              <div className="text-xs text-[#67C7EB]/50">Enter each ride</div>
            </div>
            <div className="flex items-center gap-2">
              <input type="number" value={riderAndKit} onChange={(e) => setRiderAndKit(e.target.value)}
                onBlur={handleRiderBlur} placeholder="170" className={inputSm} />
              <span className="text-xs text-[#67C7EB]/60 w-6">lbs</span>
            </div>
          </div>

          <hr className="border-[#00D9FF]/10" />

          <DefaultRow field="helmet" value={helmet} setter={setHelmet} unit="oz" />
          <DefaultRow field="shoes" value={shoes} setter={setShoes} unit="oz" />
          <DefaultRow field="bike" value={bikeWt} setter={setBikeWt} unit="lbs" />

          <hr className="border-[#00D9FF]/10" />

          {/* Wheels */}
          <div>
            <label className="text-sm font-medium text-[#67C7EB] mb-2 block">Wheels</label>
            <div className="space-y-2">
              {WHEEL_SET_NAMES.map((name, i) => (
                <div key={name} className="flex items-center gap-3">
                  <input type="radio" name="wheelSet" checked={selectedWheelSet === i}
                    onChange={() => setSelectedWheelSet(i)} className="accent-[#00D9FF]" />
                  <label className={`flex-1 text-sm cursor-pointer ${selectedWheelSet === i ? "text-[#00D9FF]" : "text-[#67C7EB]/70"}`}
                    onClick={() => setSelectedWheelSet(i)}>
                    {name}
                  </label>
                  <div className="flex items-center gap-2">
                    <input type="number" value={wheelWeights[i]}
                      onChange={(e) => { const u = [...wheelWeights]; u[i] = e.target.value; setWheelWeights(u); }}
                      onBlur={() => handleWheelBlur(i)} placeholder={"\u2014"} className={inputSm} />
                    <span className="text-xs text-[#67C7EB]/60 w-6">oz</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <hr className="border-[#00D9FF]/10" />

          {/* Water Bottles */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-medium text-[#67C7EB]">Water Bottles</label>
              <div className="flex items-center gap-2">
                <span className="text-xs text-[#67C7EB]/60">Count:</span>
                {[0, 1, 2, 3, 4].map((n) => (
                  <button key={n} type="button" onClick={() => setBottleCount(n)}
                    className={`w-7 h-7 rounded text-xs font-medium ${
                      bottleCount === n
                        ? "bg-[rgba(0,217,255,0.3)] text-[#00D9FF] border border-[#00D9FF]/50"
                        : "bg-black/30 text-[#67C7EB]/60 border border-[#00D9FF]/20"
                    }`}>
                    {n}
                  </button>
                ))}
              </div>
            </div>
            {bottleCount > 0 && (
              <div className="grid gap-3" style={{ gridTemplateColumns: `repeat(${bottleCount}, minmax(0, 1fr))` }}>
                {Array.from({ length: bottleCount }).map((_, slot) => (
                  <div key={slot}>
                    <label className="block text-xs text-[#67C7EB]/80 mb-1">Bottle {slot + 1}</label>
                    <select value={bottleSelections[slot] ?? 0}
                      onChange={(e) => {
                        const u = [...bottleSelections];
                        u[slot] = parseInt(e.target.value, 10);
                        setBottleSelections(u);
                      }}
                      className={selectCls + " text-sm"}>
                      {BOTTLE_NAMES.map((name, i) => (
                        <option key={i} value={i}>{name}</option>
                      ))}
                    </select>
                  </div>
                ))}
              </div>
            )}
            {bottleCount > 0 && (
              <div className="text-right text-xs text-[#67C7EB]/50 mt-2">
                {Array.from({ length: bottleCount }).map((_, slot) => {
                  const idx = bottleSelections[slot] ?? 0;
                  return parseFloat(bottleWeights[idx]) || 0;
                }).reduce((a, b) => a + b, 0).toFixed(1)} oz total
              </div>
            )}
            <div className="mt-3">
              <label className="block text-xs text-[#67C7EB]/60 mb-1">Bottle weights (enter once, saved)</label>
              <div className="space-y-1">
                {BOTTLE_NAMES.map((name, i) => (
                  <div key={name} className="flex items-center gap-3">
                    <span className="flex-1 text-xs text-[#67C7EB]/70">{name}</span>
                    <div className="flex items-center gap-2">
                      <input type="number" value={bottleWeights[i]}
                        onChange={(e) => { const u = [...bottleWeights]; u[i] = e.target.value; setBottleWeights(u); }}
                        onBlur={() => handleBottleBlur(i)} placeholder={"\u2014"} className={inputSm} />
                      <span className="text-xs text-[#67C7EB]/60 w-6">oz</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <hr className="border-[#00D9FF]/10" />

          {/* Repair Kits */}
          <div>
            <label className="text-sm font-medium text-[#67C7EB] mb-2 block">Repair Kits</label>
            <div className="space-y-2">
              {REPAIR_KIT_NAMES.map((name, i) => {
                const checked = i === 0 ? saddleKit : tubeKit;
                const toggle = i === 0 ? setSaddleKit : setTubeKit;
                return (
                  <div key={name} className="flex items-center gap-3">
                    <input type="checkbox" checked={checked} onChange={(e) => toggle(e.target.checked)}
                      className="accent-[#00D9FF]" />
                    <label className={`flex-1 text-sm cursor-pointer ${checked ? "text-[#00D9FF]" : "text-[#67C7EB]/70"}`}
                      onClick={() => toggle(!checked)}>
                      {name}
                    </label>
                    <div className="flex items-center gap-2">
                      <input type="number" value={repairKitWeights[i]}
                        onChange={(e) => { const u = [...repairKitWeights]; u[i] = e.target.value; setRepairKitWeights(u); }}
                        onBlur={() => handleRepairKitBlur(i)} placeholder={"\u2014"} className={inputSm} />
                      <span className="text-xs text-[#67C7EB]/60 w-6">oz</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <hr className="border-[#00D9FF]/10" />

          <DefaultRow field="frontLight" value={frontLightWt} setter={setFrontLightWt} unit="oz" />
          <DefaultRow field="rearLight" value={rearLightWt} setter={setRearLightWt} unit="oz" />
          <DefaultRow field="computer" value={computerWt} setter={setComputerWt} unit="oz" />

          <hr className="border-[#00D9FF]/10" />

          {/* Total */}
          <div className="flex items-center justify-between py-2">
            <span className="text-sm font-semibold text-[#00D9FF]">Total Weight</span>
            <span className="text-lg font-bold text-[#00D9FF]">{totalWeightLbs.toFixed(1)} lbs</span>
          </div>
          </div>}
        </div>

        {/* Tire Settings */}
        <div className="hud-card rounded-lg mb-6 border border-[#00D9FF]/20">
          <button type="button" onClick={() => setTireSettingsOpen(!tireSettingsOpen)}
            className="w-full flex items-center justify-between px-6 py-4 text-left hover:bg-[rgba(0,217,255,0.05)] transition-colors">
            <h3 className="text-lg font-semibold text-[#00D9FF]">Tire Settings</h3>
            <span className="text-[#67C7EB] text-lg">{tireSettingsOpen ? "\u2212" : "+"}</span>
          </button>
          {tireSettingsOpen && <div className="px-6 pb-6 space-y-5">

          {bikes.length > 0 && (
            <div>
              <label className={labelCls}>Bike</label>
              <select value={selectedBikeId} onChange={(e) => handleBikeSelect(e.target.value)} className={selectCls}>
                <option value="">Select a bike</option>
                {bikes.map((b) => (
                  <option key={b.id} value={b.id}>{b.name} ({b.type})</option>
                ))}
              </select>
            </div>
          )}

          {/* Tire make/model */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <span className="text-sm font-medium text-[#67C7EB]">Tire</span>
              {!sameFrontRear && <span className="text-xs text-[#67C7EB]/60">Front &amp; rear set independently</span>}
            </div>
            <div className={sameFrontRear ? "" : "grid grid-cols-2 gap-3"}>
              <div>
                {!sameFrontRear && <label className="block text-xs text-[#67C7EB]/80 mb-1">Front</label>}
                <select value={selectedFrontTireId} onChange={(e) => handleTireSelect(e.target.value, "front")} className={selectCls}>
                  <option value="">Manual width</option>
                  {allTires.map((t) => (
                    <option key={t.id} value={t.id}>{t.brand} {t.model} ({t.width}mm)</option>
                  ))}
                </select>
              </div>
              {!sameFrontRear && (
                <div>
                  <label className="block text-xs text-[#67C7EB]/80 mb-1">Rear</label>
                  <select value={selectedRearTireId} onChange={(e) => handleTireSelect(e.target.value, "rear")} className={selectCls}>
                    <option value="">Manual width</option>
                    {allTires.map((t) => (
                      <option key={t.id} value={t.id}>{t.brand} {t.model} ({t.width}mm)</option>
                    ))}
                  </select>
                </div>
              )}
            </div>
          </div>

          {/* Tire width */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <span className="text-sm font-medium text-[#67C7EB]">Tire width (mm)</span>
              <label className="flex items-center gap-2 text-xs text-[#67C7EB]/80">
                <input type="checkbox" checked={sameFrontRear}
                  onChange={(e) => {
                    setSameFrontRear(e.target.checked);
                    if (e.target.checked) {
                      setRearWidth(frontWidth);
                      setSelectedRearTireId(selectedFrontTireId);
                    }
                  }}
                  className="rounded border-[#00D9FF]/50" />
                Same front &amp; rear
              </label>
            </div>
            <div className={sameFrontRear ? "" : "grid grid-cols-2 gap-3"}>
              <div>
                {!sameFrontRear && <label className="block text-xs text-[#67C7EB]/80 mb-1">Front</label>}
                <select value={COMMON_TIRE_WIDTHS.includes(frontWidth) ? frontWidth : "custom"}
                  onChange={(e) => {
                    if (e.target.value === "custom") return;
                    const v = parseInt(e.target.value, 10);
                    if (!isNaN(v)) { setFrontWidth(v); setCustomFrontWidth(""); if (sameFrontRear) { setRearWidth(v); setCustomRearWidth(""); } }
                  }} className={selectCls}>
                  {COMMON_TIRE_WIDTHS.map((w) => <option key={w} value={w}>{w}mm</option>)}
                  <option value="custom">Custom&hellip;</option>
                </select>
                {!COMMON_TIRE_WIDTHS.includes(frontWidth) && (
                  <input type="number" value={customFrontWidth || frontWidth}
                    onChange={(e) => {
                      setCustomFrontWidth(e.target.value);
                      const v = parseInt(e.target.value, 10);
                      if (!isNaN(v) && v > 0) { setFrontWidth(v); if (sameFrontRear) setRearWidth(v); }
                    }}
                    placeholder="Width in mm" className={`${inputCls} mt-2`} />
                )}
              </div>
              {!sameFrontRear && (
                <div>
                  <label className="block text-xs text-[#67C7EB]/80 mb-1">Rear</label>
                  <select value={COMMON_TIRE_WIDTHS.includes(rearWidth) ? rearWidth : "custom"}
                    onChange={(e) => {
                      if (e.target.value === "custom") return;
                      const v = parseInt(e.target.value, 10);
                      if (!isNaN(v)) { setRearWidth(v); setCustomRearWidth(""); }
                    }} className={selectCls}>
                    {COMMON_TIRE_WIDTHS.map((w) => <option key={w} value={w}>{w}mm</option>)}
                    <option value="custom">Custom&hellip;</option>
                  </select>
                  {!COMMON_TIRE_WIDTHS.includes(rearWidth) && (
                    <input type="number" value={customRearWidth || rearWidth}
                      onChange={(e) => {
                        setCustomRearWidth(e.target.value);
                        const v = parseInt(e.target.value, 10);
                        if (!isNaN(v) && v > 0) setRearWidth(v);
                      }}
                      placeholder="Width in mm" className={`${inputCls} mt-2`} />
                  )}
                </div>
              )}
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className={labelCls}>Tire type</label>
              <select value={tireType} onChange={(e) => setTireType(e.target.value as TireType)} className={selectCls}>
                {TIRE_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label className={labelCls}>Surface</label>
              <select value={surface} onChange={(e) => setSurface(e.target.value as Surface)} className={selectCls}>
                {SURFACES.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label className={labelCls}>Conditions</label>
              <select value={condition} onChange={(e) => setCondition(e.target.value as Condition)} className={selectCls}>
                {CONDITIONS.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          </div>

          <div>
            <label className={labelCls}>
              Front/rear weight split: {Math.round(frontRearSplit * 100)}/{Math.round((1 - frontRearSplit) * 100)}
            </label>
            <input type="range" min="30" max="50"
              value={Math.round(frontRearSplit * 100)}
              onChange={(e) => setFrontRearSplit(parseInt(e.target.value, 10) / 100)}
              className="w-full accent-[#00D9FF]" />
            <div className="flex justify-between text-xs text-[#67C7EB]/60 mt-1">
              <span>30% front</span><span>50% front</span>
            </div>
          </div>
          </div>}
        </div>

        {/* Tire Pressure Limits */}
        <div className="hud-card rounded-lg p-6 border border-[#00D9FF]/20">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-[#00D9FF]">Tire Pressure Limits</h3>
            <button type="button" onClick={() => setShowAddTire(!showAddTire)}
              className="px-3 py-1.5 rounded border border-[#00D9FF]/50 bg-[rgba(0,217,255,0.15)] text-[#00D9FF] hover:bg-[rgba(0,217,255,0.25)] text-sm">
              {showAddTire ? "Cancel" : "Add tire"}
            </button>
          </div>

          {showAddTire && (
            <div className="mb-4 p-4 rounded-lg border border-[#00D9FF]/30 bg-[rgba(0,217,255,0.05)] space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelCls}>Brand *</label>
                  <input type="text" value={newTire.brand} onChange={(e) => setNewTire({ ...newTire, brand: e.target.value })}
                    placeholder="e.g., Vittoria" className={inputCls} />
                </div>
                <div>
                  <label className={labelCls}>Model *</label>
                  <input type="text" value={newTire.model} onChange={(e) => setNewTire({ ...newTire, model: e.target.value })}
                    placeholder="e.g., Corsa N.EXT" className={inputCls} />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className={labelCls}>Width (mm)</label>
                  <input type="number" value={newTire.width} onChange={(e) => setNewTire({ ...newTire, width: e.target.value })}
                    placeholder="32" className={inputCls} />
                </div>
                <div>
                  <label className={labelCls}>Min PSI</label>
                  <input type="number" value={newTire.minPSI} onChange={(e) => setNewTire({ ...newTire, minPSI: e.target.value })}
                    placeholder="50" className={inputCls} />
                </div>
                <div>
                  <label className={labelCls}>Max PSI</label>
                  <input type="number" value={newTire.maxPSI} onChange={(e) => setNewTire({ ...newTire, maxPSI: e.target.value })}
                    placeholder="100" className={inputCls} />
                </div>
              </div>
              <button type="button" onClick={addTire}
                className="px-4 py-2 rounded-lg border border-[#00D9FF]/50 bg-[rgba(0,217,255,0.2)] text-[#00D9FF] hover:bg-[rgba(0,217,255,0.3)] text-sm">
                Add tire
              </button>
            </div>
          )}

          <div className="overflow-x-auto">
            <table className="w-full text-sm text-[#67C7EB]">
              <thead>
                <tr className="border-b border-[#00D9FF]/20">
                  <th className="text-left py-2 pr-3 font-semibold">Brand</th>
                  <th className="text-left py-2 pr-3 font-semibold">Model</th>
                  <th className="text-center py-2 px-2 font-semibold">Width</th>
                  <th className="text-center py-2 px-2 font-semibold">Min PSI</th>
                  <th className="text-center py-2 px-2 font-semibold">Max PSI</th>
                  <th className="py-2 w-8"></th>
                </tr>
              </thead>
              <tbody>
                {allTires.map((t) => {
                  const isCustom = !BUILT_IN_TIRES.some((b) => b.id === t.id);
                  return (
                    <tr key={t.id} className="border-b border-[#00D9FF]/10">
                      <td className="py-2 pr-3 text-[#00D9FF]">{t.brand}</td>
                      <td className="py-2 pr-3">{t.model}</td>
                      <td className="py-2 px-2 text-center">{t.width}mm</td>
                      <td className="py-2 px-2 text-center">{t.minPSI}</td>
                      <td className="py-2 px-2 text-center">{t.maxPSI}</td>
                      <td className="py-2 text-right">
                        {isCustom && (
                          <button type="button" onClick={() => removeTire(t.id)}
                            className="text-red-400 hover:text-red-300 text-xs">Remove</button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {allTires.length === 0 && (
            <p className="text-[#67C7EB]/80 text-sm mt-3">No tires added yet.</p>
          )}
        </div>
      </main>
    </div>
  );
}

"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Navigation from "../../components/Navigation";
import SettingsNavIcon from "../SettingsNavIcon";
import * as api from "../../lib/api-client";

const JARVIS_LAST_BACKUP_KEY = "jarvis-last-nutrition-backup";

// Nutrition icon for quick-nav — matches hub JarvisNutritionIcon
const NutritionIcon = ({ className = "w-6 h-6" }: { className?: string }) => (
  <div className={`${className} relative flex items-center justify-center`}>
    <svg viewBox="0 0 48 48" fill="none" stroke="currentColor" className="absolute inset-0 w-full h-full" aria-hidden>
      <circle cx="24" cy="24" r="18" strokeWidth="1.25" fill="none" />
    </svg>
    <div
      className="w-[62%] h-[62%]"
      style={{
        backgroundColor: "currentColor",
        WebkitMaskImage: "url('/assets/fork-silhouette.svg')",
        maskImage: "url('/assets/fork-silhouette.svg')",
        WebkitMaskSize: "contain",
        maskSize: "contain",
        WebkitMaskRepeat: "no-repeat",
        maskRepeat: "no-repeat",
        WebkitMaskPosition: "center",
        maskPosition: "center",
      }}
    />
  </div>
);

export default function NutritionSettingsPage() {
  const [lastBackup, setLastBackup] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const val = await api.getKV<string>("last-nutrition-backup");
      setLastBackup(val);
    })();
  }, []);

  const handleExport = async () => {
    const recipes = await api.getRecipes();
    const ingredients = await api.getIngredients();
    const data = {
      recipes: recipes ?? [],
      ingredients: ingredients ?? [],
      exportedAt: new Date().toISOString(),
    };
    const dataStr = JSON.stringify(data, null, 2);
    const dataBlob = new Blob([dataStr], { type: "application/json" });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `jarvis-backup-${new Date().toISOString().split("T")[0]}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    const now = new Date().toISOString();
    api.setKV("last-nutrition-backup", now);
    setLastBackup(now);
    alert("Backup exported successfully!");
  };

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const imported = JSON.parse(event.target?.result as string);
        let importedCount = 0;
        const existingRecipes = (await api.getRecipes()) as { id?: string }[];
        const existingIngredients = (await api.getIngredients()) as { name?: string }[];

        if (imported.recipes && Array.isArray(imported.recipes)) {
          const existingIds = new Set(existingRecipes.map((r: { id?: string }) => r.id));
          const newRecipes = imported.recipes.filter((r: { id?: string }) => !r.id || !existingIds.has(r.id));
          if (newRecipes.length > 0 && confirm(`Import ${newRecipes.length} recipe(s)?`)) {
            const mergedRecipes = [...existingRecipes, ...newRecipes];
            await api.saveRecipes(mergedRecipes);
            importedCount += newRecipes.length;
          }
        }
        if (imported.ingredients && Array.isArray(imported.ingredients)) {
          const existingNames = new Set(existingIngredients.map((i: { name?: string }) => i.name?.toLowerCase()));
          const newIngredients = imported.ingredients.filter(
            (i: { name?: string }) => !existingNames.has(i.name?.toLowerCase())
          );
          if (newIngredients.length > 0 && confirm(`Import ${newIngredients.length} ingredient(s)?`)) {
            const mergedIngredients = [...existingIngredients, ...newIngredients];
            await api.saveIngredients(mergedIngredients);
            importedCount += newIngredients.length;
          }
        }

        if (importedCount > 0) {
          alert(`Successfully imported ${importedCount} item(s)!`);
        } else {
          alert("No new items to import.");
        }
      } catch {
        alert("Failed to import backup file. Invalid format.");
      }
    };
    reader.readAsText(file);
    e.target.value = "";
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <div className="container mx-auto px-4 py-8 max-w-2xl">
        <Navigation />

        {/* Quick Nav */}
        <div className="flex items-center justify-end mt-4 mb-6">
          <div className="flex items-center gap-3">
            <Link href="/nutrition" className="text-slate-400 hover:text-green-400 transition-colors" title="Nutrition Tracker">
              <NutritionIcon className="w-7 h-7" />
            </Link>
          </div>
        </div>

        <h1 className="text-3xl font-bold font-mono text-green-400">Nutrition</h1>
        <p className="text-slate-400 mt-2 font-mono text-sm mb-8">
          Backup and import your recipes and saved ingredients.
        </p>

        <section className="border border-slate-700 rounded-lg p-6">
          <h2 className="text-xl font-semibold font-mono text-slate-100 mb-2">Backup</h2>
          <p className="text-slate-400 font-mono text-sm mb-4">
            Export or import your nutrition data (recipes and saved ingredients). Back up regularly.
          </p>
          {lastBackup && (
            <p className="text-slate-500 font-mono text-xs mb-4">
              Last backup: {new Date(lastBackup).toLocaleDateString()} at {new Date(lastBackup).toLocaleTimeString()}
            </p>
          )}
          <div className="flex gap-3">
            <button
              onClick={handleExport}
              className="px-4 py-2 rounded-lg bg-slate-700 hover:bg-slate-600 text-slate-100 font-mono text-sm transition-colors"
            >
              Export backup
            </button>
            <label className="px-4 py-2 rounded-lg bg-slate-700 hover:bg-slate-600 text-slate-100 font-mono text-sm cursor-pointer transition-colors">
              Import backup
              <input type="file" accept=".json" onChange={handleImport} className="hidden" />
            </label>
          </div>
        </section>
      </div>
      <SettingsNavIcon />
    </div>
  );
}

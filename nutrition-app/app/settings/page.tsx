"use client";

import { useState, useEffect } from "react";
import Navigation from "../components/Navigation";

const JARVIS_LAST_BACKUP_KEY = "jarvis-last-nutrition-backup";

export default function SettingsPage() {
  const [lastBackup, setLastBackup] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window !== "undefined") {
      setLastBackup(localStorage.getItem(JARVIS_LAST_BACKUP_KEY));
    }
  }, []);

  const handleExport = () => {
    const recipes = localStorage.getItem("jarvis-recipes");
    const ingredients = localStorage.getItem("jarvis-saved-ingredients");
    const data = {
      recipes: recipes ? JSON.parse(recipes) : [],
      ingredients: ingredients ? JSON.parse(ingredients) : [],
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
    localStorage.setItem(JARVIS_LAST_BACKUP_KEY, new Date().toISOString());
    setLastBackup(new Date().toISOString());
    alert("Backup exported successfully!");
  };

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const imported = JSON.parse(event.target?.result as string);
        let importedCount = 0;
        const recipes = localStorage.getItem("jarvis-recipes");
        const ingredients = localStorage.getItem("jarvis-saved-ingredients");
        const existingRecipes = recipes ? JSON.parse(recipes) : [];
        const existingIngredients = ingredients ? JSON.parse(ingredients) : [];

        if (imported.recipes && Array.isArray(imported.recipes)) {
          const existingIds = new Set(existingRecipes.map((r: { id?: string }) => r.id));
          const newRecipes = imported.recipes.filter((r: { id?: string }) => !r.id || !existingIds.has(r.id));
          if (newRecipes.length > 0 && confirm(`Import ${newRecipes.length} recipe(s)?`)) {
            const mergedRecipes = [...existingRecipes, ...newRecipes];
            localStorage.setItem("jarvis-recipes", JSON.stringify(mergedRecipes));
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
            localStorage.setItem("jarvis-saved-ingredients", JSON.stringify(mergedIngredients));
            importedCount += newIngredients.length;
          }
        }

        if (importedCount > 0) {
          alert(`Successfully imported ${importedCount} item(s)!`);
        } else {
          alert("No new items to import.");
        }
      } catch (err) {
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
        <h1 className="text-3xl font-bold font-mono mt-6">Settings</h1>
        <p className="text-slate-400 mt-2 font-mono text-sm mb-8">
          Configuration and preferences.
        </p>

        <section id="nutrition" className="border border-slate-700 rounded-lg p-6 scroll-mt-8">
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
    </div>
  );
}

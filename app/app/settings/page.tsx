"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Navigation from "../components/Navigation";
import { useRouter } from "next/navigation";

const JARVIS_LAST_BACKUP_KEY = "jarvis-last-nutrition-backup";

export default function SettingsPage() {
  const router = useRouter();
  const [lastBackup, setLastBackup] = useState<string | null>(null);
  const [biometricRegistered, setBiometricRegistered] = useState(false);
  const [biometricSupported, setBiometricSupported] = useState(false);
  const [registeringBiometric, setRegisteringBiometric] = useState(false);
  const [biometricMessage, setBiometricMessage] = useState("");

  useEffect(() => {
    if (typeof window !== "undefined") {
      setLastBackup(localStorage.getItem(JARVIS_LAST_BACKUP_KEY));
      if (window.PublicKeyCredential) {
        setBiometricSupported(true);
        fetch("/api/auth/webauthn/registered")
          .then((r) => r.json())
          .then((d) => setBiometricRegistered(d.registered))
          .catch(() => {});
      }
    }
  }, []);

  const handleRegisterBiometric = async () => {
    setRegisteringBiometric(true);
    setBiometricMessage("");
    try {
      const { startRegistration } = await import("@simplewebauthn/browser");
      const optionsRes = await fetch("/api/auth/webauthn/register");
      if (!optionsRes.ok) throw new Error("Failed to get registration options");
      const options = await optionsRes.json();
      const credential = await startRegistration({ optionsJSON: options });
      const verifyRes = await fetch("/api/auth/webauthn/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(credential),
      });
      if (verifyRes.ok) {
        setBiometricRegistered(true);
        setBiometricMessage("Biometric registered successfully!");
      } else {
        const data = await verifyRes.json();
        setBiometricMessage(data.error || "Registration failed");
      }
    } catch (err) {
      if (err instanceof Error && err.name === "NotAllowedError") {
        setBiometricMessage("Registration was cancelled");
      } else {
        setBiometricMessage("Registration failed");
      }
    } finally {
      setRegisteringBiometric(false);
    }
  };

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
  };

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

        <section className="border border-slate-700 rounded-lg p-6 mb-6">
          <h2 className="text-xl font-semibold font-mono text-slate-100 mb-2">Extras</h2>
          <p className="text-slate-400 font-mono text-sm mb-4">
            Experiments, backups, or features you&apos;ve created but don&apos;t need right now.
          </p>
          <Link
            href="/settings/extras"
            className="inline-block px-4 py-2 rounded-lg bg-slate-700 hover:bg-slate-600 text-slate-100 font-mono text-sm transition-colors"
          >
            Open Extras
          </Link>
        </section>

        <section className="border border-slate-700 rounded-lg p-6 mb-6">
          <h2 className="text-xl font-semibold font-mono text-slate-100 mb-2">Security</h2>
          <p className="text-slate-400 font-mono text-sm mb-4">
            Authentication and biometric settings.
          </p>
          <div className="space-y-3">
            {biometricSupported && (
              <div>
                <button
                  onClick={handleRegisterBiometric}
                  disabled={registeringBiometric}
                  className="px-4 py-2 rounded-lg bg-slate-700 hover:bg-slate-600 text-slate-100 font-mono text-sm transition-colors disabled:opacity-50"
                >
                  {registeringBiometric
                    ? "Registering..."
                    : biometricRegistered
                    ? "Re-register Biometric"
                    : "Register Biometric (Touch ID / Face ID)"}
                </button>
                {biometricRegistered && (
                  <p className="text-green-400 font-mono text-xs mt-1">Biometric is registered</p>
                )}
                {biometricMessage && (
                  <p className={`font-mono text-xs mt-1 ${biometricMessage.includes("success") ? "text-green-400" : "text-red-400"}`}>
                    {biometricMessage}
                  </p>
                )}
              </div>
            )}
            <div>
              <button
                onClick={handleLogout}
                className="px-4 py-2 rounded-lg bg-red-900/50 hover:bg-red-800/50 text-red-300 font-mono text-sm transition-colors"
              >
                Log Out
              </button>
            </div>
          </div>
        </section>

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

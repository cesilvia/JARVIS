"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Navigation from "../../components/Navigation";
import NutritionBackIcon from "../../components/NutritionBackIcon";
import CircuitBackground from "../../hub/CircuitBackground";

const hubTheme = {
  primary: "#00D9FF",
  secondary: "#67C7EB",
  background: "#000000",
};

interface Ingredient {
  name: string;
  amount: number;
  unit: string;
  calories: number;
  carbohydrates: number;
  protein: number;
  fat: number;
}

interface Recipe {
  id?: string;
  name: string;
  servings: number;
  ingredients: Ingredient[];
  totalWeight: number;
  sourceUrl?: string;
}

function convertToGrams(amount: number, unit: string): number {
  const conversions: { [key: string]: number } = {
    g: 1,
    oz: 28.35,
    lb: 453.6,
    kg: 1000,
    ml: 1,
    l: 1000,
    cup: 240,
    tbsp: 15,
    tsp: 5,
    bunch: 50,
    can: 400,
    clove: 5,
    cloves: 5,
  };
  return amount * (conversions[unit] || 1);
}

function calculateRecipeTotals(ingredients: Ingredient[]) {
  return ingredients.reduce(
    (totals, ingredient) => ({
      calories: totals.calories + ingredient.calories,
      carbohydrates: totals.carbohydrates + ingredient.carbohydrates,
      protein: totals.protein + ingredient.protein,
      fat: totals.fat + ingredient.fat,
      weight: totals.weight + convertToGrams(ingredient.amount, ingredient.unit),
    }),
    { calories: 0, carbohydrates: 0, protein: 0, fat: 0, weight: 0 }
  );
}

function formatAmount(amount: number): string {
  if (amount === 0) return "0";
  const whole = Math.floor(amount);
  const frac = amount - whole;
  if (Math.abs(frac) < 0.0001) return String(whole);
  const tolerance = 1.0E-6;
  let h1 = 1, h2 = 0, k1 = 0, k2 = 1;
  let b = frac;
  do {
    const a = Math.floor(b);
    const aux = h1; h1 = a * h1 + h2; h2 = aux;
    const aux2 = k1; k1 = a * k1 + k2; k2 = aux2;
    b = 1 / (b - a);
  } while (Math.abs(frac - h1 / k1) > frac * tolerance);
  const num = h1 % k1 === 0 ? h1 / k1 : h1;
  const den = h1 % k1 === 0 ? 1 : k1;
  const fracStr = den === 1 ? String(num) : `${num}/${den}`;
  return whole === 0 ? fracStr : `${whole} ${fracStr}`;
}

export default function BrowseRecipesPage() {
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [selectedRecipe, setSelectedRecipe] = useState<Recipe | null>(null);

  useEffect(() => {
    const raw = localStorage.getItem("jarvis-recipes");
    if (raw) {
      try {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          const sorted = [...parsed].sort((a, b) =>
            (a.name || "").localeCompare(b.name || "", undefined, { sensitivity: "base" })
          );
          setRecipes(sorted);
        }
      } catch (e) {
        console.error("Failed to load recipes", e);
      }
    }
  }, []);

  const byLetter = recipes.reduce<Record<string, Recipe[]>>((acc, recipe) => {
    const letter = (recipe.name || "?").charAt(0).toUpperCase();
    if (!acc[letter]) acc[letter] = [];
    acc[letter].push(recipe);
    return acc;
  }, {});
  const letters = Object.keys(byLetter).sort();

  return (
    <div className="min-h-screen hud-scifi-bg relative" style={{ backgroundColor: hubTheme.background, color: hubTheme.primary }}>
      <CircuitBackground />
      <main className="container mx-auto px-4 py-8 max-w-4xl relative z-10">
        <div className="grid grid-cols-3 items-start gap-4 mb-8">
          <div className="flex justify-start">
            <Navigation />
          </div>
          <h2 className="text-2xl font-semibold hud-text text-center">Browse recipes</h2>
          <div className="flex justify-end">
            <NutritionBackIcon />
          </div>
        </div>

        <p className="text-[#67C7EB] mb-6">
          <Link href="/nutrition" className="hover:underline">← Food and Nutrition</Link>
          {" · "}
          <Link href="/recipes" className="hover:underline">Recipe Builder</Link>
        </p>

        {recipes.length === 0 ? (
          <div className="hud-card rounded-lg p-8 border border-[#00D9FF]/20 text-center">
            <p className="text-[#67C7EB]">No recipes saved yet. Create recipes in Recipe Builder to see them here.</p>
            <Link
              href="/recipes"
              className="inline-block mt-4 px-4 py-2 rounded-lg border border-[#00D9FF]/50 bg-[rgba(0,217,255,0.15)] text-[#00D9FF] hover:bg-[rgba(0,217,255,0.25)]"
            >
              Recipe Builder
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Alphabetical list */}
            <div className="md:col-span-1 hud-card rounded-lg p-4 border border-[#00D9FF]/20 max-h-[70vh] overflow-y-auto">
              <h3 className="text-lg font-semibold text-[#00D9FF] mb-3">Recipes A–Z</h3>
              {letters.map((letter) => (
                <div key={letter} className="mb-4">
                  <div className="text-sm font-semibold text-[#67C7EB] mb-1">{letter}</div>
                  <ul className="space-y-0.5">
                    {byLetter[letter].map((recipe) => (
                      <li key={recipe.id || recipe.name}>
                        <button
                          type="button"
                          onClick={() => setSelectedRecipe(recipe)}
                          className={`w-full text-left px-2 py-1.5 rounded text-sm transition-colors ${
                            selectedRecipe && (selectedRecipe.id || selectedRecipe.name) === (recipe.id || recipe.name)
                              ? "bg-[rgba(0,217,255,0.25)] text-[#00D9FF]"
                              : "text-[#67C7EB] hover:bg-[rgba(0,217,255,0.1)]"
                          }`}
                        >
                          {recipe.name}
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>

            {/* Recipe card */}
            <div className="md:col-span-2">
              {selectedRecipe ? (
                <div className="hud-card rounded-lg p-6 border border-[#00D9FF]/20">
                  <h3 className="text-xl font-semibold text-[#00D9FF] mb-2">{selectedRecipe.name}</h3>
                  <p className="text-sm text-[#67C7EB] mb-4">
                    {selectedRecipe.servings} servings • {Math.round(calculateRecipeTotals(selectedRecipe.ingredients).weight)}g total
                  </p>

                  <div className="grid grid-cols-4 gap-2 mb-4">
                    {(() => {
                      const totals = calculateRecipeTotals(selectedRecipe.ingredients);
                      const servings = selectedRecipe.servings || 1;
                      const perServing = {
                        calories: Math.round(totals.calories / servings),
                        carbohydrates: Math.round((totals.carbohydrates / servings) * 10) / 10,
                        protein: Math.round((totals.protein / servings) * 10) / 10,
                        fat: Math.round((totals.fat / servings) * 10) / 10,
                      };
                      const per100g = {
                        calories: totals.weight > 0 ? Math.round((totals.calories / totals.weight) * 100) : 0,
                        carbohydrates: totals.weight > 0 ? Math.round((totals.carbohydrates / totals.weight) * 100 * 10) / 10 : 0,
                        protein: totals.weight > 0 ? Math.round((totals.protein / totals.weight) * 100 * 10) / 10 : 0,
                        fat: totals.weight > 0 ? Math.round((totals.fat / totals.weight) * 100 * 10) / 10 : 0,
                      };
                      return (
                        <>
                          <div className="rounded border border-[#00D9FF]/20 bg-[rgba(0,217,255,0.05)] p-2">
                            <div className="text-xs text-[#67C7EB]">Cal</div>
                            <div className="text-lg font-bold text-[#00D9FF]">{perServing.calories}</div>
                          </div>
                          <div className="rounded border border-[#00D9FF]/20 bg-[rgba(0,217,255,0.05)] p-2">
                            <div className="text-xs text-[#67C7EB]">Carbs</div>
                            <div className="text-lg font-bold text-[#00D9FF]">{perServing.carbohydrates}g</div>
                          </div>
                          <div className="rounded border border-[#00D9FF]/20 bg-[rgba(0,217,255,0.05)] p-2">
                            <div className="text-xs text-[#67C7EB]">Protein</div>
                            <div className="text-lg font-bold text-[#00D9FF]">{perServing.protein}g</div>
                          </div>
                          <div className="rounded border border-[#00D9FF]/20 bg-[rgba(0,217,255,0.05)] p-2">
                            <div className="text-xs text-[#67C7EB]">Fat</div>
                            <div className="text-lg font-bold text-[#00D9FF]">{perServing.fat}g</div>
                          </div>
                          <div className="col-span-4 text-sm text-[#67C7EB]">
                            <strong>Per 100g:</strong> {per100g.calories} cal, {per100g.carbohydrates}g carbs, {per100g.protein}g protein, {per100g.fat}g fat
                          </div>
                        </>
                      );
                    })()}
                  </div>

                  <div className="mt-4 pt-4 border-t border-[#00D9FF]/20">
                    <div className="text-xs font-medium text-[#67C7EB] mb-2">Ingredients</div>
                    <ul className="text-xs text-[#67C7EB] space-y-1">
                      {selectedRecipe.ingredients.map((ing, i) => (
                        <li key={i}>• {ing.name} ({formatAmount(ing.amount)} {ing.unit})</li>
                      ))}
                    </ul>
                  </div>

                  {selectedRecipe.sourceUrl && (
                    <div className="mt-2">
                      <a
                        href={selectedRecipe.sourceUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-[#00D9FF] hover:underline"
                      >
                        View original recipe →
                      </a>
                    </div>
                  )}

                  <div className="mt-4 pt-4 border-t border-[#00D9FF]/20 flex gap-2 flex-wrap">
                    <Link
                      href={`/recipes?edit=${selectedRecipe.id || selectedRecipe.name}`}
                      className="inline-block px-3 py-1.5 text-sm rounded border border-[#00D9FF]/50 bg-[rgba(0,217,255,0.15)] text-[#00D9FF] hover:bg-[rgba(0,217,255,0.25)]"
                    >
                      Edit in Recipe Builder
                    </Link>
                    <button
                      type="button"
                      onClick={() => {
                        if (
                          confirm(`Are you sure you want to delete "${selectedRecipe.name}"?`) &&
                          confirm("This cannot be undone. Click OK to permanently delete this recipe.")
                        ) {
                          const updated = recipes.filter((r) => r !== selectedRecipe);
                          localStorage.setItem("jarvis-recipes", JSON.stringify(updated));
                          setRecipes(updated);
                          setSelectedRecipe(null);
                        }
                      }}
                      className="px-3 py-1.5 text-sm rounded border border-red-500/50 bg-red-500/10 text-red-400 hover:bg-red-500/20"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ) : (
                <div className="hud-card rounded-lg p-8 border border-[#00D9FF]/20 flex items-center justify-center min-h-[200px]">
                  <p className="text-[#67C7EB]">Click a recipe in the list to view it.</p>
                </div>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

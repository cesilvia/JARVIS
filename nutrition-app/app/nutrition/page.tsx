"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import Navigation from "../components/Navigation";
import CircuitBackground from "../hub/CircuitBackground";

const hubTheme = {
  primary: "#00D9FF",
  secondary: "#67C7EB",
  accent: "#00FF88",
  background: "#000000",
  cardBg: "rgba(0, 217, 255, 0.05)",
  text: "#00D9FF",
  textSecondary: "#67C7EB",
};

interface NutritionData {
  name: string;
  calories: number;
  carbohydrates: number;
  protein: number;
  fat: number;
  servingSize?: number;
  servingUnit?: string;
  per100g?: {
    calories: number;
    carbohydrates: number;
    protein: number;
    fat: number;
  };
  source?: string;
  imageUrl?: string;
}

interface Recipe {
  id?: string;
  name: string;
  servings: number;
  ingredients: any[];
  totalWeight: number;
  createdAt?: string;
  sourceUrl?: string;
}

export default function Home() {
  const pathname = usePathname();
  const [ingredient, setIngredient] = useState("");
  const [barcode, setBarcode] = useState("");
  const [nutritionData, setNutritionData] = useState<NutritionData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [customAmount, setCustomAmount] = useState<number | null>(null);
  const [showManualEntry, setShowManualEntry] = useState(false);
  const [manualEntry, setManualEntry] = useState({
    name: "",
    calories: "",
    carbohydrates: "",
    protein: "",
    fat: "",
    servingSize: "",
    servingUnit: "g",
  });
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [recipeSearch, setRecipeSearch] = useState("");
  const [savedIngredients, setSavedIngredients] = useState<NutritionData[]>([]);
  const [manualAddSuccess, setManualAddSuccess] = useState(false);
  const [recentRecipesForCompare, setRecentRecipesForCompare] = useState<Recipe[]>([]);
  const [showCompareRecipes, setShowCompareRecipes] = useState(false);

  // Hide results when landing on this page (e.g. after navigating back from another page)
  useEffect(() => {
    if (pathname === "/nutrition") {
      setNutritionData(null);
      setCustomAmount(null);
      setError(null);
    }
  }, [pathname]);

  // Load recipes and saved ingredients from localStorage (same list used by "Search by ingredient name")
  useEffect(() => {
    const savedRecipes = localStorage.getItem("jarvis-recipes");
    if (savedRecipes) {
      try {
        const parsed = JSON.parse(savedRecipes);
        setRecipes(parsed);
      } catch (e) {
        console.error("Failed to load recipes:", e);
      }
    }

    const savedIngs = localStorage.getItem("jarvis-saved-ingredients");
    if (savedIngs) {
      try {
        const parsed = JSON.parse(savedIngs);
        setSavedIngredients(parsed);
      } catch (e) {
        console.error("Failed to load saved ingredients:", e);
      }
    }
  }, []);

  // Listen for recipe updates (when recipes are saved/updated)
  useEffect(() => {
    const handleStorageChange = () => {
      const savedRecipes = localStorage.getItem("jarvis-recipes");
      if (savedRecipes) {
        try {
          const parsed = JSON.parse(savedRecipes);
          setRecipes(parsed);
        } catch (e) {
          console.error("Failed to load recipes:", e);
        }
      }
    };

    window.addEventListener("storage", handleStorageChange);
    // Also check periodically for same-tab updates
    const interval = setInterval(handleStorageChange, 1000);
    
    return () => {
      window.removeEventListener("storage", handleStorageChange);
      clearInterval(interval);
    };
  }, []);

  const calculateRecipeTotals = (ingredients: any[]) => {
    const convertToGrams = (amount: number, unit: string): number => {
      const conversions: { [key: string]: number } = {
        g: 1, oz: 28.35, lb: 453.6, kg: 1000, ml: 1, l: 1000,
        cup: 240, tbsp: 15, tsp: 5,
      };
      return amount * (conversions[unit] || 1);
    };

    return ingredients.reduce(
      (totals, ingredient) => ({
        calories: totals.calories + (ingredient.calories || 0),
        carbohydrates: totals.carbohydrates + (ingredient.carbohydrates || 0),
        protein: totals.protein + (ingredient.protein || 0),
        fat: totals.fat + (ingredient.fat || 0),
        weight: totals.weight + convertToGrams(ingredient.amount || 0, ingredient.unit || "g"),
      }),
      { calories: 0, carbohydrates: 0, protein: 0, fat: 0, weight: 0 }
    );
  };

  const loadRecipeNutrition = (recipe: Recipe) => {
    try {
      if (!recipe || !recipe.ingredients || recipe.ingredients.length === 0) {
        setError("Recipe has no ingredients");
        return;
      }

      const totals = calculateRecipeTotals(recipe.ingredients);
      const servings = recipe.servings || 1;
      
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

      const recipeNutrition: NutritionData = {
        name: recipe.name,
        calories: perServing.calories,
        carbohydrates: perServing.carbohydrates,
        protein: perServing.protein,
        fat: perServing.fat,
        servingSize: totals.weight > 0 ? totals.weight / servings : 100,
        servingUnit: "g",
        per100g: per100g,
        source: "Recipe",
      };

      setNutritionData(recipeNutrition);
      setCustomAmount(null);
      setError(null);
      setRecentRecipesForCompare((prev) => [
        recipe,
        ...prev.filter((r) => (r.id || r.name) !== (recipe.id || recipe.name)),
      ].slice(0, 2));

      // Scroll to nutrition results section
      setTimeout(() => {
        const nutritionSection = document.querySelector('[data-nutrition-results]');
        if (nutritionSection) {
          nutritionSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      }, 100);
    } catch (err) {
      console.error("Error loading recipe nutrition:", err);
      setError(`Failed to load recipe nutrition: ${err instanceof Error ? err.message : "Unknown error"}`);
    }
  };

  const filteredRecipes = recipeSearch
    ? recipes.filter(
        (r) =>
          r.name.toLowerCase().includes(recipeSearch.toLowerCase()) ||
          r.ingredients.some((ing) => ing.name?.toLowerCase().includes(recipeSearch.toLowerCase()))
      )
    : recipes;
  const [suggestions, setSuggestions] = useState<{ name: string; fdcId?: number | null; isSaved?: boolean; data?: NutritionData }[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [searchingSuggestions, setSearchingSuggestions] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);

  // Autocomplete search with debouncing
  useEffect(() => {
    if (ingredient.length < 2) {
      setSuggestions([]);
      setShowSuggestions(false);
      setSearchingSuggestions(false);
      return;
    }

    const timeoutId = setTimeout(async () => {
      setSearchingSuggestions(true);
      try {
        // Search saved ingredients first
        const savedMatches = savedIngredients
          .filter((ing) => ing.name.toLowerCase().includes(ingredient.toLowerCase()))
          .map((ing) => ({ name: ing.name, fdcId: null, isSaved: true, data: ing }))
          .slice(0, 5);

        // Then search USDA API
        const response = await fetch(`/api/usda/autocomplete?q=${encodeURIComponent(ingredient)}`);
        const data = await response.json();
        const usdaSuggestions = (data.suggestions || []).map((s: any) => ({ ...s, isSaved: false }));

        // Combine saved ingredients first, then USDA results
        const allSuggestions = [...savedMatches, ...usdaSuggestions];
        setSuggestions(allSuggestions);
        setShowSuggestions(allSuggestions.length > 0);
      } catch (err) {
        console.error("Autocomplete error:", err);
        // Still show saved ingredients even if API fails
        const savedMatches = savedIngredients
          .filter((ing) => ing.name.toLowerCase().includes(ingredient.toLowerCase()))
          .map((ing) => ({ name: ing.name, fdcId: null, isSaved: true, data: ing }));
        setSuggestions(savedMatches);
        setShowSuggestions(savedMatches.length > 0);
      } finally {
        setSearchingSuggestions(false);
      }
    }, 300); // 300ms debounce

    return () => clearTimeout(timeoutId);
  }, [ingredient, savedIngredients]);

  // Close suggestions when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        suggestionsRef.current &&
        !suggestionsRef.current.contains(event.target as Node) &&
        inputRef.current &&
        !inputRef.current.contains(event.target as Node)
      ) {
        setShowSuggestions(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSelectSuggestion = async (suggestion: { name: string; fdcId?: number | null; isSaved?: boolean; data?: NutritionData }) => {
    setIngredient(suggestion.name);
    setShowSuggestions(false);
    
    // If it's a saved ingredient, use it directly
    if (suggestion.isSaved && suggestion.data) {
      setNutritionData(suggestion.data);
      setCustomAmount(null);
      return;
    }

    // Otherwise, search USDA API
    setLoading(true);
    setError(null);
    setNutritionData(null);
    
    try {
      const response = await fetch(`/api/usda/search?q=${encodeURIComponent(suggestion.name)}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to fetch nutrition data");
      }

      setNutritionData(data);
      setCustomAmount(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to search ingredient");
    } finally {
      setLoading(false);
    }
  };

  const handleManualSearch = async () => {
    if (!ingredient.trim()) {
      setError("Please enter an ingredient name");
      return;
    }

    setShowSuggestions(false);
    setLoading(true);
    setError(null);
    setNutritionData(null);
    
    try {
      const response = await fetch(`/api/usda/search?q=${encodeURIComponent(ingredient)}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to fetch nutrition data");
      }

      setNutritionData(data);
      setCustomAmount(null); // Reset custom amount when new data loads
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to search ingredient");
    } finally {
      setLoading(false);
    }
  };

  const handleBarcodeScan = async () => {
    if (!barcode.trim()) {
      setError("Please enter a barcode");
      return;
    }

    setLoading(true);
    setError(null);
    setNutritionData(null);
    
    try {
      const response = await fetch(`/api/openfoodfacts/barcode?barcode=${encodeURIComponent(barcode)}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to fetch nutrition data");
      }

      setNutritionData(data);
      setCustomAmount(null); // Reset custom amount when new data loads
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to scan barcode");
    } finally {
      setLoading(false);
    }
  };

  const calculateMacros = (data: NutritionData, amount: number) => {
    // If we have per100g data (from Open Food Facts), use that for more accurate calculations
    if (data.per100g) {
      const ratio = amount / 100;
      return {
        calories: Math.round(data.per100g.calories * ratio),
        carbohydrates: Math.round(data.per100g.carbohydrates * ratio * 10) / 10,
        protein: Math.round(data.per100g.protein * ratio * 10) / 10,
        fat: Math.round(data.per100g.fat * ratio * 10) / 10,
      };
    }
    
    // Otherwise, use serving size ratio
    if (data.servingSize) {
      const ratio = amount / data.servingSize;
      return {
        calories: Math.round(data.calories * ratio),
        carbohydrates: Math.round(data.carbohydrates * ratio * 10) / 10,
        protein: Math.round(data.protein * ratio * 10) / 10,
        fat: Math.round(data.fat * ratio * 10) / 10,
      };
    }
    
    return null;
  };

  const handleManualEntry = () => {
    // Validate required fields
    if (!manualEntry.name.trim()) {
      setError("Please enter a product name");
      return;
    }
    if (!manualEntry.calories || !manualEntry.carbohydrates || !manualEntry.protein || !manualEntry.fat) {
      setError("Please fill in all nutrition values");
      return;
    }
    if (!manualEntry.servingSize) {
      setError("Please enter a serving size");
      return;
    }

    const servingSize = parseFloat(manualEntry.servingSize);
    const calories = parseFloat(manualEntry.calories);
    const carbohydrates = parseFloat(manualEntry.carbohydrates);
    const protein = parseFloat(manualEntry.protein);
    const fat = parseFloat(manualEntry.fat);

    if (isNaN(servingSize) || isNaN(calories) || isNaN(carbohydrates) || isNaN(protein) || isNaN(fat)) {
      setError("Please enter valid numbers");
      return;
    }

    // Calculate per 100g for accurate calculations
    const ratio = 100 / servingSize;
    const per100g = {
      calories: Math.round(calories * ratio),
      carbohydrates: Math.round(carbohydrates * ratio * 10) / 10,
      protein: Math.round(protein * ratio * 10) / 10,
      fat: Math.round(fat * ratio * 10) / 10,
    };

    const data: NutritionData = {
      name: manualEntry.name.trim(),
      calories: calories,
      carbohydrates: carbohydrates,
      protein: protein,
      fat: fat,
      servingSize: servingSize,
      servingUnit: manualEntry.servingUnit,
      per100g: per100g,
      source: "Manual Entry",
    };

    // Add to searchable "database" (savedIngredients + localStorage) — used by "Search by ingredient name" autocomplete
    const existingIngredients = savedIngredients.filter((ing) => ing.name.toLowerCase() !== data.name.toLowerCase());
    const updatedIngredients = [...existingIngredients, data];
    setSavedIngredients(updatedIngredients);
    localStorage.setItem("jarvis-saved-ingredients", JSON.stringify(updatedIngredients));

    setNutritionData(data);
    setCustomAmount(null);
    setShowManualEntry(false);
    setError(null);
    setManualAddSuccess(true);
    setTimeout(() => setManualAddSuccess(false), 4000);

    // Reset form
    setManualEntry({
      name: "",
      calories: "",
      carbohydrates: "",
      protein: "",
      fat: "",
      servingSize: "",
      servingUnit: "g",
    });
  };

  return (
    <div className="min-h-screen hud-scifi-bg relative" style={{ backgroundColor: hubTheme.background, color: hubTheme.text }}>
      <CircuitBackground />
      <main className="container mx-auto px-4 py-8 max-w-4xl relative z-10">
        <div className="mb-8 flex items-center justify-center relative">
          <div className="absolute left-0">
            <Navigation />
          </div>
          <h2 className="text-2xl font-semibold hud-text">
            Food and Nutrition
          </h2>
        </div>

        <div className="hud-card rounded-lg p-6 mb-6 border border-[#00D9FF]/20">
          <div className="flex items-center justify-center relative mb-4">
            <h2 className="text-2xl font-semibold hud-text">
              Food and Nutrition
            </h2>
            <button
              className="absolute right-0 px-4 py-2 rounded-lg border border-[#00D9FF]/50 bg-[rgba(0,217,255,0.15)] text-[#00D9FF] hover:bg-[rgba(0,217,255,0.25)] text-sm transition-colors"
              onClick={() => {
                setShowManualEntry(!showManualEntry);
                setError(null);
              }}
            >
              {showManualEntry ? "Cancel" : "Add Manually"}
            </button>
          </div>

          {/* Manual Entry Form */}
          {showManualEntry && (
            <div className="mb-6 p-4 rounded-lg border border-[#00D9FF]/30 bg-[rgba(0,217,255,0.05)]">
              <h3 className="text-lg font-semibold text-[#00D9FF] mb-4">
                Enter Nutrition Information Manually
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-[#67C7EB] mb-2">
                    Product Name *
                  </label>
                  <input
                    type="text"
                    value={manualEntry.name}
                    onChange={(e) => setManualEntry({ ...manualEntry, name: e.target.value })}
                    placeholder="e.g., My Custom Protein Bar"
                    className="w-full px-4 py-2 border border-[#00D9FF]/50 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#00D9FF]/50 bg-black/30 text-[#00D9FF] placeholder-[#67C7EB]/50"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[#67C7EB] mb-2">
                    Serving Size *
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="number"
                      value={manualEntry.servingSize}
                      onChange={(e) => setManualEntry({ ...manualEntry, servingSize: e.target.value })}
                      placeholder="100"
                      className="flex-1 px-4 py-2 border border-[#00D9FF]/50 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#00D9FF]/50 bg-black/30 text-[#00D9FF] placeholder-[#67C7EB]/50"
                    />
                    <select
                      value={manualEntry.servingUnit}
                      onChange={(e) => setManualEntry({ ...manualEntry, servingUnit: e.target.value })}
                      className="px-4 py-2 border border-[#00D9FF]/50 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#00D9FF]/50 bg-black/30 text-[#00D9FF]"
                    >
                      <option value="g">g</option>
                      <option value="oz">oz</option>
                      <option value="ml">ml</option>
                      <option value="cup">cup</option>
                      <option value="tbsp">tbsp</option>
                      <option value="tsp">tsp</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-[#67C7EB] mb-2">
                    Calories *
                  </label>
                  <input
                    type="number"
                    value={manualEntry.calories}
                    onChange={(e) => setManualEntry({ ...manualEntry, calories: e.target.value })}
                    placeholder="250"
                    className="w-full px-4 py-2 border border-[#00D9FF]/50 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#00D9FF]/50 bg-black/30 text-[#00D9FF] placeholder-[#67C7EB]/50"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[#67C7EB] mb-2">
                    Carbohydrates (g) *
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    value={manualEntry.carbohydrates}
                    onChange={(e) => setManualEntry({ ...manualEntry, carbohydrates: e.target.value })}
                    placeholder="30"
                    className="w-full px-4 py-2 border border-[#00D9FF]/50 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#00D9FF]/50 bg-black/30 text-[#00D9FF] placeholder-[#67C7EB]/50"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[#67C7EB] mb-2">
                    Protein (g) *
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    value={manualEntry.protein}
                    onChange={(e) => setManualEntry({ ...manualEntry, protein: e.target.value })}
                    placeholder="20"
                    className="w-full px-4 py-2 border border-[#00D9FF]/50 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#00D9FF]/50 bg-black/30 text-[#00D9FF] placeholder-[#67C7EB]/50"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[#67C7EB] mb-2">
                    Fat (g) *
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    value={manualEntry.fat}
                    onChange={(e) => setManualEntry({ ...manualEntry, fat: e.target.value })}
                    placeholder="10"
                    className="w-full px-4 py-2 border border-[#00D9FF]/50 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#00D9FF]/50 bg-black/30 text-[#00D9FF] placeholder-[#67C7EB]/50"
                  />
                </div>
              </div>
              <button
                onClick={handleManualEntry}
                className="mt-4 px-6 py-2 rounded-lg border border-[#00D9FF]/50 bg-[rgba(0,217,255,0.15)] text-[#00D9FF] hover:bg-[rgba(0,217,255,0.25)] transition-colors"
              >
                Add Nutrition Data
              </button>
            </div>
          )}

          {manualAddSuccess && (
            <div className="mb-4 rounded-lg border border-[#00FF88]/40 bg-[rgba(0,255,136,0.08)] px-4 py-2 text-sm text-[#00FF88]">
              Saved. You can find it by searching above.
            </div>
          )}

          {/* Manual Ingredient Input */}
          <div className="mb-6 relative">
            <label className="block text-sm font-medium text-[#67C7EB] mb-2">
              Search by Ingredient Name
            </label>
            <div className="flex gap-2 relative">
              <div className="flex-1 relative">
                <input
                  ref={inputRef}
                  type="text"
                  value={ingredient}
                  onChange={(e) => {
                    setIngredient(e.target.value);
                    // Don't set showSuggestions here - let useEffect handle it
                  }}
                  onFocus={() => {
                    // Show suggestions if we already have them
                    if (suggestions.length > 0) {
                      setShowSuggestions(true);
                    }
                  }}
                  placeholder="e.g., campbells, chicken breast, apple"
                  className="w-full px-4 py-2 border border-[#00D9FF]/50 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#00D9FF]/50 bg-black/30 text-[#00D9FF] placeholder-[#67C7EB]/50"
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      handleManualSearch();
                    } else if (e.key === "Escape") {
                      setShowSuggestions(false);
                    }
                  }}
                />
                {/* Suggestions Dropdown */}
                {(showSuggestions || searchingSuggestions) && (
                  <div
                    ref={suggestionsRef}
                    className="absolute z-10 w-full mt-1 border border-[#00D9FF]/50 rounded-lg shadow-lg max-h-60 overflow-y-auto bg-black/90"
                  >
                    {searchingSuggestions ? (
                      <div className="px-4 py-2 text-sm text-[#67C7EB]/80">
                        Searching...
                      </div>
                    ) : suggestions.length > 0 ? (
                      suggestions.map((suggestion, index) => (
                        <button
                          key={suggestion.fdcId || suggestion.name || index}
                          onClick={() => handleSelectSuggestion(suggestion)}
                          className="w-full text-left px-4 py-2 hover:bg-[rgba(0,217,255,0.15)] text-[#00D9FF] border-b border-[#00D9FF]/20 last:border-b-0 flex items-center justify-between"
                        >
                          <span>{suggestion.name}</span>
                          {suggestion.isSaved && (
                            <span className="text-xs text-[#00FF88] ml-2">Saved</span>
                          )}
                        </button>
                      ))
                    ) : ingredient.length >= 2 ? (
                      <div className="px-4 py-2 text-sm text-[#67C7EB]/80">
                        No results found. Try a different search term.
                      </div>
                    ) : null}
                  </div>
                )}
              </div>
              <button
                onClick={handleManualSearch}
                disabled={loading}
                className="px-6 py-2 rounded-lg border border-[#00D9FF]/50 bg-[rgba(0,217,255,0.15)] text-[#00D9FF] hover:bg-[rgba(0,217,255,0.25)] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Search
              </button>
            </div>
          </div>

          {/* Barcode Input */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-[#67C7EB] mb-2">
              Search by Barcode (UPC)
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={barcode}
                onChange={(e) => setBarcode(e.target.value)}
                placeholder="Enter barcode number"
                className="flex-1 px-4 py-2 border border-[#00D9FF]/50 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#00D9FF]/50 bg-black/30 text-[#00D9FF] placeholder-[#67C7EB]/50"
                onKeyDown={(e) => e.key === "Enter" && handleBarcodeScan()}
              />
              <button
                onClick={handleBarcodeScan}
                disabled={loading}
                className="px-6 py-2 rounded-lg border border-[#00D9FF]/50 bg-[rgba(0,217,255,0.15)] text-[#00D9FF] hover:bg-[rgba(0,217,255,0.25)] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Scan
              </button>
            </div>
          </div>

          {loading && (
            <div className="text-center py-4">
              <p className="text-[#67C7EB]/90">Searching...</p>
            </div>
          )}

          {error && (
            <div className="border border-[#00D9FF]/40 bg-[rgba(0,217,255,0.08)] rounded-lg p-4 mb-4">
              <p className="text-[#00D9FF] whitespace-pre-line">{error}</p>
            </div>
          )}
        </div>

        {/* Nutrition Results */}
        {nutritionData && (
          <div className="hud-card rounded-lg p-6 border border-[#00D9FF]/20 relative" data-nutrition-results>
            <div className="absolute top-4 right-4">
              <button
                type="button"
                onClick={() => {
                  setNutritionData(null);
                  setCustomAmount(null);
                  setError(null);
                }}
                className="px-3 py-1.5 rounded-lg border border-[#00D9FF]/50 bg-[rgba(0,217,255,0.15)] text-[#00D9FF] hover:bg-[rgba(0,217,255,0.25)] text-sm transition-colors"
                aria-label="Clear results"
              >
                Clear
              </button>
            </div>
            <div className="flex items-start gap-4 mb-4">
              {nutritionData.imageUrl && (
                <img
                  src={nutritionData.imageUrl}
                  alt={nutritionData.name}
                  className="w-24 h-24 object-cover rounded-lg"
                />
              )}
              <div className="flex-1">
                <h3 className="text-2xl font-semibold text-[#00D9FF] mb-1">
                  {nutritionData.name}
                </h3>
                {nutritionData.source && (
                  <p className="text-sm text-[#67C7EB]/80">
                    Source: {nutritionData.source}
                  </p>
                )}
              </div>
            </div>

            {/* Custom Amount Input - At the top */}
            {nutritionData.servingSize && (
              <div className="mb-6">
                <label className="block text-sm font-medium text-[#67C7EB] mb-2">
                  Enter Custom Amount (grams)
                </label>
                <input
                  type="number"
                  value={customAmount || ""}
                  onChange={(e) => {
                    const amount = parseFloat(e.target.value);
                    setCustomAmount(amount > 0 ? amount : null);
                  }}
                  placeholder={`Default: ${nutritionData.servingSize} ${nutritionData.servingUnit || "g"}`}
                  className="w-full md:w-64 px-4 py-2 border border-[#00D9FF]/50 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#00D9FF]/50 bg-black/30 text-[#00D9FF] placeholder-[#67C7EB]/50"
                />
                {customAmount && (
                  <p className="text-sm text-[#67C7EB]/80 mt-1">
                    Showing nutrition for {customAmount}g
                  </p>
                )}
              </div>
            )}

            {/* Main Macro Table - Updates based on custom amount */}
            {(() => {
              const displayAmount = customAmount || nutritionData.servingSize || 100;
              const displayMacros = customAmount 
                ? calculateMacros(nutritionData, customAmount)
                : {
                    calories: nutritionData.calories,
                    carbohydrates: nutritionData.carbohydrates,
                    protein: nutritionData.protein,
                    fat: nutritionData.fat,
                  };
              
              if (!displayMacros) return null;

              return (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                  <div className="rounded-lg p-4 border border-[#00D9FF]/20 bg-[rgba(0,217,255,0.05)]">
                    <div className="text-sm text-[#67C7EB]/90">Calories</div>
                    <div className="text-2xl font-bold text-[#00D9FF]">
                      {displayMacros.calories}
                    </div>
                    <div className="text-xs text-[#67C7EB]/80 mt-1">
                      per {displayAmount} {nutritionData.servingUnit || "g"}
                    </div>
                  </div>
                  <div className="rounded-lg p-4 border border-[#00D9FF]/20 bg-[rgba(0,217,255,0.05)]">
                    <div className="text-sm text-[#67C7EB]/90">Carbs</div>
                    <div className="text-2xl font-bold text-[#00D9FF]">
                      {displayMacros.carbohydrates}g
                    </div>
                  </div>
                  <div className="rounded-lg p-4 border border-[#00D9FF]/20 bg-[rgba(0,217,255,0.05)]">
                    <div className="text-sm text-[#67C7EB]/90">Protein</div>
                    <div className="text-2xl font-bold text-[#00D9FF]">
                      {displayMacros.protein}g
                    </div>
                  </div>
                  <div className="rounded-lg p-4 border border-[#00D9FF]/20 bg-[rgba(0,217,255,0.05)]">
                    <div className="text-sm text-[#67C7EB]/90">Fat</div>
                    <div className="text-2xl font-bold text-[#00D9FF]">
                      {displayMacros.fat}g
                    </div>
                  </div>
                </div>
              );
            })()}

            {/* Quick Reference - Per 1g and Per 100g */}
            {nutritionData.servingSize && (
              <div className="border-t border-[#00D9FF]/20 pt-4">
                <h4 className="text-lg font-semibold text-[#00D9FF] mb-3">
                  Quick Reference
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="rounded-lg p-4 border border-[#00D9FF]/20 bg-[rgba(0,217,255,0.05)]">
                    <div className="text-sm font-medium text-[#00D9FF] mb-2">
                      Per 1 gram
                    </div>
                    {(() => {
                      const macros = calculateMacros(nutritionData, 1);
                      return macros ? (
                        <div className="text-sm text-[#67C7EB]">
                          <div>{macros.calories > 0 ? `${macros.calories} cal` : "<1 cal"}</div>
                          <div>{macros.carbohydrates > 0 ? `${macros.carbohydrates}g carbs` : "<0.1g carbs"}</div>
                          <div>{macros.protein > 0 ? `${macros.protein}g protein` : "<0.1g protein"}</div>
                          <div>{macros.fat > 0 ? `${macros.fat}g fat` : "<0.1g fat"}</div>
                        </div>
                      ) : null;
                    })()}
                  </div>
                  <div className="rounded-lg p-4 border border-[#00FF88]/30 bg-[rgba(0,255,136,0.05)]">
                    <div className="text-sm font-medium text-[#00FF88] mb-2">
                      Per 100 grams
                    </div>
                    {(() => {
                      const macros = calculateMacros(nutritionData, 100);
                      return macros ? (
                        <div className="text-sm text-[#00FF88]/90">
                          <div>{macros.calories} cal</div>
                          <div>{macros.carbohydrates}g carbs</div>
                          <div>{macros.protein}g protein</div>
                          <div>{macros.fat}g fat</div>
                        </div>
                      ) : null;
                    })()}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Recipes Section */}
        <div className="hud-card rounded-lg p-6 mb-6 border border-[#00D9FF]/20">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl font-semibold hud-text">
              Recipes
            </h2>
            <div className="flex flex-wrap gap-2">
              <Link
                href="/recipes/browse"
                className="px-4 py-2 rounded-lg border border-[#00D9FF]/50 bg-[rgba(0,217,255,0.15)] text-[#00D9FF] hover:bg-[rgba(0,217,255,0.25)] text-sm transition-colors"
              >
                Browse recipes
              </Link>
              <Link
                href="/recipes"
                className="px-4 py-2 rounded-lg border border-[#00D9FF]/50 bg-[rgba(0,217,255,0.15)] text-[#00D9FF] hover:bg-[rgba(0,217,255,0.25)] text-sm transition-colors"
              >
                Recipe Builder
              </Link>
              <button
                type="button"
                onClick={() => setShowCompareRecipes((prev) => !prev)}
                className={`px-4 py-2 rounded-lg border text-sm transition-colors ${
                  showCompareRecipes
                    ? "border-[#00D9FF] bg-[rgba(0,217,255,0.25)] text-[#00D9FF]"
                    : "border-[#00D9FF]/50 bg-[rgba(0,217,255,0.15)] text-[#00D9FF] hover:bg-[rgba(0,217,255,0.25)]"
                }`}
              >
                Compare Recipes
              </button>
            </div>
          </div>

          {/* Recipe Search */}
          <div className="mb-4">
            <input
              type="text"
              value={recipeSearch}
              onChange={(e) => setRecipeSearch(e.target.value)}
              placeholder="Search recipes..."
              className="w-full px-4 py-2 border border-[#00D9FF]/50 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#00D9FF]/50 bg-black/30 text-[#00D9FF] placeholder-[#67C7EB]/50"
            />
          </div>

          {/* Recipe List - only show when user has typed a search */}
          {recipes.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-[#67C7EB]/90">
                No recipes saved yet. Create your first recipe to see it here!
              </p>
            </div>
          ) : !recipeSearch.trim() ? null : filteredRecipes.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredRecipes.slice(0, 6).map((recipe) => {
                  const totals = calculateRecipeTotals(recipe.ingredients);
                  const perServing = {
                    calories: Math.round(totals.calories / recipe.servings),
                    carbohydrates: Math.round((totals.carbohydrates / recipe.servings) * 10) / 10,
                    protein: Math.round((totals.protein / recipe.servings) * 10) / 10,
                    fat: Math.round((totals.fat / recipe.servings) * 10) / 10,
                  };

                  return (
                    <div
                      key={recipe.id || recipe.name}
                      role="button"
                      tabIndex={0}
                      onClick={() => loadRecipeNutrition(recipe)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          loadRecipeNutrition(recipe);
                        }
                      }}
                      className="p-4 rounded-lg border border-[#00D9FF]/20 bg-[rgba(0,217,255,0.05)] cursor-pointer hover:bg-[rgba(0,217,255,0.1)] transition-colors"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="font-semibold text-[#00D9FF]">
                          {recipe.name}
                        </h3>
                        <span className="text-xs text-[#00FF88]">Recipe</span>
                      </div>
                      <p className="text-xs text-[#67C7EB]/90 mb-3">
                        {recipe.servings} servings • {recipe.ingredients.length} ingredients
                      </p>
                      <div className="grid grid-cols-4 gap-2 text-xs mb-3">
                        <div>
                          <div className="text-[#67C7EB]/80">Cal</div>
                          <div className="font-bold text-[#00D9FF]">
                            {perServing.calories}
                          </div>
                        </div>
                        <div>
                          <div className="text-[#67C7EB]/80">Carbs</div>
                          <div className="font-bold text-[#00D9FF]">
                            {perServing.carbohydrates}g
                          </div>
                        </div>
                        <div>
                          <div className="text-[#67C7EB]/80">Prot</div>
                          <div className="font-bold text-[#00D9FF]">
                            {perServing.protein}g
                          </div>
                        </div>
                        <div>
                          <div className="text-[#67C7EB]/80">Fat</div>
                          <div className="font-bold text-[#00D9FF]">
                            {perServing.fat}g
                          </div>
                        </div>
                      </div>
                      <div className="flex gap-2 pt-3 border-t border-[#00D9FF]/20" onClick={(e) => e.stopPropagation()}>
                        <Link
                          href={`/recipes?edit=${recipe.id || recipe.name}`}
                          className="flex-1 px-3 py-1.5 text-sm rounded border border-[#00D9FF]/50 bg-[rgba(0,217,255,0.15)] text-[#00D9FF] hover:bg-[rgba(0,217,255,0.25)] transition-colors text-center"
                        >
                          Edit
                        </Link>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-8 text-[#67C7EB]/90">
                No recipes found matching "{recipeSearch}"
              </div>
            )}

          {filteredRecipes.length > 6 && recipeSearch.trim() && (
            <div className="mt-4 text-center">
              <Link
                href="/recipes"
                className="text-[#00D9FF] hover:text-[#67C7EB] hover:underline"
              >
                View all {recipes.length} recipes →
              </Link>
            </div>
          )}

          {/* Compare Recipes panel - shows last 2 viewed recipes side by side */}
          {showCompareRecipes && (
            <div className="mt-6 pt-6 border-t border-[#00D9FF]/20">
              <h3 className="text-lg font-semibold text-[#00D9FF] mb-4">Compare macros</h3>
              {recentRecipesForCompare.length >= 2 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {recentRecipesForCompare.map((recipe) => {
                    const totals = calculateRecipeTotals(recipe.ingredients);
                    const servings = recipe.servings || 1;
                    const perServing = {
                      calories: Math.round(totals.calories / servings),
                      carbohydrates: Math.round((totals.carbohydrates / servings) * 10) / 10,
                      protein: Math.round((totals.protein / servings) * 10) / 10,
                      fat: Math.round((totals.fat / servings) * 10) / 10,
                    };
                    return (
                      <div
                        key={recipe.id || recipe.name}
                        className="p-4 rounded-lg border border-[#00D9FF]/20 bg-[rgba(0,217,255,0.05)]"
                      >
                        <h4 className="font-semibold text-[#00D9FF] mb-3">{recipe.name}</h4>
                        <p className="text-xs text-[#67C7EB]/90 mb-3">{recipe.servings} servings</p>
                        <div className="grid grid-cols-4 gap-2 text-sm">
                          <div>
                            <div className="text-[#67C7EB]/80 text-xs">Cal</div>
                            <div className="font-bold text-[#00D9FF]">{perServing.calories}</div>
                          </div>
                          <div>
                            <div className="text-[#67C7EB]/80 text-xs">Carbs</div>
                            <div className="font-bold text-[#00D9FF]">{perServing.carbohydrates}g</div>
                          </div>
                          <div>
                            <div className="text-[#67C7EB]/80 text-xs">Prot</div>
                            <div className="font-bold text-[#00D9FF]">{perServing.protein}g</div>
                          </div>
                          <div>
                            <div className="text-[#67C7EB]/80 text-xs">Fat</div>
                            <div className="font-bold text-[#00D9FF]">{perServing.fat}g</div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-[#67C7EB]/90 text-sm">
                  Click on at least 2 recipes (search above, then click each) to compare their macros here.
                </p>
              )}
            </div>
          )}
        </div>

        {/* Settings icon (same style as hub) - links to nutrition section in Settings */}
        <div className="flex justify-center mt-6">
          <Link
            href="/settings#nutrition"
            className="flex items-center justify-center w-24 h-24 rounded-full transition-all border-none bg-transparent text-[#00D9FF] hover:scale-110"
            style={{
              filter: "drop-shadow(0 0 3px #00D9FF) drop-shadow(0 0 6px rgba(0,217,255,0.4))",
            }}
            title="Nutrition settings (backup)"
            aria-label="Nutrition settings"
          >
            <svg
              viewBox="0 0 48 48"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.25"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="w-16 h-16"
              aria-hidden
            >
              <circle cx="24" cy="24" r="18" strokeWidth="1.25" fill="none" />
              <line x1="16" y1="18" x2="32" y2="18" strokeWidth="2.25" />
              <circle cx="22" cy="18" r="2.5" strokeWidth="2.25" fill="none" />
              <line x1="16" y1="24" x2="32" y2="24" strokeWidth="2.25" />
              <circle cx="28" cy="24" r="2.5" strokeWidth="2.25" fill="none" />
              <line x1="16" y1="30" x2="32" y2="30" strokeWidth="2.25" />
              <circle cx="24" cy="30" r="2.5" strokeWidth="2.25" fill="none" />
            </svg>
          </Link>
        </div>
      </main>
    </div>
  );
}

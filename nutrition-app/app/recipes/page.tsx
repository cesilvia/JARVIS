"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import Navigation from "../components/Navigation";
import CircuitBackground from "../hub/CircuitBackground";

const hubTheme = {
  primary: "#00D9FF",
  secondary: "#67C7EB",
  background: "#000000",
  cardBg: "rgba(0, 217, 255, 0.05)",
};

interface Ingredient {
  name: string;
  amount: number;
  unit: string;
  calories: number;
  carbohydrates: number;
  protein: number;
  fat: number;
  per100g?: {
    calories: number;
    carbohydrates: number;
    protein: number;
    fat: number;
  };
}

interface Recipe {
  id?: string;
  name: string;
  servings: number;
  ingredients: Ingredient[];
  totalWeight: number; // in grams
  createdAt?: string;
  sourceUrl?: string;
}

export default function RecipesPage() {
  const searchParams = useSearchParams();
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [filteredRecipes, setFilteredRecipes] = useState<Recipe[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [macroFilters, setMacroFilters] = useState({
    caloriesMin: "",
    caloriesMax: "",
    carbsMin: "",
    carbsMax: "",
    proteinMin: "",
    proteinMax: "",
    fatMin: "",
    fatMax: "",
  });
  const [showMacroFilters, setShowMacroFilters] = useState(false);
  const [showRecipeForm, setShowRecipeForm] = useState(false);
  const [showImportForm, setShowImportForm] = useState(false);
  const [importUrl, setImportUrl] = useState("");
  const [importing, setImporting] = useState(false);
  const [currentRecipe, setCurrentRecipe] = useState<Partial<Recipe>>({
    name: "",
    servings: 1,
    ingredients: [],
  });
  const [ingredientSearch, setIngredientSearch] = useState("");
  const [ingredientAmount, setIngredientAmount] = useState("");
  const [ingredientUnit, setIngredientUnit] = useState("g");
  const [loadingIngredient, setLoadingIngredient] = useState(false);
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const [editingIngredientIndex, setEditingIngredientIndex] = useState<number | null>(null);
  const [editingNutrition, setEditingNutrition] = useState({
    calories: "",
    carbohydrates: "",
    protein: "",
    fat: "",
  });
  const [editingIngredientName, setEditingIngredientName] = useState("");
  const [editingIngredientAmount, setEditingIngredientAmount] = useState("");
  const [editingIngredientUnit, setEditingIngredientUnit] = useState("");

  // Helper: convert decimal to mixed fraction string (e.g. 2.5 → "2 1/2", 0.25 → "1/4")
  const decimalToMixedFraction = (decimal: number): string => {
    if (decimal === 0) return "0";
    const whole = Math.floor(decimal);
    const frac = decimal - whole;
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
  };

  // Helper function to parse fraction string to decimal (handles "2 1/2", "1/2", "2.5")
  const parseFraction = (str: string): number => {
    const s = str.trim();
    if (!s) return 0;
    // Mixed number: "2 1/2" or "2 and 1/2"
    const mixedMatch = s.match(/^(\d+)\s+(?:and\s+)?(\d+)\/(\d+)$/) || s.match(/^(\d+)\s+(\d+)\/(\d+)$/);
    if (mixedMatch) {
      const whole = parseInt(mixedMatch[1], 10);
      const num = parseInt(mixedMatch[2], 10);
      const den = parseInt(mixedMatch[3], 10);
      return whole + (den ? num / den : 0);
    }
    if (s.includes("/")) {
      const [num, den] = s.split("/").map(Number);
      return den ? num / den : parseFloat(s) || 0;
    }
    return parseFloat(s) || 0;
  };

  // Helper function to add fractions/decimals
  const addToAmount = (value: string) => {
    const currentValue = parseFraction(ingredientAmount) || 0;
    const addValue = parseFraction(value);
    const newValue = currentValue + addValue;
    setIngredientAmount(String(newValue));
  };

  // Helper function to format amount for display (mixed fraction: "2 1/2" not "5/2")
  const formatAmountDisplay = (value: string): string => {
    if (!value) return "";
    const num = parseFraction(value);
    if (num === 0) return value;
    if (isNaN(num)) return value;
    return decimalToMixedFraction(num);
  };

  // Format a numeric amount for display in lists (mixed fraction)
  const formatAmount = (amount: number): string => {
    if (amount === 0) return "0";
    return decimalToMixedFraction(amount);
  };

  // Load recipes from localStorage on mount
  useEffect(() => {
    const loadRecipes = () => {
      const savedRecipes = localStorage.getItem("jarvis-recipes");
      if (savedRecipes) {
        try {
          const parsed = JSON.parse(savedRecipes);
          console.log("Loaded recipes from localStorage:", parsed.length, "recipes", parsed);
          if (Array.isArray(parsed)) {
            setRecipes(parsed);
            setFilteredRecipes(parsed);
          }
        } catch (e) {
          console.error("Failed to load recipes:", e);
        }
      } else {
        console.log("No recipes found in localStorage");
      }
      setIsInitialLoad(false); // Mark initial load as complete
    };
    
    loadRecipes();
    
    // Also listen for storage events (from other tabs)
    window.addEventListener("storage", loadRecipes);
    return () => window.removeEventListener("storage", loadRecipes);
  }, []);

  // Handle edit query parameter
  useEffect(() => {
    if (!isInitialLoad && recipes.length > 0) {
      const editId = searchParams.get("edit");
      if (editId) {
        const recipeToEdit = recipes.find((r: Recipe) => r.id === editId || r.name === editId);
        if (recipeToEdit) {
          setCurrentRecipe(recipeToEdit);
          setShowRecipeForm(true);
        }
      }
    }
  }, [searchParams, isInitialLoad, recipes]);

  // Save recipes to localStorage whenever recipes change (backup to explicit save)
  // BUT: Don't save on initial load when recipes is empty - that would overwrite existing data
  useEffect(() => {
    if (!isInitialLoad) { // Only save after initial load is complete
      try {
        localStorage.setItem("jarvis-recipes", JSON.stringify(recipes));
        console.log("Recipes auto-saved to localStorage:", recipes.length, "recipes");
      } catch (error) {
        console.error("Failed to save recipes to localStorage:", error);
      }
    }
  }, [recipes, isInitialLoad]);

  // Filter recipes based on search query and macro filters
  useEffect(() => {
    let filtered = recipes;

    // Text search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (recipe) =>
          recipe.name.toLowerCase().includes(query) ||
          recipe.ingredients.some((ing) => ing.name.toLowerCase().includes(query))
      );
    }

    // Macro filters
    const hasMacroFilters = Object.values(macroFilters).some((val) => val !== "");
    if (hasMacroFilters) {
      filtered = filtered.filter((recipe) => {
        const totals = calculateRecipeTotals(recipe.ingredients);
        const servings = recipe.servings || 1;
        const perServing = {
          calories: Math.round(totals.calories / servings),
          carbohydrates: Math.round((totals.carbohydrates / servings) * 10) / 10,
          protein: Math.round((totals.protein / servings) * 10) / 10,
          fat: Math.round((totals.fat / servings) * 10) / 10,
        };

        // Check calories
        if (macroFilters.caloriesMin && perServing.calories < parseFloat(macroFilters.caloriesMin)) {
          return false;
        }
        if (macroFilters.caloriesMax && perServing.calories > parseFloat(macroFilters.caloriesMax)) {
          return false;
        }

        // Check carbs
        if (macroFilters.carbsMin && perServing.carbohydrates < parseFloat(macroFilters.carbsMin)) {
          return false;
        }
        if (macroFilters.carbsMax && perServing.carbohydrates > parseFloat(macroFilters.carbsMax)) {
          return false;
        }

        // Check protein
        if (macroFilters.proteinMin && perServing.protein < parseFloat(macroFilters.proteinMin)) {
          return false;
        }
        if (macroFilters.proteinMax && perServing.protein > parseFloat(macroFilters.proteinMax)) {
          return false;
        }

        // Check fat
        if (macroFilters.fatMin && perServing.fat < parseFloat(macroFilters.fatMin)) {
          return false;
        }
        if (macroFilters.fatMax && perServing.fat > parseFloat(macroFilters.fatMax)) {
          return false;
        }

        return true;
      });
    }

    setFilteredRecipes(filtered);
  }, [searchQuery, recipes, macroFilters]);

  const addIngredientToRecipe = async () => {
    if (!ingredientSearch.trim()) {
      return;
    }

    setLoadingIngredient(true);
    try {
      // Search for the ingredient
      const response = await fetch(`/api/usda/search?q=${encodeURIComponent(ingredientSearch)}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to fetch ingredient");
      }

      // Parse amount (handle fractions); blank means 1 (e.g. "1 bell pepper")
      const amountValue = ingredientAmount ? parseFraction(ingredientAmount) : 1;
      const effectiveAmount = amountValue > 0 ? amountValue : 1;
      
      // Convert amount to grams if needed
      const amountInGrams = convertToGrams(effectiveAmount, ingredientUnit);

      // Calculate nutrition for this amount
      const ingredientMacros = calculateIngredientMacros(data, amountInGrams);

      const newIngredient: Ingredient = {
        name: data.name,
        amount: effectiveAmount,
        unit: ingredientUnit,
        calories: ingredientMacros.calories,
        carbohydrates: ingredientMacros.carbohydrates,
        protein: ingredientMacros.protein,
        fat: ingredientMacros.fat,
        per100g: data.per100g,
      };

      setCurrentRecipe({
        ...currentRecipe,
        ingredients: [...(currentRecipe.ingredients || []), newIngredient],
      });

      // Reset form
      setIngredientSearch("");
      setIngredientAmount("");
      setIngredientUnit("g");
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to add ingredient");
    } finally {
      setLoadingIngredient(false);
    }
  };

  const convertToGrams = (amount: number, unit: string): number => {
    const conversions: { [key: string]: number } = {
      g: 1,
      oz: 28.35,
      lb: 453.6,
      kg: 1000,
      ml: 1, // Approximate for water/liquids
      l: 1000,
      cup: 240, // Approximate
      tbsp: 15,
      tsp: 5,
      bunch: 50,
      can: 400,
      clove: 5,
      cloves: 5,
    };
    return amount * (conversions[unit] || 1);
  };

  const calculateIngredientMacros = (nutritionData: any, amountInGrams: number) => {
    if (nutritionData.per100g) {
      const ratio = amountInGrams / 100;
      return {
        calories: Math.round(nutritionData.per100g.calories * ratio),
        carbohydrates: Math.round(nutritionData.per100g.carbohydrates * ratio * 10) / 10,
        protein: Math.round(nutritionData.per100g.protein * ratio * 10) / 10,
        fat: Math.round(nutritionData.per100g.fat * ratio * 10) / 10,
      };
    }

    if (nutritionData.servingSize) {
      const ratio = amountInGrams / nutritionData.servingSize;
      return {
        calories: Math.round(nutritionData.calories * ratio),
        carbohydrates: Math.round(nutritionData.carbohydrates * ratio * 10) / 10,
        protein: Math.round(nutritionData.protein * ratio * 10) / 10,
        fat: Math.round(nutritionData.fat * ratio * 10) / 10,
      };
    }

    return {
      calories: 0,
      carbohydrates: 0,
      protein: 0,
      fat: 0,
    };
  };

  const calculateRecipeTotals = (ingredients: Ingredient[]) => {
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
  };

  const saveRecipe = () => {
    if (!currentRecipe.name || !currentRecipe.ingredients || currentRecipe.ingredients.length === 0) {
      alert("Please enter a recipe name and add at least one ingredient");
      return;
    }

    const totals = calculateRecipeTotals(currentRecipe.ingredients);
    const recipe: Recipe = {
      id: currentRecipe.id || `recipe-${Date.now()}`,
      name: currentRecipe.name,
      servings: currentRecipe.servings || 1,
      ingredients: currentRecipe.ingredients,
      totalWeight: totals.weight,
      createdAt: currentRecipe.createdAt || new Date().toISOString(),
      sourceUrl: currentRecipe.sourceUrl,
    };

    let updatedRecipes: Recipe[];
    if (currentRecipe.id) {
      // Update existing recipe
      updatedRecipes = recipes.map((r) => (r.id === currentRecipe.id ? recipe : r));
    } else {
      // Add new recipe
      updatedRecipes = [...recipes, recipe];
    }
    
    // Update state
    setRecipes(updatedRecipes);
    
    // Explicitly save to localStorage immediately
    try {
      localStorage.setItem("jarvis-recipes", JSON.stringify(updatedRecipes));
      console.log("Recipe saved successfully:", recipe.name);
    } catch (error) {
      console.error("Failed to save recipe to localStorage:", error);
      alert("Failed to save recipe. Please try again.");
      return;
    }
    
    // Reset form
    setCurrentRecipe({ name: "", servings: 1, ingredients: [] });
    setShowRecipeForm(false);
    
    // Show success message
    alert(`Recipe "${recipe.name}" saved successfully!`);
  };

  const deleteRecipe = (recipeId: string) => {
    if (confirm("Are you sure you want to delete this recipe?")) {
      const updatedRecipes = recipes.filter((r) => r.id !== recipeId);
      setRecipes(updatedRecipes);
      try {
        localStorage.setItem("jarvis-recipes", JSON.stringify(updatedRecipes));
      } catch (error) {
        console.error("Failed to save after delete:", error);
      }
    }
  };

  const exportRecipes = () => {
    try {
      const dataStr = JSON.stringify(recipes, null, 2);
      const dataBlob = new Blob([dataStr], { type: "application/json" });
      const url = URL.createObjectURL(dataBlob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `jarvis-recipes-${new Date().toISOString().split("T")[0]}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      alert(`Exported ${recipes.length} recipe(s) successfully!`);
    } catch (error) {
      console.error("Failed to export recipes:", error);
      alert("Failed to export recipes. Please try again.");
    }
  };

  const importRecipes = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const importedData = JSON.parse(e.target?.result as string);
        
        if (!Array.isArray(importedData)) {
          alert("Invalid file format. Expected an array of recipes.");
          return;
        }

        // Validate recipe structure
        const validRecipes = importedData.filter((r: any) => 
          r.name && Array.isArray(r.ingredients) && r.servings
        );

        if (validRecipes.length === 0) {
          alert("No valid recipes found in file.");
          return;
        }

        if (confirm(`Import ${validRecipes.length} recipe(s)? This will add them to your existing recipes.`)) {
          // Merge with existing recipes (avoid duplicates by ID)
          const existingIds = new Set(recipes.map(r => r.id));
          const newRecipes = validRecipes.filter((r: any) => !r.id || !existingIds.has(r.id));
          const mergedRecipes = [...recipes, ...newRecipes];
          
          setRecipes(mergedRecipes);
          try {
            localStorage.setItem("jarvis-recipes", JSON.stringify(mergedRecipes));
            alert(`Successfully imported ${newRecipes.length} recipe(s)!`);
          } catch (error) {
            console.error("Failed to save imported recipes:", error);
            alert("Failed to save imported recipes.");
          }
        }
      } catch (error) {
        console.error("Failed to import recipes:", error);
        alert("Failed to import recipes. Invalid file format.");
      }
    };
    reader.readAsText(file);
    
    // Reset input so same file can be imported again
    event.target.value = "";
  };

  const importRecipeFromUrl = async () => {
    if (!importUrl.trim()) {
      alert("Please enter a recipe URL");
      return;
    }

    setImporting(true);
    try {
      const response = await fetch(`/api/recipes/import?url=${encodeURIComponent(importUrl)}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to import recipe");
      }

      // Try to fetch nutrition data for imported ingredients
      const ingredientsWithNutrition: Ingredient[] = [];
      
      for (const ingredient of data.ingredients || []) {
        try {
          // Try to search for the ingredient
          const nutritionResponse = await fetch(
            `/api/usda/search?q=${encodeURIComponent(ingredient.name)}`
          );
          
          if (nutritionResponse.ok) {
            const nutritionData = await nutritionResponse.json();
            const amountInGrams = convertToGrams(ingredient.amount, ingredient.unit);
            const macros = calculateIngredientMacros(nutritionData, amountInGrams);
            
            ingredientsWithNutrition.push({
              name: ingredient.name,
              amount: ingredient.amount,
              unit: ingredient.unit,
              calories: macros.calories,
              carbohydrates: macros.carbohydrates,
              protein: macros.protein,
              fat: macros.fat,
              per100g: nutritionData.per100g,
            });
          } else {
            // If nutrition data not found, add ingredient without nutrition (user can fill in manually)
            ingredientsWithNutrition.push({
              name: ingredient.name,
              amount: ingredient.amount,
              unit: ingredient.unit,
              calories: 0,
              carbohydrates: 0,
              protein: 0,
              fat: 0,
            });
          }
        } catch (e) {
          // If search fails, add ingredient without nutrition
          ingredientsWithNutrition.push({
            name: ingredient.name,
            amount: ingredient.amount,
            unit: ingredient.unit,
            calories: 0,
            carbohydrates: 0,
            protein: 0,
            fat: 0,
          });
        }
      }

      // Set the imported recipe data in the form
      setCurrentRecipe({
        name: data.name || "Imported Recipe",
        servings: data.servings || 1,
        ingredients: ingredientsWithNutrition,
        sourceUrl: importUrl,
      });
      setShowImportForm(false);
      setShowRecipeForm(true);
      setImportUrl("");
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to import recipe");
    } finally {
      setImporting(false);
    }
  };

  const removeIngredient = (index: number) => {
    const newIngredients = currentRecipe.ingredients?.filter((_, i) => i !== index) || [];
    setCurrentRecipe({ ...currentRecipe, ingredients: newIngredients });
    if (editingIngredientIndex === index) {
      setEditingIngredientIndex(null);
    }
  };

  const startEditingIngredient = (index: number) => {
    const ingredient = currentRecipe.ingredients?.[index];
    if (ingredient) {
      setEditingIngredientIndex(index);
      setEditingIngredientName(ingredient.name);
      setEditingIngredientAmount(formatAmount(ingredient.amount));
      setEditingIngredientUnit(ingredient.unit || "g");
      setEditingNutrition({
        calories: String(ingredient.calories),
        carbohydrates: String(ingredient.carbohydrates),
        protein: String(ingredient.protein),
        fat: String(ingredient.fat),
      });
    }
  };

  const saveIngredientEdit = (index: number) => {
    if (!currentRecipe.ingredients) return;

    const amount = parseFraction(editingIngredientAmount) || 0;
    const updatedIngredients = [...currentRecipe.ingredients];
    updatedIngredients[index] = {
      ...updatedIngredients[index],
      name: editingIngredientName.trim() || updatedIngredients[index].name,
      amount,
      unit: editingIngredientUnit.trim() || "g",
      calories: parseFloat(editingNutrition.calories) || 0,
      carbohydrates: parseFloat(editingNutrition.carbohydrates) || 0,
      protein: parseFloat(editingNutrition.protein) || 0,
      fat: parseFloat(editingNutrition.fat) || 0,
    };

    setCurrentRecipe({
      ...currentRecipe,
      ingredients: updatedIngredients,
    });

    setEditingIngredientIndex(null);
  };

  const cancelIngredientEdit = () => {
    setEditingIngredientIndex(null);
    setEditingNutrition({ calories: "", carbohydrates: "", protein: "", fat: "" });
    setEditingIngredientName("");
    setEditingIngredientAmount("");
    setEditingIngredientUnit("");
  };

  return (
    <div className="min-h-screen hud-scifi-bg relative" style={{ backgroundColor: hubTheme.background, color: hubTheme.primary }}>
      <CircuitBackground />
      <main className="container mx-auto px-4 py-8 max-w-6xl relative z-10">
        <Navigation />
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-4xl font-bold hud-text mb-2" style={{ color: hubTheme.primary }}>
                Recipe Builder
              </h1>
              <p className="text-lg" style={{ color: hubTheme.secondary }}>
                Create custom recipes and calculate macros ·{" "}
                <Link href="/nutrition" className="text-[#00D9FF] hover:text-[#67C7EB] hover:underline">
                  Nutrition Tracker
                </Link>
              </p>
            </div>
            <div className="flex gap-4">
              {recipes.length > 0 && (
                <>
                  <button
                    onClick={exportRecipes}
                    className="px-4 py-2 rounded-lg border border-[#00D9FF]/50 bg-[rgba(0,217,255,0.15)] text-[#00D9FF] hover:bg-[rgba(0,217,255,0.25)] text-sm transition-colors"
                  >
                    Export Recipes
                  </button>
                  <label className="px-4 py-2 rounded-lg border border-[#00D9FF]/50 bg-[rgba(0,217,255,0.15)] text-[#00D9FF] hover:bg-[rgba(0,217,255,0.25)] text-sm cursor-pointer transition-colors">
                    Import Recipes
                    <input
                      type="file"
                      accept=".json"
                      onChange={importRecipes}
                      className="hidden"
                    />
                  </label>
                </>
              )}
              <button
                onClick={() => {
                  setShowImportForm(!showImportForm);
                  setShowRecipeForm(false);
                }}
                className="px-6 py-2 rounded-lg border border-[#00D9FF]/50 bg-[rgba(0,217,255,0.15)] text-[#00D9FF] hover:bg-[rgba(0,217,255,0.25)] transition-colors"
              >
                {showImportForm ? "Cancel" : "Import from URL"}
              </button>
              <button
                onClick={() => {
                  setShowRecipeForm(!showRecipeForm);
                  setShowImportForm(false);
                }}
                className="px-6 py-2 rounded-lg border border-[#00D9FF]/50 bg-[rgba(0,217,255,0.15)] text-[#00D9FF] hover:bg-[rgba(0,217,255,0.25)] transition-colors"
              >
                {showRecipeForm ? "Cancel" : "New Recipe"}
              </button>
            </div>
          </div>

          {/* Search Bar */}
          {recipes.length > 0 && (
            <div className="mb-6">
              <div className="flex gap-2 mb-2">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search recipes by name or ingredient..."
                  className="flex-1 px-4 py-2 border border-[#00D9FF]/50 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#00D9FF]/50 bg-black/30 text-[#00D9FF] placeholder-[#67C7EB]/50"
                />
                <button
                  onClick={() => setShowMacroFilters(!showMacroFilters)}
                  className={`px-4 py-2 rounded-lg transition-colors border ${
                    showMacroFilters || Object.values(macroFilters).some((v) => v !== "")
                      ? "border-[#00D9FF] bg-[rgba(0,217,255,0.25)] text-[#00D9FF]"
                      : "border-[#00D9FF]/50 bg-[rgba(0,217,255,0.08)] text-[#00D9FF] hover:bg-[rgba(0,217,255,0.15)]"
                  }`}
                >
                  Filter by Macros
                </button>
              </div>
              
              {/* Macro Filters */}
              {showMacroFilters && (
                <div className="mt-4 p-4 rounded-lg border border-[#00D9FF]/30 bg-[rgba(0,217,255,0.05)]">
                  <div className="mb-3">
                    <h3 className="text-sm font-semibold mb-3" style={{ color: hubTheme.primary }}>
                      Filter by Macros (per serving)
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                      {/* Calories */}
                      <div>
                        <label className="block text-xs font-medium text-[#67C7EB] mb-1">
                          Calories
                        </label>
                        <div className="flex gap-2">
                          <input
                            type="number"
                            value={macroFilters.caloriesMin}
                            onChange={(e) =>
                              setMacroFilters({ ...macroFilters, caloriesMin: e.target.value })
                            }
                            placeholder="Min"
                            className="w-full px-2 py-1 text-sm border border-[#00D9FF]/40 rounded bg-black/30 text-[#00D9FF]"
                          />
                          <input
                            type="number"
                            value={macroFilters.caloriesMax}
                            onChange={(e) =>
                              setMacroFilters({ ...macroFilters, caloriesMax: e.target.value })
                            }
                            placeholder="Max"
                            className="w-full px-2 py-1 text-sm border border-[#00D9FF]/40 rounded bg-black/30 text-[#00D9FF]"
                          />
                        </div>
                      </div>

                      {/* Carbs */}
                      <div>
                        <label className="block text-xs font-medium text-[#67C7EB] mb-1">
                          Carbs (g)
                        </label>
                        <div className="flex gap-2">
                          <input
                            type="number"
                            step="0.1"
                            value={macroFilters.carbsMin}
                            onChange={(e) =>
                              setMacroFilters({ ...macroFilters, carbsMin: e.target.value })
                            }
                            placeholder="Min"
                            className="w-full px-2 py-1 text-sm border border-[#00D9FF]/40 rounded bg-black/30 text-[#00D9FF]"
                          />
                          <input
                            type="number"
                            step="0.1"
                            value={macroFilters.carbsMax}
                            onChange={(e) =>
                              setMacroFilters({ ...macroFilters, carbsMax: e.target.value })
                            }
                            placeholder="Max"
                            className="w-full px-2 py-1 text-sm border border-[#00D9FF]/40 rounded bg-black/30 text-[#00D9FF]"
                          />
                        </div>
                      </div>

                      {/* Protein */}
                      <div>
                        <label className="block text-xs font-medium text-[#67C7EB] mb-1">
                          Protein (g)
                        </label>
                        <div className="flex gap-2">
                          <input
                            type="number"
                            step="0.1"
                            value={macroFilters.proteinMin}
                            onChange={(e) =>
                              setMacroFilters({ ...macroFilters, proteinMin: e.target.value })
                            }
                            placeholder="Min"
                            className="w-full px-2 py-1 text-sm border border-[#00D9FF]/40 rounded bg-black/30 text-[#00D9FF]"
                          />
                          <input
                            type="number"
                            step="0.1"
                            value={macroFilters.proteinMax}
                            onChange={(e) =>
                              setMacroFilters({ ...macroFilters, proteinMax: e.target.value })
                            }
                            placeholder="Max"
                            className="w-full px-2 py-1 text-sm border border-[#00D9FF]/40 rounded bg-black/30 text-[#00D9FF]"
                          />
                        </div>
                      </div>

                      {/* Fat */}
                      <div>
                        <label className="block text-xs font-medium text-[#67C7EB] mb-1">
                          Fat (g)
                        </label>
                        <div className="flex gap-2">
                          <input
                            type="number"
                            step="0.1"
                            value={macroFilters.fatMin}
                            onChange={(e) =>
                              setMacroFilters({ ...macroFilters, fatMin: e.target.value })
                            }
                            placeholder="Min"
                            className="w-full px-2 py-1 text-sm border border-[#00D9FF]/40 rounded bg-black/30 text-[#00D9FF]"
                          />
                          <input
                            type="number"
                            step="0.1"
                            value={macroFilters.fatMax}
                            onChange={(e) =>
                              setMacroFilters({ ...macroFilters, fatMax: e.target.value })
                            }
                            placeholder="Max"
                            className="w-full px-2 py-1 text-sm border border-[#00D9FF]/40 rounded bg-black/30 text-[#00D9FF]"
                          />
                        </div>
                      </div>
                    </div>
                    <div className="mt-3 flex justify-end">
                      <button
                        onClick={() => {
                          setMacroFilters({
                            caloriesMin: "",
                            caloriesMax: "",
                            carbsMin: "",
                            carbsMax: "",
                            proteinMin: "",
                            proteinMax: "",
                            fatMin: "",
                            fatMax: "",
                          });
                        }}
                        className="px-3 py-1 text-sm rounded border border-[#00D9FF]/40 bg-[rgba(0,217,255,0.08)] text-[#00D9FF] hover:bg-[rgba(0,217,255,0.15)]"
                      >
                        Clear Filters
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Import Recipe Form */}
        {showImportForm && (
          <div className="hud-card rounded-lg p-6 mb-6 border border-[#00D9FF]/20">
            <h2 className="text-2xl font-semibold text-[#00D9FF] mb-4">
              Import Recipe from Website
            </h2>
            <p className="text-sm text-[#67C7EB] mb-4">
              Enter a recipe URL from popular recipe sites (AllRecipes, Food Network, etc.)
            </p>
            <div className="flex gap-2">
              <input
                type="url"
                value={importUrl}
                onChange={(e) => setImportUrl(e.target.value)}
                placeholder="https://www.allrecipes.com/recipe/..."
                className="flex-1 px-4 py-2 border border-[#00D9FF]/50 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 bg-black/30 text-[#00D9FF]"
                onKeyDown={(e) => e.key === "Enter" && importRecipeFromUrl()}
              />
              <button
                onClick={importRecipeFromUrl}
                disabled={importing}
                className="px-6 py-2 rounded-lg border border-[#00D9FF]/50 bg-[rgba(0,217,255,0.15)] text-[#00D9FF] hover:bg-[rgba(0,217,255,0.25)] disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {importing ? "Importing..." : "Import"}
              </button>
            </div>
          </div>
        )}

        {/* Recipe Form */}
        {showRecipeForm && (
          <div className="hud-card rounded-lg p-6 mb-6 border border-[#00D9FF]/20">
            <h2 className="text-2xl font-semibold text-[#00D9FF] mb-4">
              Create New Recipe
            </h2>

            <div className="mb-6">
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                Recipe Name *
              </label>
              <input
                type="text"
                value={currentRecipe.name || ""}
                onChange={(e) => setCurrentRecipe({ ...currentRecipe, name: e.target.value })}
                placeholder="e.g., Chicken Stir Fry"
                className="w-full px-4 py-2 border border-[#00D9FF]/50 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#00D9FF]/50 bg-black/30 text-[#00D9FF]"
              />
            </div>

            <div className="mb-6">
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                Number of Servings *
              </label>
              <input
                type="number"
                min="1"
                value={currentRecipe.servings || 1}
                onChange={(e) =>
                  setCurrentRecipe({ ...currentRecipe, servings: parseInt(e.target.value) || 1 })
                }
                className="w-full md:w-32 px-4 py-2 border border-[#00D9FF]/50 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#00D9FF]/50 bg-black/30 text-[#00D9FF]"
              />
            </div>

            {/* Add Ingredient */}
            <div className="mb-6 p-4 rounded border border-[#00D9FF]/20 bg-[rgba(0,217,255,0.05)]-lg">
              <h3 className="text-lg font-semibold text-[#00D9FF] mb-4">
                Add Ingredients
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-2 mb-2">
                {/* Amount Input - blank = 1 (e.g. "1 bell pepper") */}
                <input
                  type="text"
                  value={ingredientAmount}
                  onChange={(e) => {
                    const value = e.target.value;
                    if (value === "" || /^[\d./\s]+$/.test(value)) {
                      setIngredientAmount(value);
                    }
                  }}
                  onBlur={() => {
                    if (ingredientAmount) {
                      const n = parseFraction(ingredientAmount);
                      if (!isNaN(n)) setIngredientAmount(decimalToMixedFraction(n));
                    }
                  }}
                  onKeyDown={(e) => e.key === "Enter" && addIngredientToRecipe()}
                  placeholder="Amount (optional)"
                  className="px-4 py-2 border border-[#00D9FF]/50 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#00D9FF]/50 bg-black/30 text-[#00D9FF]"
                />
                {/* Unit Select */}
                <select
                  value={ingredientUnit}
                  onChange={(e) => setIngredientUnit(e.target.value)}
                  className="px-4 py-2 border border-[#00D9FF]/50 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#00D9FF]/50 bg-black/30 text-[#00D9FF]"
                >
                  <option value="g">g</option>
                  <option value="oz">oz</option>
                  <option value="lb">lb</option>
                  <option value="kg">kg</option>
                  <option value="cup">cup</option>
                  <option value="tbsp">tbsp</option>
                  <option value="tsp">tsp</option>
                  <option value="ml">ml</option>
                  <option value="bunch">bunch</option>
                  <option value="can">can</option>
                  <option value="clove">clove</option>
                  <option value="cloves">clove(s)</option>
                </select>
                {/* Ingredient Search */}
                <input
                  type="text"
                  value={ingredientSearch}
                  onChange={(e) => setIngredientSearch(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && addIngredientToRecipe()}
                  placeholder="Search ingredient"
                  className="md:col-span-1 px-4 py-2 border border-[#00D9FF]/50 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#00D9FF]/50 bg-black/30 text-[#00D9FF]"
                />
                {/* Add Button */}
                <button
                  onClick={addIngredientToRecipe}
                  disabled={loadingIngredient}
                  className="px-4 py-2 rounded-lg border border-[#00D9FF]/50 bg-[rgba(0,217,255,0.15)] text-[#00D9FF] hover:bg-[rgba(0,217,255,0.25)] disabled:opacity-50"
                >
                  {loadingIngredient ? "..." : "+"}
                </button>
              </div>
              
              {/* Fraction Buttons */}
              <div className="mb-2">
                <div className="text-xs text-[#67C7EB] mb-1">
                  Quick amounts (click to add):
                </div>
                <div className="flex flex-wrap gap-1">
                  {["1/8", "1/4", "1/3", "1/2", "2/3", "3/4", "1", "1.5", "2", "3"].map((frac) => (
                    <button
                      key={frac}
                      onClick={() => addToAmount(frac)}
                      className="px-2 py-1 text-xs border border-[#00D9FF]/50 rounded bg-black/30 text-[#00D9FF] hover:bg-[rgba(0,217,255,0.1)]"
                    >
                      +{frac}
                    </button>
                  ))}
                  <button
                    onClick={() => setIngredientAmount("")}
                    className="px-2 py-1 text-xs bg-red-100 dark:bg-red-900/20 border border-red-300 dark:border-red-700 rounded hover:bg-red-200 dark:hover:bg-red-900/30 text-red-700 dark:text-red-300"
                  >
                    Clear
                  </button>
                </div>
              </div>

              {/* Unit Buttons */}
              <div>
                <div className="text-xs text-[#67C7EB] mb-1">Quick units:</div>
                <div className="flex flex-wrap gap-1">
                  {["g", "oz", "cup", "tbsp", "tsp", "ml", "bunch", "can", "clove", "cloves"].map((unit) => (
                    <button
                      key={unit}
                      onClick={() => setIngredientUnit(unit)}
                      className="px-2 py-1 text-xs border border-[#00D9FF]/50 rounded bg-black/30 text-[#00D9FF] hover:bg-[rgba(0,217,255,0.1)]"
                    >
                      {unit}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Ingredients List */}
            {currentRecipe.ingredients && currentRecipe.ingredients.length > 0 && (
              <div className="mb-6">
                <h3 className="text-lg font-semibold hud-text mb-3" style={{ color: hubTheme.primary }}>
                  Ingredients ({currentRecipe.ingredients.length})
                </h3>
                <div className="space-y-2">
                  {currentRecipe.ingredients.map((ingredient, index) => (
                    <div
                      key={index}
                      className="p-3 rounded-lg border border-[#00D9FF]/20 hud-card"
                    >
                      {editingIngredientIndex === index ? (
                        // Edit mode: name, amount, unit + nutrition
                        <div className="space-y-3">
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-2 mb-2">
                            <div>
                              <label className="block text-xs mb-1" style={{ color: hubTheme.secondary }}>Ingredient</label>
                              <input
                                type="text"
                                value={editingIngredientName}
                                onChange={(e) => setEditingIngredientName(e.target.value)}
                                className="w-full px-2 py-1 border border-[#00D9FF]/50 rounded text-sm bg-black/30 text-[#00D9FF] placeholder-[#67C7EB]/50"
                                placeholder="Name"
                              />
                            </div>
                            <div>
                              <label className="block text-xs mb-1" style={{ color: hubTheme.secondary }}>Amount</label>
                              <input
                                type="text"
                                value={editingIngredientAmount}
                                onChange={(e) => setEditingIngredientAmount(e.target.value)}
                                className="w-full px-2 py-1 border border-[#00D9FF]/50 rounded text-sm bg-black/30 text-[#00D9FF] placeholder-[#67C7EB]/50"
                                placeholder="e.g. 2 1/2 or 1/4"
                              />
                            </div>
                            <div>
                              <label className="block text-xs mb-1" style={{ color: hubTheme.secondary }}>Unit</label>
                              <input
                                type="text"
                                value={editingIngredientUnit}
                                onChange={(e) => setEditingIngredientUnit(e.target.value)}
                                className="w-full px-2 py-1 border border-[#00D9FF]/50 rounded text-sm bg-black/30 text-[#00D9FF] placeholder-[#67C7EB]/50"
                                placeholder="g, cup, tbsp..."
                              />
                            </div>
                          </div>
                          <div className="flex items-center justify-end gap-2 mb-2">
                            <button
                              onClick={() => saveIngredientEdit(index)}
                              className="px-3 py-1 rounded border border-[#00D9FF]/50 bg-[rgba(0,217,255,0.15)] text-[#00D9FF] hover:bg-[rgba(0,217,255,0.25)] text-sm"
                            >
                              Save
                            </button>
                            <button
                              onClick={cancelIngredientEdit}
                              className="px-3 py-1 rounded border border-[#00D9FF]/30 bg-black/20 text-[#67C7EB] hover:bg-[rgba(0,217,255,0.1)] text-sm"
                            >
                              Cancel
                            </button>
                          </div>
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                            <div>
                              <label className="block text-xs mb-1" style={{ color: hubTheme.secondary }}>Calories</label>
                              <input
                                type="number"
                                value={editingNutrition.calories}
                                onChange={(e) =>
                                  setEditingNutrition({ ...editingNutrition, calories: e.target.value })
                                }
                                className="w-full px-2 py-1 border border-[#00D9FF]/50 rounded text-sm bg-black/30 text-[#00D9FF]"
                                placeholder="0"
                              />
                            </div>
                            <div>
                              <label className="block text-xs mb-1" style={{ color: hubTheme.secondary }}>Carbs (g)</label>
                              <input
                                type="number"
                                step="0.1"
                                value={editingNutrition.carbohydrates}
                                onChange={(e) =>
                                  setEditingNutrition({ ...editingNutrition, carbohydrates: e.target.value })
                                }
                                className="w-full px-2 py-1 border border-[#00D9FF]/50 rounded text-sm bg-black/30 text-[#00D9FF]"
                                placeholder="0"
                              />
                            </div>
                            <div>
                              <label className="block text-xs mb-1" style={{ color: hubTheme.secondary }}>Protein (g)</label>
                              <input
                                type="number"
                                step="0.1"
                                value={editingNutrition.protein}
                                onChange={(e) =>
                                  setEditingNutrition({ ...editingNutrition, protein: e.target.value })
                                }
                                className="w-full px-2 py-1 border border-[#00D9FF]/50 rounded text-sm bg-black/30 text-[#00D9FF]"
                                placeholder="0"
                              />
                            </div>
                            <div>
                              <label className="block text-xs mb-1" style={{ color: hubTheme.secondary }}>Fat (g)</label>
                              <input
                                type="number"
                                step="0.1"
                                value={editingNutrition.fat}
                                onChange={(e) =>
                                  setEditingNutrition({ ...editingNutrition, fat: e.target.value })
                                }
                                className="w-full px-2 py-1 border border-[#00D9FF]/50 rounded text-sm bg-black/30 text-[#00D9FF]"
                                placeholder="0"
                              />
                            </div>
                          </div>
                        </div>
                      ) : (
                        // Display mode
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <span className="font-medium text-[#00D9FF]">
                              {ingredient.name}
                            </span>
                            <span className="text-sm ml-2" style={{ color: hubTheme.secondary }}>
                              {formatAmount(ingredient.amount)} {ingredient.unit}
                            </span>
                            <span className="text-xs ml-2 opacity-80" style={{ color: hubTheme.secondary }}>
                              ({ingredient.calories} cal, {ingredient.carbohydrates}g carbs, {ingredient.protein}g protein, {ingredient.fat}g fat)
                            </span>
                          </div>
                          <div className="flex gap-2">
                            <button
                              onClick={() => startEditingIngredient(index)}
                              className="px-3 py-1 rounded border border-[#00D9FF]/50 bg-[rgba(0,217,255,0.1)] text-[#00D9FF] hover:bg-[rgba(0,217,255,0.2)] text-sm"
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => removeIngredient(index)}
                              className="px-3 py-1 text-red-400 hover:bg-red-500/20 rounded text-sm"
                            >
                              Remove
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Recipe Totals Preview */}
            {currentRecipe.ingredients && currentRecipe.ingredients.length > 0 && (
              <div className="mb-6 p-4 rounded-lg border border-[#00D9FF]/20 hud-card">
                <h3 className="text-lg font-semibold mb-3" style={{ color: hubTheme.primary }}>
                  Recipe Nutrition
                </h3>
                {(() => {
                  const totals = calculateRecipeTotals(currentRecipe.ingredients);
                  const perServing = {
                    calories: Math.round(totals.calories / (currentRecipe.servings || 1)),
                    carbohydrates: Math.round((totals.carbohydrates / (currentRecipe.servings || 1)) * 10) / 10,
                    protein: Math.round((totals.protein / (currentRecipe.servings || 1)) * 10) / 10,
                    fat: Math.round((totals.fat / (currentRecipe.servings || 1)) * 10) / 10,
                  };
                  const per100g = {
                    calories: totals.weight > 0 ? Math.round((totals.calories / totals.weight) * 100) : 0,
                    carbohydrates: totals.weight > 0 ? Math.round((totals.carbohydrates / totals.weight) * 100 * 10) / 10 : 0,
                    protein: totals.weight > 0 ? Math.round((totals.protein / totals.weight) * 100 * 10) / 10 : 0,
                    fat: totals.weight > 0 ? Math.round((totals.fat / totals.weight) * 100 * 10) / 10 : 0,
                  };

                  return (
                    <div>
                      {/* Per Serving - Shown First */}
                      <div className="mb-4 pb-4 border-b border-[#00D9FF]/20">
                        <div className="text-sm font-medium text-[#00D9FF] mb-3">
                          Per Serving ({currentRecipe.servings || 1} servings):
                        </div>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                          <div>
                            <div className="text-sm text-[#67C7EB]">Calories</div>
                            <div className="text-2xl font-bold text-[#00D9FF]">
                              {perServing.calories}
                            </div>
                          </div>
                          <div>
                            <div className="text-sm text-[#67C7EB]">Carbs</div>
                            <div className="text-2xl font-bold text-[#00D9FF]">
                              {perServing.carbohydrates}g
                            </div>
                          </div>
                          <div>
                            <div className="text-sm text-[#67C7EB]">Protein</div>
                            <div className="text-2xl font-bold text-[#00D9FF]">
                              {perServing.protein}g
                            </div>
                          </div>
                          <div>
                            <div className="text-sm text-[#67C7EB]">Fat</div>
                            <div className="text-2xl font-bold text-[#00D9FF]">
                              {perServing.fat}g
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Recipe Totals - Shown Second */}
                      <div className="mb-4">
                        <div className="text-sm font-medium text-[#00D9FF] mb-3">
                          Recipe Totals:
                        </div>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                          <div>
                            <div className="text-sm text-[#67C7EB]">Total Calories</div>
                            <div className="text-xl font-bold text-[#00D9FF]">
                              {totals.calories}
                            </div>
                          </div>
                          <div>
                            <div className="text-sm text-[#67C7EB]">Total Carbs</div>
                            <div className="text-xl font-bold text-[#00D9FF]">
                              {totals.carbohydrates}g
                            </div>
                          </div>
                          <div>
                            <div className="text-sm text-[#67C7EB]">Total Protein</div>
                            <div className="text-xl font-bold text-[#00D9FF]">
                              {totals.protein}g
                            </div>
                          </div>
                          <div>
                            <div className="text-sm text-[#67C7EB]">Total Fat</div>
                            <div className="text-xl font-bold text-[#00D9FF]">
                              {totals.fat}g
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Per 100g */}
                      <div>
                        <div className="text-sm font-medium text-[#00D9FF] mb-2">
                          Per 100g:
                        </div>
                        <div className="text-sm text-blue-800 dark:text-blue-300">
                          {per100g.calories} cal, {per100g.carbohydrates}g carbs, {per100g.protein}g protein, {per100g.fat}g fat
                        </div>
                      </div>
                    </div>
                  );
                })()}
              </div>
            )}

            <div className="flex gap-4">
              <button
                onClick={saveRecipe}
                disabled={!currentRecipe.name || !currentRecipe.ingredients || currentRecipe.ingredients.length === 0}
                className="px-6 py-2 rounded-lg border border-[#00D9FF]/50 bg-[rgba(0,217,255,0.15)] text-[#00D9FF] hover:bg-[rgba(0,217,255,0.25)] disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Save Recipe
              </button>
              <button
                onClick={() => {
                  setCurrentRecipe({ name: "", servings: 1, ingredients: [] });
                  setShowRecipeForm(false);
                }}
                className="px-6 py-2 rounded-lg border border-[#00D9FF]/40 bg-[rgba(0,217,255,0.08)] text-[#00D9FF] hover:bg-[rgba(0,217,255,0.15)]"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Saved Recipes */}
        {recipes.length > 0 && (
          <div>
            <h2 className="text-2xl font-semibold text-[#00D9FF] mb-4">
              {searchQuery || Object.values(macroFilters).some((v) => v !== "")
                ? `Search Results (${filteredRecipes.length} of ${recipes.length})`
                : `Saved Recipes (${recipes.length})`}
            </h2>
            {filteredRecipes.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {filteredRecipes.map((recipe) => {
                const totals = calculateRecipeTotals(recipe.ingredients);
                const perServing = {
                  calories: Math.round(totals.calories / recipe.servings),
                  carbohydrates: Math.round((totals.carbohydrates / recipe.servings) * 10) / 10,
                  protein: Math.round((totals.protein / recipe.servings) * 10) / 10,
                  fat: Math.round((totals.fat / recipe.servings) * 10) / 10,
                };
                const per100g = {
                  calories: totals.weight > 0 ? Math.round((totals.calories / totals.weight) * 100) : 0,
                  carbohydrates: totals.weight > 0 ? Math.round((totals.carbohydrates / totals.weight) * 100 * 10) / 10 : 0,
                  protein: totals.weight > 0 ? Math.round((totals.protein / totals.weight) * 100 * 10) / 10 : 0,
                  fat: totals.weight > 0 ? Math.round((totals.fat / totals.weight) * 100 * 10) / 10 : 0,
                };

                return (
                  <div
                    key={recipe.id || recipe.name}
                    className="hud-card rounded-lg p-6 border border-[#00D9FF]/20"
                  >
                    <h3 className="text-xl font-semibold text-[#00D9FF] mb-2">
                      {recipe.name}
                    </h3>
                    <p className="text-sm text-[#67C7EB] mb-4">
                      {recipe.servings} servings • {Math.round(totals.weight)}g total
                    </p>

                    <div className="grid grid-cols-4 gap-2 mb-4">
                      <div className="rounded border border-[#00D9FF]/20 bg-[rgba(0,217,255,0.05)] p-2">
                        <div className="text-xs text-[#67C7EB]">Cal</div>
                        <div className="text-lg font-bold text-[#00D9FF]">
                          {totals.calories}
                        </div>
                      </div>
                      <div className="rounded border border-[#00D9FF]/20 bg-[rgba(0,217,255,0.05)] p-2">
                        <div className="text-xs text-[#67C7EB]">Carbs</div>
                        <div className="text-lg font-bold text-[#00D9FF]">
                          {totals.carbohydrates}g
                        </div>
                      </div>
                      <div className="rounded border border-[#00D9FF]/20 bg-[rgba(0,217,255,0.05)] p-2">
                        <div className="text-xs text-[#67C7EB]">Protein</div>
                        <div className="text-lg font-bold text-[#00D9FF]">
                          {totals.protein}g
                        </div>
                      </div>
                      <div className="rounded border border-[#00D9FF]/20 bg-[rgba(0,217,255,0.05)] p-2">
                        <div className="text-xs text-[#67C7EB]">Fat</div>
                        <div className="text-lg font-bold text-[#00D9FF]">
                          {totals.fat}g
                        </div>
                      </div>
                    </div>

                    <div className="text-sm text-[#67C7EB] space-y-1">
                      <div>
                        <strong>Per serving:</strong> {perServing.calories} cal, {perServing.carbohydrates}g carbs, {perServing.protein}g protein, {perServing.fat}g fat
                      </div>
                      <div>
                        <strong>Per 100g:</strong> {per100g.calories} cal, {per100g.carbohydrates}g carbs, {per100g.protein}g protein, {per100g.fat}g fat
                      </div>
                    </div>

                    <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-700">
                      <div className="text-xs font-medium text-slate-700 dark:text-slate-300 mb-2">
                        Ingredients:
                      </div>
                      <div className="text-xs text-[#67C7EB] space-y-1">
                        {recipe.ingredients.map((ing, i) => (
                          <div key={i}>
                            • {ing.name} ({ing.amount} {ing.unit})
                          </div>
                        ))}
                      </div>
                    </div>
                    {recipe.sourceUrl && (
                      <div className="mt-2">
                        <a
                          href={recipe.sourceUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-blue-600 dark:text-blue-400 hover:underline"
                        >
                          View original recipe →
                        </a>
                      </div>
                    )}
                    <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-700 flex gap-2">
                      <button
                        onClick={() => {
                          setCurrentRecipe(recipe);
                          setShowRecipeForm(true);
                        }}
                        className="flex-1 px-3 py-1 text-sm rounded border border-[#00D9FF]/50 bg-[rgba(0,217,255,0.15)] text-[#00D9FF] hover:bg-[rgba(0,217,255,0.25)]"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => recipe.id && deleteRecipe(recipe.id)}
                        className="flex-1 px-3 py-1 text-sm rounded border border-red-400/50 bg-red-500/20 text-red-400 hover:bg-red-500/30"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                );
              })}
              </div>
            ) : searchQuery ? (
              <div className="text-center py-12">
                <p className="text-[#67C7EB]">
                  No recipes found matching "{searchQuery}"
                </p>
              </div>
            ) : null}
          </div>
        )}

        {recipes.length === 0 && !showRecipeForm && !showImportForm && (
          <div className="text-center py-12">
            <p className="text-[#67C7EB] mb-4">
              No recipes yet. Create your first recipe to get started!
            </p>
            <div className="flex gap-4 justify-center">
              <button
                onClick={() => setShowImportForm(true)}
                className="px-6 py-2 rounded-lg border border-[#00D9FF]/50 bg-[rgba(0,217,255,0.15)] text-[#00D9FF] hover:bg-[rgba(0,217,255,0.25)]"
              >
                Import Recipe
              </button>
              <button
                onClick={() => setShowRecipeForm(true)}
                className="px-6 py-2 rounded-lg border border-[#00D9FF]/50 bg-[rgba(0,217,255,0.15)] text-[#00D9FF] hover:bg-[rgba(0,217,255,0.25)]"
              >
                Create Recipe
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

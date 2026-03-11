import { NextRequest, NextResponse } from "next/server";

/**
 * Search USDA FoodData Central API for nutrition information
 * Documentation: https://fdc.nal.usda.gov/api-guide.html
 */
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const query = searchParams.get("q");

  if (!query) {
    return NextResponse.json(
      { error: "Query parameter 'q' is required" },
      { status: 400 }
    );
  }

  try {
    // USDA FoodData Central API - use environment variable if available, otherwise use DEMO_KEY
    const apiKey = process.env.USDA_API_KEY || "DEMO_KEY";
    const response = await fetch(
      `https://api.nal.usda.gov/fdc/v1/foods/search?query=${encodeURIComponent(query)}&pageSize=5&api_key=${apiKey}`,
      {
        headers: {
          "Content-Type": "application/json",
        },
      }
    );

    const data = await response.json();

    // Check for API errors first
    if (data.error) {
      console.error("USDA API error:", data.error);
      const errorCode = data.error.code || "";
      const errorMessage = data.error.message || "Unknown error";
      
      if (errorCode === "OVER_RATE_LIMIT") {
        return NextResponse.json(
          { 
            error: "USDA API rate limit exceeded. The demo API key has reached its limit. To fix this:\n\n1. Get a free API key from https://fdc.nal.usda.gov/api-guide.html\n2. Add it as USDA_API_KEY in your environment variables\n\nFor now, you can use the 'Add Manually' button to enter nutrition data."
          },
          { status: 429 }
        );
      }
      
      return NextResponse.json(
        { 
          error: `USDA API error: ${errorMessage}. Please try again later or use the 'Add Manually' button.`
        },
        { status: 429 }
      );
    }

    if (!response.ok) {
      console.error(`USDA API HTTP error: ${response.status} ${response.statusText}`);
      return NextResponse.json(
        { error: `USDA API error: ${response.statusText}. Please try again later.` },
        { status: response.status }
      );
    }

    // Transform USDA data to our format
    if (data.foods && data.foods.length > 0) {
      const food = data.foods[0];
      
      // Extract nutrition values from foodNutrients array
      const nutrients = food.foodNutrients || [];
      const getNutrient = (nutrientId: number) => {
        const nutrient = nutrients.find((n: any) => n.nutrientId === nutrientId);
        return nutrient?.value || 0;
      };

      // USDA nutrient IDs:
      // 1008 = Energy (kcal)
      // 1005 = Carbohydrate, by difference
      // 1003 = Protein
      // 1004 = Total lipid (fat)
      const per100g = {
        calories: getNutrient(1008),
        carbohydrates: getNutrient(1005),
        protein: getNutrient(1003),
        fat: getNutrient(1004),
      };
      
      const result = {
        name: food.description || query,
        calories: per100g.calories,
        carbohydrates: per100g.carbohydrates,
        protein: per100g.protein,
        fat: per100g.fat,
        servingSize: 100, // USDA data is typically per 100g
        servingUnit: "g",
        per100g: per100g, // Store for accurate calculations
        source: "USDA",
        fdcId: food.fdcId,
      };

      return NextResponse.json(result);
    }

    return NextResponse.json(
      { error: "No results found" },
      { status: 404 }
    );
  } catch (error) {
    console.error("USDA API error:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { error: `Failed to fetch nutrition data: ${errorMessage}. The USDA API may be temporarily unavailable or rate-limited.` },
      { status: 500 }
    );
  }
}

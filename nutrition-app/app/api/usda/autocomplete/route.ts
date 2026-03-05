import { NextRequest, NextResponse } from "next/server";

/**
 * Autocomplete/search suggestions from USDA FoodData Central API
 * Returns multiple results for dropdown selection
 */
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const query = searchParams.get("q");

  if (!query || query.length < 2) {
    return NextResponse.json({ suggestions: [] });
  }

  try {
    // USDA FoodData Central API - use environment variable if available, otherwise use DEMO_KEY
    const apiKey = process.env.USDA_API_KEY || "DEMO_KEY";
    const response = await fetch(
      `https://api.nal.usda.gov/fdc/v1/foods/search?query=${encodeURIComponent(query)}&pageSize=10&api_key=${apiKey}`,
      {
        headers: {
          "Content-Type": "application/json",
        },
      }
    );

    if (!response.ok) {
      console.error(`USDA API error: ${response.status} ${response.statusText}`);
      return NextResponse.json({ suggestions: [] });
    }

    const data = await response.json();

    // Check for API errors
    if (data.error) {
      console.error("USDA API error:", data.error);
      return NextResponse.json({ suggestions: [] });
    }

    // Transform to simple suggestion format
    if (data.foods && data.foods.length > 0) {
      const suggestions = data.foods
        .filter((food: any) => food.description) // Only include foods with descriptions
        .map((food: any) => ({
          name: food.description || "",
          fdcId: food.fdcId,
        }));

      return NextResponse.json({ suggestions });
    }

    return NextResponse.json({ suggestions: [] });
  } catch (error) {
    console.error("USDA autocomplete error:", error);
    return NextResponse.json({ suggestions: [] });
  }
}

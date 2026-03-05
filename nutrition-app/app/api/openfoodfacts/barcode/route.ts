import { NextRequest, NextResponse } from "next/server";

/**
 * Search Open Food Facts API by barcode
 * Documentation: https://world.openfoodfacts.org/data
 * API: https://world.openfoodfacts.org/api/v2/product/{barcode}
 */
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const barcode = searchParams.get("barcode");

  if (!barcode) {
    return NextResponse.json(
      { error: "Query parameter 'barcode' is required" },
      { status: 400 }
    );
  }

  try {
    // Open Food Facts API - no API key required
    const response = await fetch(
      `https://world.openfoodfacts.org/api/v2/product/${barcode}`,
      {
        headers: {
          "User-Agent": "JARVIS-Nutrition-Tracker/1.0",
        },
      }
    );

    if (!response.ok) {
      throw new Error(`Open Food Facts API error: ${response.statusText}`);
    }

    const data = await response.json();

    if (data.status === 0 || !data.product) {
      return NextResponse.json(
        { error: "Product not found. Please check the barcode." },
        { status: 404 }
      );
    }

    const product = data.product;

    // Extract nutrition values
    // Open Food Facts uses "nutriments" object with values per 100g
    const nutriments = product.nutriments || {};
    
    // Get serving size if available, otherwise default to 100g
    const servingSize = product.serving_size 
      ? parseFloat(product.serving_size.replace(/[^0-9.]/g, ""))
      : 100;
    
    const servingUnit = product.serving_size?.match(/[a-zA-Z]+/)?.[0] || "g";

    // Values are typically per 100g, so we need to calculate per serving
    const per100g = {
      calories: nutriments["energy-kcal_100g"] || nutriments["energy-kcal"] || 0,
      carbohydrates: nutriments["carbohydrates_100g"] || nutriments.carbohydrates || 0,
      protein: nutriments["proteins_100g"] || nutriments.proteins || 0,
      fat: nutriments["fat_100g"] || nutriments.fat || 0,
    };

    // Calculate per serving
    const ratio = servingSize / 100;
    const result = {
      name: product.product_name || product.product_name_en || "Unknown Product",
      calories: Math.round(per100g.calories * ratio),
      carbohydrates: Math.round(per100g.carbohydrates * ratio * 10) / 10,
      protein: Math.round(per100g.protein * ratio * 10) / 10,
      fat: Math.round(per100g.fat * ratio * 10) / 10,
      servingSize: servingSize,
      servingUnit: servingUnit,
      per100g: per100g, // Store per 100g values for calculations
      source: "Open Food Facts",
      barcode: barcode,
      imageUrl: product.image_url || product.image_front_url,
    };

    return NextResponse.json(result);
  } catch (error) {
    console.error("Open Food Facts API error:", error);
    return NextResponse.json(
      { error: "Failed to fetch nutrition data from barcode" },
      { status: 500 }
    );
  }
}

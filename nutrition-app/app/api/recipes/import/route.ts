import { NextRequest, NextResponse } from "next/server";

/**
 * Import recipe from a website URL
 * Follows expert recipe scraping rules with priority:
 * 1. JSON-LD Recipe
 * 2. Microdata itemprop="recipeIngredient"
 * 3. "Ingredients" heading + following lists
 * 4. Class-based fallbacks
 */

interface IngredientGroup {
  name: string | null;
  ingredients: string[];
}

interface ParsedIngredients {
  groups: IngredientGroup[];
}

// Helper: Check if text looks like an ingredient (has quantity/unit/food)
function looksLikeIngredient(text: string): boolean {
  const trimmed = text.trim();
  if (!trimmed || trimmed.length < 2) return false;
  
  const lower = trimmed.toLowerCase();
  
  // Skip obvious navigation
  if (isNavigation(trimmed)) return false;
  
  // Skip obvious instructions (long sentences starting with action verbs)
  const instructionVerbs = /^(preheat|mix|bake|cook|stir|combine|heat|boil|simmer|roast|fry|pour|cover|let|cool|serve|chop|dice|slice|mince|grate|peel|remove|place|bring)/i;
  if (instructionVerbs.test(trimmed) && trimmed.length > 60) {
    return false;
  }
  
  // Skip numbered steps
  if (/^\d+[\.\)]\s+[A-Z]/.test(trimmed) && trimmed.length > 30) {
    return false;
  }
  
  // Ingredients typically start with quantities, units, or are food items
  const quantityPattern = /^[\d\/\.\s¼½¾⅓⅔⅛⅜⅝⅞]+/;
  const unitPattern = /^(cup|cups|c|tbsp|tablespoon|tablespoons|tsp|teaspoon|teaspoons|oz|ounce|ounces|lb|pound|pounds|g|gram|grams|kg|kilogram|kilograms|ml|milliliter|milliliters|l|liter|liters|pinch|dash|to taste)/i;
  
  // If it starts with a quantity or unit, it's likely an ingredient
  if (quantityPattern.test(trimmed) || unitPattern.test(trimmed)) {
    return true;
  }
  
  // Be permissive - if it's not clearly an instruction and not navigation, include it
  // This handles cases like "Natural Delights Organic Medjool Dates" which don't start with numbers
  if (trimmed.length < 150 && !instructionVerbs.test(trimmed)) {
    return true;
  }
  
  return false;
}

// Helper: Check if text is navigation/not an ingredient
function isNavigation(text: string): boolean {
  const lower = text.toLowerCase();
  const navKeywords = [
    'home', 'about', 'contact', 'privacy', 'terms', 'faq', 'menu', 'navigation',
    'share', 'print', 'save', 'jump to', 'skip to', 'breadcrumb', 'pagination',
    'our story', 'health & wellness', 'gut health', 'kid nutrition', 'products',
    'find us', 'blog', 'resources', 'trade', 'news', 'cookie', 'all rights reserved',
    'similar recipes', 'more', 'close', 'tags', 'categories', 'social'
  ];
  
  return navKeywords.some(keyword => lower.includes(keyword)) && text.length < 50;
}

// Step 1: Extract from JSON-LD Recipe
function extractFromJsonLd(html: string): ParsedIngredients | null {
  const jsonLdMatches = html.match(/<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi);
  if (!jsonLdMatches) return null;
  
  for (const match of jsonLdMatches) {
    try {
      const jsonContent = match.replace(/<script[^>]*type=["']application\/ld\+json["'][^>]*>/, "").replace(/<\/script>/, "");
      const parsed = JSON.parse(jsonContent);
      
      const items = Array.isArray(parsed) ? parsed : [parsed];
      
      for (const item of items) {
        if (item["@type"] === "Recipe" || (Array.isArray(item["@type"]) && item["@type"].includes("Recipe"))) {
          if (item.recipeIngredient && Array.isArray(item.recipeIngredient)) {
            const ingredients: string[] = [];
            
            for (const ing of item.recipeIngredient) {
              if (typeof ing === 'string') {
                const text = ing.trim();
                if (text && looksLikeIngredient(text) && !isNavigation(text)) {
                  ingredients.push(text);
                }
              } else if (ing && typeof ing === 'object') {
                // Handle structured ingredient objects
                let text = '';
                if (ing.name) {
                  text = ing.name.trim();
                  if (ing.value) text = `${ing.value} ${text}`;
                  if (ing.unitCode || ing.unitText) text = `${text} ${ing.unitCode || ing.unitText}`;
                } else if (ing.text) {
                  text = ing.text.trim();
                }
                if (text && looksLikeIngredient(text) && !isNavigation(text)) {
                  ingredients.push(text);
                }
              }
            }
            
            if (ingredients.length > 0) {
              return {
                groups: [{
                  name: null,
                  ingredients: ingredients
                }]
              };
            }
          }
        }
      }
    } catch (e) {
      // Continue to next match
    }
  }
  
  return null;
}

// Step 2: Extract from Microdata itemprop="recipeIngredient"
function extractFromMicrodata(html: string): ParsedIngredients | null {
  // Find recipe container
  const recipeContainerMatch = html.match(/<[^>]*itemtype=["'][^"']*schema\.org\/Recipe["'][^>]*>([\s\S]*?)<\/[^>]+>/i);
  if (!recipeContainerMatch) return null;
  
  const containerHtml = recipeContainerMatch[1];
  const ingredientMatches = containerHtml.match(/<[^>]*itemprop=["']recipeIngredient["'][^>]*>([\s\S]*?)<\/[^>]+>/gi);
  
  if (!ingredientMatches || ingredientMatches.length === 0) return null;
  
  const ingredients: string[] = [];
  
  for (const match of ingredientMatches) {
    let text = match.replace(/<[^>]*>/g, "").trim();
    
    // Handle PropertyValue structure
    if (match.includes('itemtype') && match.includes('PropertyValue')) {
      const valueMatch = match.match(/itemprop=["']value["'][^>]*>([\s\S]*?)<\/[^>]+>/i);
      const unitMatch = match.match(/itemprop=["']unitCode["'][^>]*>([\s\S]*?)<\/[^>]+>/i);
      const nameMatch = match.match(/itemprop=["']name["'][^>]*>([\s\S]*?)<\/[^>]+>/i);
      
      if (valueMatch || nameMatch) {
        text = [valueMatch?.[1], unitMatch?.[1], nameMatch?.[1]].filter(Boolean).join(' ').trim();
      }
    }
    
    if (text && looksLikeIngredient(text) && !isNavigation(text)) {
      ingredients.push(text);
    }
  }
  
  if (ingredients.length > 0) {
    return {
      groups: [{
        name: null,
        ingredients: ingredients
      }]
    };
  }
  
  return null;
}

// Step 3: Extract from "Ingredients" heading + following lists
function extractFromHeadings(html: string): ParsedIngredients | null {
  // Find "Ingredients" heading (try without container first for simplicity)
  const ingredientsHeadingMatch = html.match(/<h[1-4][^>]*>.*?[Ii]ngredients?.*?<\/h[1-4]>/i);
  if (!ingredientsHeadingMatch) {
    console.log("No ingredients heading found");
    return null;
  }
  
  const headingIndex = html.indexOf(ingredientsHeadingMatch[0]);
  const afterHeading = html.substring(headingIndex + ingredientsHeadingMatch[0].length);
  
  // Stop at Instructions/Directions/Method
  const stopMatch = afterHeading.match(/<h[1-4][^>]*>.*?(?:[Ii]nstructions?|[Dd]irections?|[Mm]ethod|[Ss]teps?).*?<\/h[1-4]>/i);
  const sectionHtml = stopMatch ? afterHeading.substring(0, afterHeading.indexOf(stopMatch[0])) : afterHeading;
  
  console.log("Ingredients section HTML length:", sectionHtml.length);
  
  const groups: IngredientGroup[] = [];
  const allIngredients: string[] = [];
  
  // Get all list items from this section
  const listItems = sectionHtml.match(/<li[^>]*>([\s\S]*?)<\/li>/gi) || [];
  console.log("Found list items:", listItems.length);
  
  for (const item of listItems) {
    const text = item.replace(/<[^>]*>/g, "").trim();
    console.log("Checking item:", text.substring(0, 50));
    
    // Skip section labels
    const lower = text.toLowerCase();
    if (lower === 'dressing' || lower === 'dressing:' || 
        lower === 'sauce' || lower === 'sauce:' ||
        lower === 'topping' || lower === 'topping:' ||
        lower === 'marinade' || lower === 'marinade:') {
      console.log("Skipping section label:", text);
      continue;
    }
    
    if (text && looksLikeIngredient(text) && !isNavigation(text)) {
      allIngredients.push(text);
      console.log("Added ingredient:", text);
    } else {
      console.log("Rejected:", text, "looksLikeIngredient:", looksLikeIngredient(text), "isNavigation:", isNavigation(text));
    }
  }
  
  if (allIngredients.length > 0) {
    groups.push({
      name: null,
      ingredients: allIngredients
    });
    console.log("Returning", allIngredients.length, "ingredients");
    return { groups };
  }
  
  console.log("No ingredients found after filtering");
  return null;
}

// Step 4: Class-based fallback
function extractFromClasses(html: string): ParsedIngredients | null {
  const classPatterns = [
    /<[^>]*class=["'][^"']*ingredients["'][^>]*>([\s\S]*?)<\/[^>]+>/gi,
    /<[^>]*class=["'][^"']*ingredients-list["'][^>]*>([\s\S]*?)<\/[^>]+>/gi,
    /<[^>]*class=["'][^"']*ingredient-list["'][^>]*>([\s\S]*?)<\/[^>]+>/gi,
    /<[^>]*class=["'][^"']*recipe-ingredients["'][^>]*>([\s\S]*?)<\/[^>]+>/gi
  ];
  
  for (const pattern of classPatterns) {
    const matches = [...html.matchAll(pattern)];
    if (matches.length === 0) continue;
    
    const groups: IngredientGroup[] = [];
    
    for (const match of matches) {
      const containerHtml = match[1];
      
      // Skip if in nav/footer/header
      if (/nav|footer|header|aside|breadcrumb|menu|social|share|tags|categories/i.test(match[0])) {
        continue;
      }
      
      const listItems = containerHtml.match(/<li[^>]*>([\s\S]*?)<\/li>/gi) || [];
      const ingredients: string[] = [];
      
      for (const item of listItems) {
        // Skip if mostly links
        const linkCount = (item.match(/<a[^>]*>/gi) || []).length;
        const text = item.replace(/<[^>]*>/g, "").trim();
        
        if (linkCount > 0 && text.length < 20) continue; // Probably navigation
        
        if (text && looksLikeIngredient(text) && !isNavigation(text)) {
          ingredients.push(text);
        }
      }
      
      if (ingredients.length > 0) {
        groups.push({
          name: null,
          ingredients: ingredients
        });
      }
    }
    
    if (groups.length > 0) {
      return { groups };
    }
  }
  
  return null;
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const url = searchParams.get("url");

  if (!url) {
    return NextResponse.json(
      { error: "URL parameter is required" },
      { status: 400 }
    );
  }

  try {
    // Fetch the webpage
    const response = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; JARVIS Recipe Importer)",
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch URL: ${response.statusText}`);
    }

    const html = await response.text();

    // Try extraction methods in priority order
    let parsedIngredients: ParsedIngredients | null = null;
    let method = "";
    
    console.log("Attempting JSON-LD extraction...");
    parsedIngredients = extractFromJsonLd(html);
    if (parsedIngredients && parsedIngredients.groups.length > 0) {
      method = "JSON-LD Recipe";
      console.log(`Found ${parsedIngredients.groups.reduce((sum, g) => sum + g.ingredients.length, 0)} ingredients via JSON-LD`);
    } else {
      console.log("JSON-LD failed, trying microdata...");
      parsedIngredients = extractFromMicrodata(html);
      if (parsedIngredients && parsedIngredients.groups.length > 0) {
        method = "Microdata itemprop";
        console.log(`Found ${parsedIngredients.groups.reduce((sum, g) => sum + g.ingredients.length, 0)} ingredients via microdata`);
      } else {
        console.log("Microdata failed, trying headings...");
        parsedIngredients = extractFromHeadings(html);
        if (parsedIngredients && parsedIngredients.groups.length > 0) {
          method = "Ingredients heading + lists";
          console.log(`Found ${parsedIngredients.groups.reduce((sum, g) => sum + g.ingredients.length, 0)} ingredients via headings`);
        } else {
          console.log("Headings failed, trying classes...");
          parsedIngredients = extractFromClasses(html);
          if (parsedIngredients && parsedIngredients.groups.length > 0) {
            method = "Class-based fallback";
            console.log(`Found ${parsedIngredients.groups.reduce((sum, g) => sum + g.ingredients.length, 0)} ingredients via classes`);
          }
        }
      }
    }

    if (!parsedIngredients || parsedIngredients.groups.length === 0) {
      console.error("Failed to extract any ingredients. HTML length:", html.length);
      // Debug: Check if ingredients heading exists
      const hasIngredientsHeading = /<h[1-4][^>]*>.*?[Ii]ngredients?.*?<\/h[1-4]>/i.test(html);
      console.error("Has ingredients heading:", hasIngredientsHeading);
      return NextResponse.json(
        { error: "Could not extract recipe ingredients from this URL. Please try a different recipe site or enter manually." },
        { status: 400 }
      );
    }

    // Extract recipe name
    const nameMatch = html.match(/<h1[^>]*>(.*?)<\/h1>/i) ||
                      html.match(/<title[^>]*>(.*?)<\/title>/i);
    const recipeName = nameMatch ? nameMatch[1].replace(/<[^>]*>/g, "").trim() : "Imported Recipe";
    
    // Extract servings (try JSON-LD first, then look for common patterns)
    let servings = 1;
    const jsonLdMatch = html.match(/<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/i);
    if (jsonLdMatch) {
      try {
        const parsed = JSON.parse(jsonLdMatch[1]);
        const items = Array.isArray(parsed) ? parsed : [parsed];
        for (const item of items) {
          if (item["@type"] === "Recipe" && item.recipeYield) {
            const yieldStr = String(item.recipeYield);
            const numMatch = yieldStr.match(/\d+/);
            if (numMatch) {
              servings = parseInt(numMatch[0]) || 1;
              break;
            }
          }
        }
      } catch (e) {
        // Ignore
      }
    }
    
    // Flatten all ingredient groups into a single list
    const allIngredients: string[] = [];
    for (const group of parsedIngredients.groups) {
      allIngredients.push(...group.ingredients);
    }
    
    // Parse each ingredient into structured format
    const ingredients = [];
    
    for (const rawIngredient of allIngredients) {
      const ingredientText = String(rawIngredient).trim();
      if (!ingredientText || ingredientText.length < 2) continue;
      
      // Try to parse amount and ingredient name
      const amountMatch = ingredientText.match(/^([\d\/\.\s¼½¾⅓⅔⅛⅜⅝⅞]+)\s*([a-zA-Z]+)?\s*(.+)$/);
      
      let amount = 1;
      let unit = "g";
      let ingredientName = ingredientText;
      
      if (amountMatch) {
        const amountStr = amountMatch[1].trim();
        const possibleUnit = amountMatch[2]?.trim().toLowerCase();
        ingredientName = amountMatch[3]?.trim() || ingredientText;
        
        // Parse fraction or decimal
        const fractionMap: { [key: string]: number } = {
          '¼': 0.25, '½': 0.5, '¾': 0.75,
          '⅓': 1/3, '⅔': 2/3,
          '⅛': 0.125, '⅜': 0.375, '⅝': 0.625, '⅞': 0.875
        };
        
        if (fractionMap[amountStr]) {
          amount = fractionMap[amountStr];
        } else if (amountStr.includes("/")) {
          const [num, den] = amountStr.split("/").map(Number);
          if (den && den > 0) {
            amount = num / den;
          }
        } else {
          amount = parseFloat(amountStr) || 1;
        }
        
        // Map common units
        const unitMap: { [key: string]: string } = {
          cup: "cup", cups: "cup", c: "cup",
          tablespoon: "tbsp", tablespoons: "tbsp", tbsp: "tbsp", tbs: "tbsp",
          teaspoon: "tsp", teaspoons: "tsp", tsp: "tsp",
          ounce: "oz", ounces: "oz", oz: "oz",
          pound: "lb", pounds: "lb", lb: "lb",
          gram: "g", grams: "g", g: "g",
          kilogram: "kg", kilograms: "kg", kg: "kg",
          milliliter: "ml", milliliters: "ml", ml: "ml",
          liter: "l", liters: "l", l: "l",
        };
        
        if (possibleUnit && unitMap[possibleUnit]) {
          unit = unitMap[possibleUnit];
        }
      }
      
      ingredients.push({
        name: ingredientName,
        amount: amount,
        unit: unit,
        calories: 0,
        carbohydrates: 0,
        protein: 0,
        fat: 0,
      });
    }

    return NextResponse.json({
      name: recipeName,
      servings: servings,
      ingredients: ingredients,
      sourceUrl: url,
      _debug: {
        method: method,
        groupsFound: parsedIngredients.groups.length,
        totalIngredients: allIngredients.length
      }
    });
  } catch (error) {
    console.error("Recipe import error:", error);
    return NextResponse.json(
      { error: `Failed to import recipe: ${error instanceof Error ? error.message : "Unknown error"}` },
      { status: 500 }
    );
  }
}

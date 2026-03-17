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

// Parse amount string that may be a mixed number like "3 and 1/4" or "1 and 1/2"
function parseAmountString(amountStr: string): number {
  const str = amountStr.trim();
  if (!str) return 1;

  const fractionMap: { [key: string]: number } = {
    "¼": 0.25, "½": 0.5, "¾": 0.75,
    "⅓": 1 / 3, "⅔": 2 / 3,
    "⅛": 0.125, "⅜": 0.375, "⅝": 0.625, "⅞": 0.875,
  };
  if (fractionMap[str]) return fractionMap[str];

  // Mixed number: "3 and 1/4" or "1 and 1/2"
  const mixedMatch = str.match(/^(\d+)\s+and\s+(\d+)\/(\d+)$/);
  if (mixedMatch) {
    const whole = parseInt(mixedMatch[1], 10);
    const num = parseInt(mixedMatch[2], 10);
    const den = parseInt(mixedMatch[3], 10);
    return whole + (den ? num / den : 0);
  }

  // Simple fraction "1/4" or "3/4"
  if (str.includes("/")) {
    const parts = str.split("/").map(Number);
    if (parts.length === 2 && parts[1] > 0) return parts[0] / parts[1];
  }

  const num = parseFloat(str);
  return isNaN(num) ? 1 : num;
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
// Trust schema.org recipeIngredient; only filter obvious navigation (no looksLikeIngredient filter)
function extractFromJsonLd(html: string): ParsedIngredients | null {
  // Flexible regex: allow whitespace around =, attribute order, and optional s in "ld+json"
  const jsonLdMatches = html.match(/<script[^>]*type\s*=\s*["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi);
  if (!jsonLdMatches) return null;

  const decodeEntities = (s: string) =>
    s
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/&amp;/g, "&")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">");

  for (const match of jsonLdMatches) {
    try {
      let jsonContent = match
        .replace(/<script[^>]*>/, "")
        .replace(/<\/script>\s*$/i, "")
        .trim();
      jsonContent = decodeEntities(jsonContent);
      const parsed = JSON.parse(jsonContent);

      let items: unknown[] = Array.isArray(parsed) ? parsed : [parsed];
      if (items.length === 1 && items[0] && typeof items[0] === "object" && "@graph" in (items[0] as object)) {
        const graph = (items[0] as { "@graph"?: unknown[] })["@graph"];
        items = Array.isArray(graph) ? graph : items;
      }

      for (const item of items) {
        const obj = item as Record<string, unknown>;
        if (obj && (obj["@type"] === "Recipe" || (Array.isArray(obj["@type"]) && obj["@type"].includes("Recipe")))) {
          const raw = obj.recipeIngredient;
          if (raw && Array.isArray(raw)) {
            const ingredients: string[] = [];

            for (const ing of raw) {
              if (typeof ing === "string") {
                const text = ing.trim();
                if (text && !isNavigation(text)) {
                  ingredients.push(text);
                }
              } else if (ing && typeof ing === "object") {
                let text = "";
                if (ing.name) {
                  text = ing.name.trim();
                  if (ing.value) text = `${String(ing.value).trim()} ${text}`;
                  if (ing.unitCode || ing.unitText) text = `${text} ${(ing.unitCode || ing.unitText || "").toString().trim()}`;
                } else if (ing.text) {
                  text = String(ing.text).trim();
                }
                if (text && !isNavigation(text)) {
                  ingredients.push(text);
                }
              }
            }

            if (ingredients.length > 0) {
              return {
                groups: [{ name: null, ingredients }],
              };
            }
          }
        }
      }
    } catch {
      // Continue to next script block
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

// Step 3: Extract from "Ingredients" heading + following lists (and/or lines in paragraphs)
function extractFromHeadings(html: string): ParsedIngredients | null {
  // Find "Ingredients" or "Ingredient list" etc.
  const ingredientsHeadingMatch = html.match(/<h[1-4][^>]*>[\s\S]*?[Ii]ngredients?[\s\S]*?<\/h[1-4]>/i);
  if (!ingredientsHeadingMatch) return null;

  const headingIndex = html.indexOf(ingredientsHeadingMatch[0]);
  const afterHeading = html.substring(headingIndex + ingredientsHeadingMatch[0].length);

  // Stop at Instructions/Directions/Method
  const stopMatch = afterHeading.match(/<h[1-4][^>]*>[\s\S]*?(?:[Ii]nstructions?|[Dd]irections?|[Mm]ethod|[Ss]teps?)[\s\S]*?<\/h[1-4]>/i);
  const sectionHtml = stopMatch ? afterHeading.substring(0, afterHeading.indexOf(stopMatch[0])) : afterHeading;

  const allIngredients: string[] = [];
  const seen = new Set<string>();
  const addIngredient = (text: string) => {
    const t = text.trim();
    if (!t || t.length < 2) return;
    const lower = t.toLowerCase();
    if (lower === "dressing" || lower === "dressing:" || lower === "sauce" || lower === "sauce:" || lower === "topping" || lower === "topping:" || lower === "marinade" || lower === "marinade:") return;
    if (!looksLikeIngredient(t) || isNavigation(t)) return;
    const key = t.toLowerCase().slice(0, 80);
    if (seen.has(key)) return;
    seen.add(key);
    allIngredients.push(t);
  };

  // 1) List items <li>...</li>
  const listItems = sectionHtml.match(/<li[^>]*>([\s\S]*?)<\/li>/gi) || [];
  for (const item of listItems) {
    const text = item.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
    addIngredient(text);
  }

  // 2) Lines from paragraphs/blocks (sites that use <p>, <div> with <br> or newlines)
  const stripTags = (s: string) => s.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
  const blockSplitters = /<br\s*\/?>|<\/p>\s*<p[^>]*>|<\/div>\s*<div[^>]*>|\n/gi;
  const parts = sectionHtml.split(blockSplitters);
  for (const part of parts) {
    const line = stripTags(part);
    if (line && !line.match(/^<|^$/)) addIngredient(line);
  }

  if (allIngredients.length > 0) {
    return {
      groups: [{ name: null, ingredients: allIngredients }],
    };
  }
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

    // Try extraction methods in priority order; collect debug info on failure
    let parsedIngredients: ParsedIngredients | null = null;
    let method = "";
    const debug: Record<string, unknown> = {};

    parsedIngredients = extractFromJsonLd(html);
    debug.jsonLdScripts = (html.match(/<script[^>]*type\s*=\s*["']application\/ld\+json["'][^>]*>/gi) || []).length;
    if (parsedIngredients && parsedIngredients.groups.length > 0) {
      method = "JSON-LD Recipe";
    } else {
      parsedIngredients = extractFromMicrodata(html);
      if (parsedIngredients && parsedIngredients.groups.length > 0) {
        method = "Microdata itemprop";
      } else {
        parsedIngredients = extractFromHeadings(html);
        debug.hasIngredientsHeading = /<h[1-4][^>]*>[\s\S]*?[Ii]ngredients?[\s\S]*?<\/h[1-4]>/i.test(html);
        if (parsedIngredients && parsedIngredients.groups.length > 0) {
          method = "Ingredients heading + lists";
        } else {
          parsedIngredients = extractFromClasses(html);
          if (parsedIngredients && parsedIngredients.groups.length > 0) {
            method = "Class-based fallback";
          }
        }
      }
    }

    if (!parsedIngredients || parsedIngredients.groups.length === 0) {
      return NextResponse.json(
        {
          error: "Could not extract recipe ingredients from this URL. Please try a different recipe site or enter manually.",
          debug: { ...debug, htmlLength: html.length },
        },
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
      
      // Try to parse amount and ingredient name. Allow "and" in amount for mixed numbers like "3 and 1/4 cups"
      const amountMatch = ingredientText.match(/^([\d\/\.\s¼½¾⅓⅔⅛⅜⅝⅞and]+)\s*([a-zA-Z]+)?\s*(.*)$/);
      let amount = 1;
      let unit = "g";
      let ingredientName = ingredientText;

      if (amountMatch) {
        const amountStr = amountMatch[1].trim().replace(/\s+/g, " ");
        const possibleUnit = amountMatch[2]?.trim().toLowerCase();
        const namePart = amountMatch[3]?.trim();
        if (namePart) ingredientName = namePart;

        amount = parseAmountString(amountStr);

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
          bunch: "bunch", bunches: "bunch",
          can: "can", cans: "can",
          clove: "clove", cloves: "cloves",
          count: "count",
          pinch: "tsp", dash: "tsp",
        };

        // Size descriptors → treat as "count" and keep descriptor in the name
        const sizeDescriptors = new Set([
          "large", "medium", "small", "whole", "big", "extra",
        ]);

        if (possibleUnit && unitMap[possibleUnit]) {
          unit = unitMap[possibleUnit];
        } else if (possibleUnit && sizeDescriptors.has(possibleUnit)) {
          unit = "count";
          // Prepend descriptor back to ingredient name for better USDA search
          ingredientName = `${possibleUnit} ${namePart || ""}`.trim();
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

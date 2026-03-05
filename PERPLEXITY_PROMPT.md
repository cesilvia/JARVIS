# Perplexity Prompt: Recipe Ingredient HTML Parsing

I'm building a recipe importer that extracts ingredients from recipe websites. I'm having trouble correctly identifying and extracting ingredient list items from HTML.

**Problem:** When parsing recipe pages, I'm not extracting the actual ingredients - I'm either getting navigation items, preparation instructions, or nothing at all.

**Example URL:** https://www.naturaldelights.com/recipes/curried-couscous-and-date-salad

**What I need to know:**

1. What HTML structure do recipe sites typically use for ingredients lists?
   - Are ingredients in `<ul><li>` tags?
   - Are they in `<div>` elements with specific classes?
   - Are they in `<p>` tags?
   - Do they use schema.org microdata or JSON-LD?

2. How can I reliably identify the ingredients section in HTML?
   - What selectors/patterns should I use to find the ingredients list?
   - How do I distinguish ingredients from navigation menus or other content?
   - How do I stop at the "Preparation" or "Instructions" section?

3. How are ingredient subsections (like "Dressing:", "Sauce:", etc.) typically structured?
   - Are they headings (`<h3>`, `<h4>`) followed by another list?
   - Are they list items themselves that should be skipped?
   - How do I extract ingredients that come after these subsection labels?

4. What are common patterns/classes/attributes used for ingredients?
   - Common CSS classes like "ingredient", "recipe-ingredient", etc.?
   - Data attributes?
   - Specific HTML structure patterns?

5. For the specific example URL above, what is the exact HTML structure of the ingredients section?
   - Show me the actual HTML markup for the ingredients
   - Show me how "Dressing" subsection is structured
   - Show me what selectors would correctly extract all ingredients

**Current approach (not working):**
- Looking for `<h2>` or `<h3>` with "Ingredients" text
- Extracting all `<li>` tags between "Ingredients" and "Preparation" headings
- Filtering out navigation items

**What I need:** A reliable method to extract all ingredient list items from recipe pages, including those in subsections, while excluding navigation and instructions.

Please provide:
1. The actual HTML structure from the example URL
2. Correct CSS selectors or regex patterns to extract ingredients
3. A step-by-step parsing strategy
4. Code examples (JavaScript/TypeScript) showing how to correctly extract ingredients

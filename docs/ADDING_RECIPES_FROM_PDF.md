# Adding Recipes from PDFs

This guide explains how to convert recipes from PDF files into the Gustoso markdown format.

## Overview

The process has four main steps:

1. **Extract text** from the PDF
2. **Parse and clean** the extracted text
3. **Convert** to the recipe markdown format
4. **Flag for review** and validate

---

## 1. Recipe File Location and Naming

- **Location:** `src/content/recipes/`
- **Extension:** `.md`
- **Filename:** Use kebab-case slugs (e.g., `chocolate-fondant.md`, `panna-cotta.md`)
- **Template:** Copy `src/content/recipes/_recipe-template.md` as a starting point

---

## 2. Extracting Text from PDFs

### Option A: Using Python (Recommended)

Create a temporary virtual environment and install `pdfplumber`:

```bash
python3 -m venv /tmp/pdfvenv
/tmp/pdfvenv/bin/pip install pdfplumber
```

Extract text page by page:

```bash
/tmp/pdfvenv/bin/python3 -c "
import pdfplumber
with pdfplumber.open('path/to/file.pdf') as pdf:
    for i, page in enumerate(pdf.pages):
        text = page.extract_text()
        if text:
            print(f'--- Page {i+1} ---')
            print(text)
            print()
"
```

### Option B: Using Command-Line Tools

If `pdftotext` is available:

```bash
pdftotext -layout path/to/file.pdf -
```

### Common PDF Layouts

Restaurant/manual PDFs often have these patterns:

- **Ingredients scattered** across the page in boxes
- **Steps labeled** as "STEP 1", "STEP 2", etc.
- **Headers** like "INGREDIENTS", "HOW TO MAKE", "HOW TO PREPARE"
- **Metadata** like "BATCH SIZE", "SHELF LIFE", "PORTIONS"
- **Boilerplate** like copyright notices that should be removed

**Tip:** Always read through the extracted text and clean out copyright lines, page numbers, and layout artifacts (like rotated text or repeated headers).

---

## 3. The Recipe Frontmatter Schema

Every recipe file starts with YAML frontmatter between `---` markers.

### Supported Fields

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `title` | string | **Yes** | Recipe name |
| `published` | boolean | No | Set to `false` to hide from the homepage |
| `type` | string | No | Category (e.g., "Dessert", "Snack", "Main") |
| `serves` | string | No | Yield (e.g., "Serves 4", "10 portions") |
| `description` | string | No | Short summary |
| `img` | string | No | URL to an image |
| `storage` | string | No | Storage instructions |
| `needsReview` | boolean | No | Set to `true` for recipes migrated from PDF that need manual verification |
| `parts` | array | No | Recipe parts (see below) |
| `ingredients` | array | No | Flat list of ingredients (if no parts) |
| `instructions` | array | No | Flat list of instructions (if no parts) |

### Parts Structure

For recipes with multiple components (e.g., dough + filling + glaze):

```yaml
parts:
  - name: Dough
    ingredients:
      - 400 g flour
      - 100 g sugar
    instructions:
      - step: 1
        description: Mix dry ingredients
      - step: 2
        description: Add wet ingredients

  - name: Filling
    ingredients:
      - 200 g chocolate
    instructions:
      - description: Melt the chocolate
```

Each `part` can have:
- `name` — optional label for the component
- `ingredients` — list of strings
- `instructions` — list of steps
- `storage` — storage notes specific to this part

### Instruction Format

Two styles are supported:

**Numbered steps:**
```yaml
instructions:
  - step: 1
    description: Preheat oven to 180°C
  - step: 2
    description: Mix ingredients
```

**Unnumbered descriptions:**
```yaml
instructions:
  - description: Serve immediately
  - description: Garnish with fresh herbs
```

---

## 4. Conversion Examples

### Example 1: Simple Plating Guide (Assembly-Only)

**PDF text extracted:**
```
CHOCOLATE FONDANT
Warm the fondant for 15 seconds in the microwave
INGREDIENTS
Choclate Fondant 1 ea
Defrosted
B Nutella Sauce 1 jug
Warmed in the microwave
B Cantucci Almonds 1 x 15
Finely chopped ML
Vanilla Ice Cream 1 scoop
Finely chop the almonds Cantucci Icing Sugar Dusting
```

**Converted to markdown:**
```markdown
---
title: Chocolate Fondant
type: Dessert
needsReview: true
parts:
  - ingredients:
      - 1 chocolate fondant, defrosted
      - 1 jug Nutella sauce, warmed in the microwave
      - 15 ml Cantucci almonds, finely chopped
      - 1 scoop vanilla ice cream
    instructions:
      - description: Warm the fondant for 15 seconds in the microwave.
      - description: Serve the fondant with warm Nutella sauce.
      - description: Add a scoop of vanilla ice cream.
      - description: Sprinkle with finely chopped Cantucci almonds and dust with icing sugar.
---
```

**Key decisions made:**
- Combined "INGREDIENTS" and assembly steps into one part (no `name` needed)
- Cleaned up "Choclate" typo to "Chocolate"
- Normalized "1 x 15 ML" to "15 ml"
- Converted the scattered instructions into a clean sequence
- Added `needsReview: true` because this came from a PDF

---

### Example 2: Multi-Part Recipe with Base + Plating

**PDF text extracted:**
```
CHOCOLATE, BREAD AND BUTTER PUDDING
B Chocolate Bread and Butter Pudding 1 slice
B Vanilla Ice Cream 1 scoop
Mint A sprig
10 1 PUDDING = 10 PORTIONS
Cocoa Powder Dusting

HOW TO PREPARE
STEP 1 STEP 2 STEP 3
Remove the already prepared Cut the pudding into 10 even slices Store the slices in a plastic tub
pudding from the tray
Stack 2 per layer with parchment
Remove the cling-film paper in between

STEP 4 STEP 5
Heat 1 slice of B&B pudding in the Place in one side of a Starter Plate
microwave for 20 seconds Dust with cocoa powder and arrange
the ice cream on the other side
Garnish with mint
Serve

INGREDIENTS
CHOCOLATE, BREAD AND BUTTER PUDDING
Eggs - Free Range 7 ea
Chocolate - Couverture 200 gr
3 eggs and 4 yolks
10 BATCH SIZE Sugar - Caster 175 gr Butter - Unsalted 50 gr
10 portions
Croissant - Plain 6 ea
Milk - Whole 450 ml
Halved lengthways
2.5
3 Vanilla Paste 1 x Raisins 70gr
DAY SHELF LIFE ML

STEP 1 STEP 2 STEP 3 STEP 4
Bring the the milk to a simmer Whisk the eggs and Pour the hot milk over the egg 2.5 Add the vanilla
sugar until creamy mix.Whisk together well ML
STEP 5 STEP 6 STEP 7 STEP 8
1ST LAYER
Melt the chocolate and Halve the croissants lengthways Line a loaf tin with a double 3 half croissants (cut side up)
butter in a bain marie layer of clingfilm 1/3 melted chocolate
1/3 raisins
```

**Converted to markdown:**
```markdown
---
title: Chocolate Bread and Butter Pudding
type: Dessert
serves: 10 portions
needsReview: true
parts:
  - name: Pudding Base
    ingredients:
      - 7 free-range eggs (3 whole + 4 yolks)
      - 200 g couverture chocolate
      - 175 g caster sugar
      - 50 g unsalted butter
      - 6 plain croissants, halved lengthways
      - 450 ml whole milk
      - 2.5 ml vanilla paste
      - 70 g raisins
    instructions:
      - step: 1
        description: Bring the milk to a simmer.
      - step: 2
        description: Whisk the eggs and sugar until creamy.
      - step: 3
        description: Pour the hot milk over the egg mix. Whisk together well.
      - step: 4
        description: Add the vanilla.
      - step: 5
        description: Melt the chocolate and butter in a bain marie.
      - step: 6
        description: Halve the croissants lengthways. Line a loaf tin with a double layer of clingfilm.
      - step: 7
        description: 1st layer — 3 half croissants (cut side up), 1/3 melted chocolate, 1/3 raisins.
      - step: 8
        description: 2nd layer — 3 half croissants (cut side up), 1/3 melted chocolate, 1/3 raisins.
      - step: 9
        description: 3rd layer — 3 half croissants (cut side up), 1/3 melted chocolate, 1/3 raisins.
      - step: 10
        description: 4th layer — 3 half croissants (cut side up). Pour over warm milk/egg mixture, gently pushing them down.
      - step: 11
        description: Preheat oven to 170°C and bake in a bain marie for 25 minutes.
  - name: Plating
    ingredients:
      - 1 slice of pudding
      - 1 scoop vanilla ice cream
      - 1 sprig mint
      - Cocoa powder for dusting
    instructions:
      - step: 1
        description: Remove the already prepared pudding from the tray. Remove the cling-film.
      - step: 2
        description: Cut the pudding into 10 even slices. Stack 2 per layer with parchment paper in between. Store the slices in a plastic tub.
      - step: 3
        description: Heat 1 slice of B&B pudding in the microwave for 20 seconds.
      - step: 4
        description: Place on one side of a starter plate. Dust with cocoa powder and arrange the ice cream on the other side.
      - step: 5
        description: Garnish with mint and serve.
storage: Shelf life 3 days.
---
```

**Key decisions made:**
- Split into two logical parts: "Pudding Base" (the actual recipe) and "Plating" (assembly/service)
- Reordered ingredients from the scattered layout into a clean list
- Consolidated repeated layer steps into explicit numbered steps
- Extracted metadata: "10 portions", "Shelf life 3 days"
- Removed boilerplate copyright text

---

### Example 3: Minimal Recipe (No Steps, Just Ingredients)

**PDF text extracted:**
```
PASTA FROLA
150g DE MANTECA
250g DE HARINA COMUN
150g DE HARINA LEUDANTE
150g DE Azúcar
1 CDA. DE RALLADURA DE LIMÓN (2-3G)
1 CDA. DE ESENCIA DE VAINILLA
1 Huevo
1 Yema
8 CDAS. DE LECHE (55g)
500g DE MEMBRILLO
8 CDAS. DE AGUA
```

**Converted to markdown:**
```markdown
---
title: Pasta Frola
parts:
  - ingredients:
      - 150 g manteca
      - 250 g harina común
      - 150 g harina leudante
      - 150 g azúcar
      - 1 cda. ralladura de limón (2-3 g)
      - 1 cda. esencia de vainilla
      - 1 huevo
      - 1 yema
      - 8 cdas. leche (55 g)
      - 500 g membrillo
      - 8 cdas. agua
---
```

**Note:** This existing recipe does not have `needsReview` because it was already in the project. For new PDF migrations, always add `needsReview: true`.

---

## 5. The `needsReview` Flag

When migrating recipes from PDFs, always add `needsReview: true` to the frontmatter.

```yaml
---
title: My New Recipe
type: Dessert
needsReview: true
parts:
  ...
---
```

### What it does

On the homepage (`/`), recipes with `needsReview: true` display with:
- A **yellow dot** next to the title
- A **yellow "check" badge** alongside the type badge
- A **subtle yellow background tint** on the row

This makes it easy to visually distinguish unverified PDF recipes from manually entered ones.

### Dev-only review actions

When running `bun run dev`, each `needsReview` recipe gets two action buttons:

- **✓ Approve** — Removes `needsReview: true` from the file frontmatter instantly. The recipe becomes production-ready.
- **🗑️ Discard** — Moves the file to `.trash/`. It disappears from the active list but can be restored later.

You can use these buttons from either the **homepage list** or the **recipe detail page**.

Discarded recipes can be reviewed and restored from `/dev/trash`.

### Production behavior

Recipes with `needsReview: true` are **completely hidden in production**:
- They do not appear on the homepage
- Direct URLs return **404**
- No review UI, buttons, or indicators are rendered

This means you can safely commit unreviewed recipes — they will never appear on the live site until approved.

### When to remove it

After manually reviewing and correcting the recipe, click **Approve** (in dev mode) or simply delete the `needsReview: true` line from the file. The recipe will then render normally on the homepage and be included in production builds.

For the full review workflow, see [`REVIEW_WORKFLOW.md`](REVIEW_WORKFLOW.md).

---

## 6. Common Cleanup Tasks

After extracting PDF text, you typically need to:

| Task | Example |
|------|---------|
|
| Remove page numbers | `3`, `4`, `5` standalone on lines |
| Fix typos | `Choclate` → `Chocolate`, `Motadella` → `Mortadella` |
| Normalize units | `1 x 15 ML` → `15 ml`, `2.5 ML` → `2.5 ml` |
| Consolidate scattered ingredients | PDFs often split ingredients across columns |
| Reorder steps | PDFs sometimes list steps out of order or in grids |
| Extract metadata | `BATCH SIZE`, `SHELF LIFE`, `PORTIONS` → `serves`, `storage` |
| Handle rotated/mirrored text | Some PDFs have text printed sideways for fold-out pages |

---

## 7. Validation

After creating or editing recipe files, always run the build to validate:

```bash
bun run build
```

If there are YAML syntax errors (e.g., unclosed quotes, bad indentation), the build will fail with a helpful message pointing to the problematic file and line.

Common YAML gotchas:
- **Strings with colons** must be quoted: `"Si no hay pasta de naranjas: +15 g de azúcar"`
- **Indentation must use spaces**, not tabs
- **Lists** start with `- ` at the correct indentation level

---

## 8. Quick Checklist

When adding a recipe from a PDF:

- [ ] Extract text from the PDF page(s)
- [ ] Clean out copyright, page numbers, and layout artifacts
- [ ] Create a new `.md` file in `src/content/recipes/` with kebab-case name
- [ ] Fill in the frontmatter with `title`, `type`, `serves`, etc.
- [ ] Add `needsReview: true` to flag it for manual verification
- [ ] Convert ingredients into a clean list
- [ ] Convert instructions into numbered steps or unnumbered descriptions
- [ ] Use multiple `parts` if the recipe has distinct components
- [ ] Add `storage` if mentioned in the PDF
- [ ] Run `bun run build` to validate YAML syntax
- [ ] Run `bun run dev` to preview on the homepage and verify the yellow review indicator appears
- [ ] Review each recipe for accuracy
- [ ] Click **Approve** on the recipe page or list to remove the `needsReview` flag
- [ ] Click **Discard** to move bad recipes to trash (visit `/dev/trash` to restore if needed)
- [ ] Once all recipes are approved or discarded, run `bun run build` for production

---

## 9. Reference: Content Config

The recipe schema is defined in `src/content.config.ts`. It uses Zod for validation. The `.passthrough()` method means extra fields (like `needsReview`) are allowed without strict schema enforcement, making it easy to add flags for UI purposes.

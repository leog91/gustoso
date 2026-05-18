# Recipe Review Workflow

This guide explains the dev-only workflow for reviewing, approving, and discarding recipes that were imported from PDFs.

---

## Overview

When recipes are imported from PDFs, they are automatically flagged with `needsReview: true` in their frontmatter. This flags them for manual verification before they are considered production-ready.

The review system provides three actions:

| Action | What it does | Result |
|--------|-------------|--------|
| **Approve (✓)** | Removes `needsReview: true` from the recipe | Recipe becomes visible in production builds |
| **Discard (🗑️)** | Moves the recipe file to `.trash/` | Recipe is hidden but can be restored |
| **Restore** | Moves a recipe from `.trash/` back to `src/content/recipes/` | Brings a discarded recipe back for review |

---

## Dev vs. Production Behavior

| Context | `needsReview` recipes in list? | Accessible by URL? | Review UI visible? |
|---------|-------------------------------|--------------------|--------------------|
| `npm run dev` (localhost) | **Yes** (with yellow indicators) | **Yes** | **Yes** |
| `npm run build` / production | **No** | **404** | **No** |

This means you can safely commit recipes with `needsReview: true` — they will never appear on the live site until you approve them.

---

## Step-by-Step Workflow

### 1. Import Recipes from PDF

Follow the guide in [`ADDING_RECIPES_FROM_PDF.md`](ADDING_RECIPES_FROM_PDF.md). All imported recipes automatically get:

```yaml
needsReview: true
```

### 2. Review in Dev Mode

Run the dev server:

```bash
npm run dev
```

Open `http://localhost:4321`. Recipes flagged for review appear with:

- A **yellow dot** next to the title
- A **yellow "check" badge**
- A **subtle yellow background** on the row
- **[✓ Approve]** and **[🗑️ Discard]** buttons (only visible in dev mode)

### 3. Approve a Recipe

Click **Approve** on a recipe when you have verified it is correct.

- The `needsReview: true` line is removed from the file frontmatter
- The recipe immediately loses its yellow indicators
- On the next `npm run build`, the recipe will be included in the production site

You can approve from either:
- The **homepage list** (index)
- The **recipe detail page** (top-right header buttons)

### 4. Discard a Recipe

Click **Discard** on a recipe if it is wrong, redundant, or not needed.

- The file is moved from `src/content/recipes/{slug}.md` → `.trash/{slug}.md`
- The recipe disappears from the active list
- The `.trash/` directory is **gitignored** — discarded recipes are not committed

You can discard from either:
- The **homepage list**
- The **recipe detail page** (redirects back to home after discarding)

### 5. Restore a Discarded Recipe

Visit the trash page:

```
http://localhost:4321/dev/trash
```

This page lists all discarded recipes with their titles and filenames. Click **Restore** to move a recipe back to `src/content/recipes/`. It will return with `needsReview: true` still intact, ready for review again.

The trash page is **dev-only** and will show an error if accessed in production.

---

## Directory Structure

```
gustoso/
├── src/
│   └── content/
│       └── recipes/          ← Active recipes (committed)
│           ├── raspberry-coulis.md
│           └── panna-cotta.md
├── .trash/                    ← Discarded recipes (gitignored, local only)
│   ├── chocolate-fondant.md
│   └── brownie.md
```

---

## Safety & Guards

- **All server actions** (`discardRecipe`, `restoreRecipe`, `removeNeedsReview`) throw an error if called outside of dev mode
- **The `/dev/trash` page** renders a "Dev only" message in production
- **No permanent deletion**: Discard moves files to `.trash/`, it does not delete them
- **No accidental overwrites**: Restore fails if a recipe with the same slug already exists in `src/content/recipes/`

---

## Troubleshooting

| Issue | Solution |
|-------|----------|
| "I approved a recipe but it still shows yellow" | Restart `npm run dev` or wait a moment for Astro's content HMR to reload |
| "A discarded recipe is still in the list" | Refresh the page. Content collections sometimes need a manual reload in dev |
| "Can I see discarded recipes in production?" | No. The `.trash/` directory is local-only and gitignored |
| "I discarded a recipe by mistake" | Go to `/dev/trash` and click **Restore** |
| "The Approve/Discard buttons don't appear" | Make sure you are running `npm run dev`, not `npm run preview` |
| "The trash page shows 'Dev only'" | The trash page only works during `npm run dev`, not after `npm run build` |

---

## Adding the `needsReview` Flag Manually

If you write a recipe that you want to hide from production until reviewed, add this to its frontmatter:

```yaml
---
title: My Draft Recipe
type: Dessert
needsReview: true
parts:
  ...
---
```

It will behave exactly like a PDF-imported recipe: visible in dev with review buttons, hidden in production.

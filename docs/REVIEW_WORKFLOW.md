# Recipe Review Workflow

This guide explains the dev-only workflow for reviewing, approving, and discarding recipes that were imported from PDFs.

**Want to keep unapproved recipes out of Git entirely?** Use the [`/dev/import` local staging workflow](ADDING_RECIPES_FROM_PDF.md#local-interactive-workflow-recommended). PDFs stay in gitignored `temp/`; draft records and their excerpts stay in `temp/recipe-drafts/`. Approval creates a recipe file in `src/content/recipes/`. The review flag on a collection recipe hides it from production, not from Git.

## Find recipes awaiting review

Open **`http://localhost:4321/dev/review`** while running `bun run dev`, or click **Review Queue** on the homepage. This dev-only page lists:

- Collection recipes with `needsReview: true`, linked to their recipe pages for approval/discard.
- Local PDF drafts awaiting approval, linked directly to their populated editor and preview.
- Approved imports, linked to the normal recipe pages so you can find them after they leave the queue.

Approved recipes no longer have the review flag. Unless `published: false` is set, they appear in the main index and search. If Astro's dev content watcher stops picking up files after a server reconfiguration, restart `bun run dev` to resync the content index.

### Send an approved recipe back for review

In dev mode, open an approved recipe and click **Mark for review** in its header. The dev-only action sets `needsReview: true` in its Markdown frontmatter, preserving the other fields and notes, then opens the Review Queue. The recipe is hidden from production until approved again. This does not move it back to local staging or change its original import history.

---

## Overview

Local PDF drafts start with `needsReview: true` and remain outside the collection until approved. If you add an unverified recipe directly to the collection, set `needsReview: true` yourself.

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
| `bun run dev` (localhost) | **Yes** (with yellow indicators) | **Yes** | **Yes** |
| `bun run build` / production | **No** | **404** | **No** |

This means you can safely commit recipes with `needsReview: true` — they will never appear on the live site until you approve them.

---

## Step-by-Step Workflow

### 1. Import Recipes from PDF

Follow the guide in [`ADDING_RECIPES_FROM_PDF.md`](ADDING_RECIPES_FROM_PDF.md). For the manual-file workflow, add this to any unverified collection recipe:

```yaml
needsReview: true
```

### 2. Review in Dev Mode

Run the dev server:

```bash
bun run dev
```

Open `http://localhost:4321`. Recipes flagged for review appear with:

- A yellow highlight and a **Review required** label
- **Approve** and **Discard** buttons (dev mode only)

### 3. Approve a Recipe

Click **Approve** on a recipe when you have verified it is correct.

- The `needsReview: true` line is removed from the file frontmatter
- The recipe immediately loses its yellow indicators
- On the next `bun run build`, the recipe will be included in the production site

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

This page lists all discarded recipes with their titles and filenames. Expand **Preview recipe** to inspect ingredients, instructions, component names, yield, storage, and notes without restoring or changing the file. Notes are shown as escaped Markdown source, not executable HTML. Files with invalid frontmatter show their original raw source instead of breaking the list.

Click **Restore** to move a recipe back to `src/content/recipes/`. Its original review flag is retained.

The trash page is **dev-only** and returns 404 in production.

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

- **Editorial server actions** (`discardRecipe`, `restoreRecipe`, `removeNeedsReview`, `markNeedsReview`) reject requests outside of dev mode
- **The `/dev/trash` page** returns 404 in production
- **No permanent deletion**: Discard moves files to `.trash/`, it does not delete them
- **No accidental overwrites**: Restore fails if a recipe with the same slug already exists in `src/content/recipes/`

---

## Troubleshooting

| Issue | Solution |
|-------|----------|
| "I approved a recipe but it still shows yellow" | Restart `bun run dev` or wait a moment for Astro's content HMR to reload |
| "A discarded recipe is still in the list" | Refresh the page. Content collections sometimes need a manual reload in dev |
| "Can I see discarded recipes in production?" | No. The `.trash/` directory is local-only and gitignored |
| "I discarded a recipe by mistake" | Go to `/dev/trash` and click **Restore** |
| "The Approve/Discard buttons don't appear" | Make sure you are running `bun run dev`, not a production deployment |
| "The trash page returns 404" | The trash page only works during `bun run dev`, not in production |

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

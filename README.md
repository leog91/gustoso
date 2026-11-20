# Gustoso

[![Netlify Status](https://api.netlify.com/api/v1/badges/3450f4e4-7208-44c8-9175-2bde6ac5d65e/deploy-status)](https://app.netlify.com/projects/gustoso-app/deploys)

A deployed recipe application built with Astro and TypeScript. Gustoso treats recipe files as the source of truth: structured Markdown provides a lightweight, reviewable alternative to a database for a curated collection of recipes.

## Highlights

- Server-rendered Astro application deployed with the Netlify adapter.
- Schema-validated Markdown recipe collection, defined with Zod and Astro Content Collections.
- Dynamic recipe routes generated from content files.
- Fuse.js fuzzy search exposed through an Astro server action.
- Tailwind CSS styling for responsive list, search, and recipe-detail views.
- Development-only editorial workflow to approve, discard, and restore recipes during content review.

## Architecture

Recipes live in [`src/content/recipes`](src/content/recipes) as Markdown files with YAML frontmatter. The content collection schema validates shared recipe metadata and supports both simple recipes and recipes with multiple components, ingredients, and instruction steps.

This content-driven design keeps the recipe catalog in version control, makes individual entries easy to review and edit, and avoids the operational overhead of a conventional database for a small, curated dataset.

Search uses Fuse.js to match recipe titles and slugs. The browser calls Astro's typed `search` server action, which returns ranked matching recipes without exposing a separate API endpoint.

## Local Development

Run these commands from the project root:

```bash
bun install
bun run dev
```

Other available commands:

- `bun run build` validates content and creates the production build.
- Astro preview is not supported by the Netlify adapter; use a Netlify deploy preview to inspect the production runtime.

## Add a Recipe

1. Duplicate [`src/content/recipes/_recipe-template.md`](src/content/recipes/_recipe-template.md).
2. Rename it with a kebab-case slug, such as `rosca-de-pascua-v2.md`.
3. Complete the frontmatter and recipe parts.
4. Run `bun run build` to validate the file against the content schema.

Minimal example:

```md
---
title: Energy balls
published: true
type: Snack
serves: Serves 4
parts:
  - ingredients:
      - dates
      - oatmeal
    instructions:
      - step: 1
        description: Mix everything
---
```

Supported top-level fields include `title`, `published`, `type`, `serves`, `description`, `img`, `storage`, `ingredients`, `instructions`, and `parts`. Each part can have a `name`, `ingredients`, `instructions`, and `storage`.

### Optimize a recipe photo

With `bun run dev` running, open [Optimize Photo](http://localhost:4321/dev/photos). Choose or drop a photo to compare it with the optimized JPEG. The default is quality 75 with a 1200 px maximum edge, no upscaling, and metadata removed. Adjust quality if needed, then use **Save project backup** or **Download JPEG**.

**Save project backup** writes `src/assets/recipe-img/<recipe-slug>.jpg` without replacing an existing JPEG. Recipe pages still use `img` and never serve the backup.

To enable uploads, create an [ImageKit private API key](https://imagekit.io/docs/api-keys) with media read/write access. Add `IMAGEKIT_PRIVATE_KEY=your_private_key` to the gitignored `.env` in the project root and restart `bun run dev`. Keep the key out of Git and don't add it to Netlify; it is only used on the dev server.

In the **Photo library**, click a thumbnail to open the saved JPEG or choose **Upload to ImageKit**. Each upload creates a separate public file in `/gustoso/recipes`. Choose **Use this photo** to set `img` in the recipe or its active draft. **Remove image link** clears `img` without deleting the backup or the hosted photo. Neither action changes the review status. Uploaded URLs are remembered in the current browser until you apply them.

In dev mode, if an Imgur or ImageKit image fails to load, the recipe shows a reminder with the backup path and an upload link, if a backup exists.

For importing recipes from PDFs, see [`docs/ADDING_RECIPES_FROM_PDF.md`](docs/ADDING_RECIPES_FROM_PDF.md).

### Local-only PDF import

Run `bun run dev` and open [localhost:4321/dev/import](http://localhost:4321/dev/import) (also linked as **Import Recipes** on the homepage). Put PDFs in `temp/`, choose pages, trim the extracted text to the recipe you want, and create a local draft. Edit its recipe Markdown, validate and preview it alongside the original PDF, then explicitly approve it.

PDFs and draft records stay in gitignored `temp/`; only approval creates a file in `src/content/recipes/`. Skipped drafts can be restored. Extraction is local text extraction, not automatic recipe conversion or OCR. No recipe is added automatically. See the [local import walkthrough](docs/ADDING_RECIPES_FROM_PDF.md#local-interactive-workflow-recommended).

## Editorial Review Workflow

Open **`/dev/review`** (the **Review Queue** link on the dev homepage) to find all collection recipes marked for review, local PDF drafts awaiting approval, and links to approved imports.

Recipes that need verification can be marked with `needsReview: true`. They remain visible only in development, where editorial controls allow reviewers to:

- Approve a recipe by removing its review flag.
- Discard it by moving its Markdown file to the local `.trash/` directory.
- Restore discarded files from `/dev/trash`.

The related Astro server actions reject requests outside development mode, and review-marked recipes are excluded from production lists and routes. See [`docs/REVIEW_WORKFLOW.md`](docs/REVIEW_WORKFLOW.md) for the complete workflow and safeguards.

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

For importing recipes from PDFs, see [`docs/ADDING_RECIPES_FROM_PDF.md`](docs/ADDING_RECIPES_FROM_PDF.md).

## Editorial Review Workflow

Recipes that need verification can be marked with `needsReview: true`. They remain visible only in development, where editorial controls allow reviewers to:

- Approve a recipe by removing its review flag.
- Discard it by moving its Markdown file to the local `.trash/` directory.
- Restore discarded files from `/dev/trash`.

The related Astro server actions reject requests outside development mode, and review-marked recipes are excluded from production lists and routes. See [`docs/REVIEW_WORKFLOW.md`](docs/REVIEW_WORKFLOW.md) for the complete workflow and safeguards.

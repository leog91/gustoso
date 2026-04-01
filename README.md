# Gustoso

[![Netlify Status](https://api.netlify.com/api/v1/badges/3450f4e4-7208-44c8-9175-2bde6ac5d65e/deploy-status)](https://app.netlify.com/projects/gustoso-app/deploys)

Recipe site built with Astro and Netlify.

## Commands

Run these from the project root:

- `npm install`
- `npm run dev`
- `npm run build`
- `npm run preview`

## Add a Recipe

Recipes live in [src/content/recipes](/home/leog/repo/gustoso/src/content/recipes).

Recommended process:

1. Duplicate [src/content/recipes/_recipe-template.md](/home/leog/repo/gustoso/src/content/recipes/_recipe-template.md).
2. Rename it with a slug such as `rosca-de-pascua-v2.md`.
3. Fill in the frontmatter fields.
4. Start the app with `npm run dev` and confirm the recipe appears on the homepage.

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

Supported fields:

- `title`
- `published`
- `type`
- `serves`
- `description`
- `img`
- `storage`
- `parts`

Each `part` can include:

- `name`
- `ingredients`
- `instructions`

Each instruction can be:

- numbered with `step`
- or unnumbered with only `description`

## Suggested Workflow

Best options for adding recipes:

- Paste recipe text directly and convert it into markdown.
- Send screenshots and convert them manually.
- Keep recipes in a note app with the same structure as the template.

For now, plain text is the fastest and most reliable option.

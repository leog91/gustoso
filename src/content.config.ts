import { defineCollection, z } from "astro:content";
import { glob } from "astro/loaders";

const recipeStep = z.object({
  step: z.number().optional(),
  description: z.string(),
}).passthrough();

const recipePart = z.object({
  name: z.string().optional(),
  ingredients: z.array(z.string()).optional(),
  instructions: z.array(recipeStep).optional(),
  storage: z.string().optional(),
}).passthrough();

const recipes = defineCollection({
  loader: glob({ pattern: "**/*.md", base: "./src/content/recipes" }),
  schema: z.object({
    title: z.string(),
    published: z.boolean().optional(),
    img: z.string().optional(),
    type: z.string().optional(),
    author: z.string().optional(),
    serves: z.string().optional(),
    storage: z.string().optional(),
    description: z.string().optional(),
    parts: z.array(recipePart).optional(),
    ingredients: z.array(z.string()).optional(),
    instructions: z.array(recipeStep).optional(),
  }).passthrough(),
});

export const collections = {
  recipes,
};

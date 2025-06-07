import { defineCollection, z } from 'astro:content';

const recipes = defineCollection({
    schema: z.object({
        title: z.string(),
        slug: z.string(),
        ingredients: z.array(z.string()),
    }),
});

export const collections = {
    recipes,
};
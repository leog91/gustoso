import Fuse from 'fuse.js'
import { defineAction } from 'astro:actions';
import { z } from 'astro:schema';

export const server = {
    // search: defineAction({
    //     accept: 'form',
    //     input: z.object({
    //         search: z.string(),
    //     }),
    //     handler: async ({ search }) => { /* ... */ },
    // }),
    search: defineAction({
        accept: 'form',
        input: z.object({
            search: z.string(),
        }),
        handler: async ({ search }) => {

            // const recipes = await Astro.glob("../content/recipes/*.md");

            const recipes = Object.values(import.meta.glob('../content/recipes/*.md', { eager: true }))
                .map((r) => {
                    const recipe = r as { file: string; frontmatter: { title: string; published: boolean } };
                    return {
                        // recipe: mod.frontmatter,
                        url: recipe.file.split("/").pop()?.replace(".md", ""),
                        title: recipe.frontmatter.title,
                        published: recipe.frontmatter.published,
                    };
                })
                .filter((r) => r.published !== false)

            const fuseOptions = {

                keys: [
                    "url",
                    "title"
                ]
            };

            const fuse = new Fuse(recipes, fuseOptions);

            return fuse.search(search)
        }
    })
}
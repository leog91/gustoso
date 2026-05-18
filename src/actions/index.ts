import Fuse from 'fuse.js'
import { defineAction } from 'astro:actions';
import { z } from 'astro:schema';
import fs from 'fs';
import path from 'path';
const recipesDir = path.resolve(process.cwd(), 'src/content/recipes');
const trashDir = path.resolve(process.cwd(), '.trash');

function ensureTrashDir() {
    if (!fs.existsSync(trashDir)) {
        fs.mkdirSync(trashDir, { recursive: true });
    }
}

function guardDev() {
    if (!import.meta.env.DEV) {
        throw new Error('Dev only');
    }
}

export const server = {
    search: defineAction({
        accept: 'form',
        input: z.object({
            search: z.string(),
        }),
        handler: async ({ search }) => {
            const recipes = Object.values(import.meta.glob('../content/recipes/*.md', { eager: true }))
                .map((r) => {
                    const recipe = r as { file: string; frontmatter: { title: string; published: boolean } };
                    return {
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
    }),

    discardRecipe: defineAction({
        accept: 'json',
        input: z.object({ slug: z.string() }),
        handler: async ({ slug }) => {
            guardDev();
            ensureTrashDir();
            const src = path.join(recipesDir, `${slug}.md`);
            const dest = path.join(trashDir, `${slug}.md`);
            if (!fs.existsSync(src)) {
                throw new Error(`Recipe not found: ${slug}`);
            }
            if (fs.existsSync(dest)) {
                throw new Error(`Already in trash: ${slug}`);
            }
            fs.renameSync(src, dest);
            return { success: true, slug };
        },
    }),

    restoreRecipe: defineAction({
        accept: 'json',
        input: z.object({ slug: z.string() }),
        handler: async ({ slug }) => {
            guardDev();
            const src = path.join(trashDir, `${slug}.md`);
            const dest = path.join(recipesDir, `${slug}.md`);
            if (!fs.existsSync(src)) {
                throw new Error(`Not in trash: ${slug}`);
            }
            if (fs.existsSync(dest)) {
                throw new Error(`Recipe already exists: ${slug}`);
            }
            fs.renameSync(src, dest);
            return { success: true, slug };
        },
    }),

    removeNeedsReview: defineAction({
        accept: 'json',
        input: z.object({ slug: z.string() }),
        handler: async ({ slug }) => {
            guardDev();
            const filePath = path.join(recipesDir, `${slug}.md`);
            if (!fs.existsSync(filePath)) {
                throw new Error(`Recipe not found: ${slug}`);
            }
            let content = fs.readFileSync(filePath, 'utf-8');
            content = content.replace(/^[ \t]*needsReview:[ \t]*true[ \t]*(\r?\n)?/gm, '');
            fs.writeFileSync(filePath, content, 'utf-8');
            return { success: true, slug };
        },
    }),
}

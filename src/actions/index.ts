import Fuse from 'fuse.js'
import { defineAction } from 'astro:actions';
import { z } from 'astro:schema';
import { getCollection } from 'astro:content';
import fs from 'fs';
import path from 'path';
import { markNeedsReview } from '../lib/recipe-review';
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
            const recipes = (await getCollection('recipes'))
                .filter((recipe) => recipe.data.published !== false)
                .filter((recipe) => import.meta.env.DEV || !recipe.data.needsReview)
                .map((recipe) => ({
                    url: recipe.id,
                    title: recipe.data.title,
                    published: recipe.data.published,
                }));

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

    markNeedsReview: defineAction({
        accept: 'json',
        input: z.object({ slug: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/).max(120) }),
        handler: async ({ slug }) => {
            guardDev();
            const filePath = path.join(recipesDir, `${slug}.md`);
            const stat = fs.lstatSync(filePath);
            if (!stat.isFile() || stat.isSymbolicLink()) {
                throw new Error('Recipe must be a regular Markdown file.');
            }
            const content = fs.readFileSync(filePath, 'utf-8');
            fs.writeFileSync(filePath, markNeedsReview(content), 'utf-8');
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

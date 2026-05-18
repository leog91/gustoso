export interface RecipeStep {
  step?: number;
  description: string;
}

export interface RecipePart {
  name?: string;
  ingredients?: string[];
  instructions?: RecipeStep[];
}

export interface Recipe {
  id: string;
  data: {
    title: string;
    img?: string;
    type?: string;
    author?: string;
    serves?: string;
    storage?: string;
    description?: string;
    parts: RecipePart[];
  };
}

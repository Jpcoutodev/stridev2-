// OpenAI Client Configuration
// Calls serverless API endpoints on Vercel to avoid CORS issues

// Analyze food from image and/or text description
export async function analyzeFood(imageBase64?: string, mimeType?: string, textDescription?: string): Promise<{ foodName: string; calories: number }> {
    const response = await fetch('/api/analyze-food', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ imageBase64, mimeType, textDescription }),
    });

    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to analyze food');
    }

    return response.json();
}

// Generate a fitness recipe based on ingredients
export async function generateRecipeAI(ingredients: string[]): Promise<{
    title: string;
    calories: number;
    time: string;
    description: string;
    ingredients: string[];
    instructions: string[];
}> {
    const response = await fetch('/api/generate-recipe', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ ingredients }),
    });

    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to generate recipe');
    }

    return response.json();
}

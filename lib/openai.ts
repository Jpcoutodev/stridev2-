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

// Check content moderation (Text + Image)
export async function moderateContent(text?: string, imageFile?: File, userId?: string): Promise<{ flagged: boolean; categories: Record<string, boolean> }> {
    let imageBase64: string | undefined;

    if (imageFile) {
        imageBase64 = await new Promise((resolve) => {
            const reader = new FileReader();
            reader.onloadend = () => {
                const base64String = reader.result as string;
                // Remove data URL prefix (e.g., "data:image/jpeg;base64,")
                resolve(base64String.split(',')[1]);
            };
            reader.readAsDataURL(imageFile);
        });
    }

    const response = await fetch('/api/moderate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, imageBase64, userId }),
    });

    if (!response.ok) {
        // If API fails, we might default to blocking or allowing depending on risk policy.
        // For safety, let's treat API failure as a potential risk or just throw.
        throw new Error('Moderation check failed');
    }

    return response.json();
}

// Analyze a post after creation (background AI flagging)
export async function analyzePost(postId: string, text?: string, imageFile?: File): Promise<void> {
    let imageBase64: string | undefined;

    if (imageFile) {
        imageBase64 = await new Promise((resolve) => {
            const reader = new FileReader();
            reader.onloadend = () => {
                const base64String = reader.result as string;
                resolve(base64String.split(',')[1]);
            };
            reader.readAsDataURL(imageFile);
        });
    }

    // Fire and forget - don't block the user
    fetch('/api/analyze-post', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ postId, text, imageBase64 }),
    }).catch(err => console.error('Background analyze failed:', err));
}

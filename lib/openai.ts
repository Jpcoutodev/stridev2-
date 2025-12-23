// OpenAI Client Configuration
// Uses fetch API to call OpenAI directly (no SDK needed)

const OPENAI_API_KEY = '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';

interface ChatMessage {
    role: 'system' | 'user' | 'assistant';
    content: string | Array<{ type: string; text?: string; image_url?: { url: string } }>;
}

interface OpenAIResponse {
    choices: Array<{
        message: {
            content: string;
        };
    }>;
}

export async function callOpenAI(
    messages: ChatMessage[],
    options?: {
        model?: string;
        temperature?: number;
        max_tokens?: number;
        response_format?: { type: string };
    }
): Promise<string> {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${OPENAI_API_KEY}`,
        },
        body: JSON.stringify({
            model: options?.model || 'gpt-4o-mini',
            messages,
            temperature: options?.temperature ?? 0.7,
            max_tokens: options?.max_tokens ?? 1000,
            response_format: options?.response_format,
        }),
    });

    if (!response.ok) {
        const error = await response.text();
        throw new Error(`OpenAI API error: ${error}`);
    }

    const data: OpenAIResponse = await response.json();
    return data.choices[0]?.message?.content || '';
}

// Analyze food image and return name + calories
export async function analyzeFood(imageBase64: string, mimeType: string): Promise<{ foodName: string; calories: number }> {
    const messages: ChatMessage[] = [
        {
            role: 'system',
            content: 'Você é um nutricionista especialista. Analise imagens de alimentos e retorne APENAS um JSON válido com os campos "foodName" (nome curto do alimento) e "calories" (estimativa de calorias). Sem texto adicional, apenas o JSON.'
        },
        {
            role: 'user',
            content: [
                {
                    type: 'image_url',
                    image_url: {
                        url: `data:${mimeType};base64,${imageBase64}`
                    }
                },
                {
                    type: 'text',
                    text: 'Identifique o alimento nesta imagem e estime as calorias totais aproximadas. Retorne apenas o JSON no formato: {"foodName": "...", "calories": 123}'
                }
            ]
        }
    ];

    const result = await callOpenAI(messages, {
        model: 'gpt-4o-mini',
        temperature: 0.3,
        response_format: { type: 'json_object' }
    });

    return JSON.parse(result);
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
    const messages: ChatMessage[] = [
        {
            role: 'system',
            content: 'Você é um chef especializado em receitas fitness e saudáveis. Crie receitas criativas usando os ingredientes fornecidos. Retorne APENAS um JSON válido com os campos: "title", "calories" (número), "time", "description", "ingredients" (array de strings), "instructions" (array de strings). Sem texto adicional, apenas o JSON. Responda em português.'
        },
        {
            role: 'user',
            content: `Crie uma receita FITNESS e SAUDÁVEL usando principalmente estes ingredientes: ${ingredients.join(', ')}. 
      Você pode adicionar temperos básicos ou ingredientes muito comuns (como água, sal, azeite) se necessário, mas foque no que o usuário tem.
      Seja criativo. Retorne o JSON.`
        }
    ];

    const result = await callOpenAI(messages, {
        model: 'gpt-4o-mini',
        temperature: 0.7,
        response_format: { type: 'json_object' }
    });

    return JSON.parse(result);
}

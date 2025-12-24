// Vercel Serverless Function: Generate Recipe with OpenAI
// POST /api/generate-recipe

export const config = {
    runtime: 'edge',
};

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

export default async function handler(request: Request) {
    if (request.method !== 'POST') {
        return new Response(JSON.stringify({ error: 'Method not allowed' }), {
            status: 405,
            headers: { 'Content-Type': 'application/json' },
        });
    }

    try {
        const { ingredients } = await request.json();

        if (!ingredients || !Array.isArray(ingredients) || ingredients.length === 0) {
            return new Response(JSON.stringify({ error: 'Missing or invalid ingredients array' }), {
                status: 400,
                headers: { 'Content-Type': 'application/json' },
            });
        }

        const response = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${OPENAI_API_KEY}`,
            },
            body: JSON.stringify({
                model: 'gpt-4o-mini',
                messages: [
                    {
                        role: 'system',
                        content: 'Você é um chef especializado em receitas fitness e saudáveis. Crie 3 opções de receitas criativas usando os ingredientes fornecidos. Retorne APENAS um JSON válido com o campo "recipes" que é um array de 3 objetos, cada um contendo: "title", "calories" (número), "time", "description", "ingredients" (array de strings), "instructions" (array de strings). Sem texto adicional, apenas o JSON. Responda em português.'
                    },
                    {
                        role: 'user',
                        content: `Crie 3 opções de receitas FITNESS e SAUDÁVEIS usando principalmente estes ingredientes: ${ingredients.join(', ')}. 
            Você pode adicionar temperos básicos ou ingredientes muito comuns (como água, sal, azeite) se necessário, mas foque no que o usuário tem.
            Dê opções variadas (ex: uma mais rápida, uma mais elaborada). Retorne o JSON.`
                    }
                ],
                temperature: 0.7,
                max_tokens: 1000,
                response_format: { type: 'json_object' }
            }),
        });

        if (!response.ok) {
            const error = await response.text();
            return new Response(JSON.stringify({ error: `OpenAI API error: ${error}` }), {
                status: 500,
                headers: { 'Content-Type': 'application/json' },
            });
        }

        const data = await response.json();
        const parsedContext = JSON.parse(data.choices[0]?.message?.content || '{}');
        const result = parsedContext.recipes || [parsedContext]; // Fallback if AI returns single object

        return new Response(JSON.stringify(result), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
        });

    } catch (error: any) {
        return new Response(JSON.stringify({ error: error.message }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' },
        });
    }
}

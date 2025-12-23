// Vercel Serverless Function: Generate Recipe with OpenAI
// POST /api/generate-recipe

export const config = {
    runtime: 'edge',
};

const OPENAI_API_KEY = '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';

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
                        content: 'Você é um chef especializado em receitas fitness e saudáveis. Crie receitas criativas usando os ingredientes fornecidos. Retorne APENAS um JSON válido com os campos: "title", "calories" (número), "time", "description", "ingredients" (array de strings), "instructions" (array de strings). Sem texto adicional, apenas o JSON. Responda em português.'
                    },
                    {
                        role: 'user',
                        content: `Crie uma receita FITNESS e SAUDÁVEL usando principalmente estes ingredientes: ${ingredients.join(', ')}. 
            Você pode adicionar temperos básicos ou ingredientes muito comuns (como água, sal, azeite) se necessário, mas foque no que o usuário tem.
            Seja criativo. Retorne o JSON.`
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
        const result = JSON.parse(data.choices[0]?.message?.content || '{}');

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

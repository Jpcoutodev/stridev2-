// Vercel Serverless Function: Analyze Food with OpenAI
// POST /api/analyze-food

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
        const { imageBase64, mimeType } = await request.json();

        if (!imageBase64 || !mimeType) {
            return new Response(JSON.stringify({ error: 'Missing imageBase64 or mimeType' }), {
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
                ],
                temperature: 0.3,
                max_tokens: 500,
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

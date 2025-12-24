// Vercel Serverless Function: Analyze Food with OpenAI
// POST /api/analyze-food

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
        const { imageBase64, mimeType, textDescription } = await request.json();

        // Support either image OR text description
        if (!imageBase64 && !textDescription) {
            return new Response(JSON.stringify({ error: 'Missing imageBase64 or textDescription' }), {
                status: 400,
                headers: { 'Content-Type': 'application/json' },
            });
        }

        const messages: any[] = [
            {
                role: 'system',
                content: 'Você é um nutricionista especialista. Analise alimentos (por imagem ou descrição textual) e retorne APENAS um JSON válido com os campos "foodName" (nome descritivo do alimento) e "calories" (estimativa de calorias totais). Sem texto adicional, apenas o JSON.'
            }
        ];

        // Build user message based on input type
        if (imageBase64 && mimeType) {
            // Image analysis
            messages.push({
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
                        text: textDescription
                            ? `Identifique o alimento nesta imagem: "${textDescription}". Estime as calorias totais aproximadas. Retorne apenas o JSON no formato: {"foodName": "...", "calories": 123}`
                            : 'Identifique o alimento nesta imagem e estime as calorias totais aproximadas. Retorne apenas o JSON no formato: {"foodName": "...", "calories": 123}'
                    }
                ]
            });
        } else if (textDescription) {
            // Text-only analysis
            messages.push({
                role: 'user',
                content: `Analise este alimento: "${textDescription}". Estime as calorias totais aproximadas considerando a quantidade mencionada (se houver). Retorne apenas o JSON no formato: {"foodName": "...", "calories": 123}`
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
                messages,
                temperature: 0.3,
                max_tokens: 300,
                ...(imageBase64 && mimeType ? { response_format: { type: 'json_object' } } : {})
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

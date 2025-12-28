import { createClient } from '@supabase/supabase-js';

export const config = {
    runtime: 'edge',
};

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY;

export default async function handler(request: Request) {
    if (request.method !== 'POST') {
        return new Response(JSON.stringify({ error: 'Method not allowed' }), {
            status: 405,
            headers: { 'Content-Type': 'application/json' },
        });
    }

    try {
        const { text, imageBase64, userId } = await request.json();

        if (!text && !imageBase64) {
            return new Response(JSON.stringify({ error: 'Missing content to moderate' }), {
                status: 400,
                headers: { 'Content-Type': 'application/json' },
            });
        }

        // Prepare input for OpenAI Omni Moderation
        const inputs: any[] = [];
        if (text) inputs.push({ type: 'text', text });
        if (imageBase64) {
            inputs.push({
                type: 'image_url',
                image_url: { url: `data:image/jpeg;base64,${imageBase64}` }
            });
        }

        const response = await fetch('https://api.openai.com/v1/moderations', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${OPENAI_API_KEY}`,
            },
            body: JSON.stringify({
                model: 'omni-moderation-latest',
                input: inputs,
            }),
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`OpenAI API error: ${errorText}`);
        }

        const data = await response.json();
        const result = data.results[0];

        // LOGGING TO SUPABASE IF FLAGGED
        if (result.flagged) {
            try {
                if (SUPABASE_URL && SUPABASE_ANON_KEY) {
                    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

                    // Filter categories to only true ones
                    const triggeredCategories = Object.entries(result.categories)
                        .filter(([_, value]) => value === true)
                        .map(([key]) => key);

                    await supabase.from('moderation_logs').insert({
                        user_id: userId || null, // Can be null if anon
                        content_type: imageBase64 ? 'image' : 'text',
                        flagged_categories: triggeredCategories,
                        content_snippet: text ? text.substring(0, 200) : '[IMAGE CONTENT]',
                        created_at: new Date().toISOString()
                    });
                }
            } catch (logError) {
                console.error("Failed to log moderation event:", logError);
                // Don't fail the request just because logging failed
            }
        }

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

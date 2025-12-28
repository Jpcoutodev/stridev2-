import { createClient } from '@supabase/supabase-js';

export const config = {
    runtime: 'edge',
};

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

export default async function handler(request: Request) {
    if (request.method !== 'POST') {
        return new Response(JSON.stringify({ error: 'Method not allowed' }), {
            status: 405,
            headers: { 'Content-Type': 'application/json' },
        });
    }

    try {
        const { postId, text, imageBase64 } = await request.json();

        if (!postId) {
            return new Response(JSON.stringify({ error: 'Missing postId' }), {
                status: 400,
                headers: { 'Content-Type': 'application/json' },
            });
        }

        if (!text && !imageBase64) {
            // Nothing to analyze, just return success
            return new Response(JSON.stringify({ flagged: false }), {
                status: 200,
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
            console.error('OpenAI API error:', errorText);
            // Don't fail - just skip flagging
            return new Response(JSON.stringify({ flagged: false, error: 'OpenAI error' }), {
                status: 200,
                headers: { 'Content-Type': 'application/json' },
            });
        }

        const data = await response.json();
        const result = data.results[0];

        // If flagged, insert into ai_flags table
        if (result.flagged && SUPABASE_URL && SUPABASE_SERVICE_KEY) {
            try {
                const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

                const triggeredCategories = Object.entries(result.categories)
                    .filter(([_, value]) => value === true)
                    .map(([key]) => key);

                await supabase.from('ai_flags').insert({
                    post_id: postId,
                    flagged_categories: triggeredCategories
                });
            } catch (logError) {
                console.error("Failed to save AI flag:", logError);
            }
        }

        return new Response(JSON.stringify({ flagged: result.flagged }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
        });

    } catch (error: any) {
        console.error('Analyze error:', error);
        return new Response(JSON.stringify({ flagged: false, error: error.message }), {
            status: 200, // Don't fail the post
            headers: { 'Content-Type': 'application/json' },
        });
    }
}

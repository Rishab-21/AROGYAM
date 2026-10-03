import { defineConfig, loadEnv, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath, URL } from 'node:url';
import type { IncomingMessage, ServerResponse } from 'node:http';

function createAiMiddleware(apiKey: string) {
  return async (req: IncomingMessage, res: ServerResponse) => {
    if (req.method === 'OPTIONS') {
      res.writeHead(200, {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      });
      res.end();
      return;
    }

    if (req.method !== 'POST') {
      res.writeHead(405, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Method not allowed' }));
      return;
    }

    let raw = '';
    req.on('data', (chunk) => {
      raw += chunk;
    });

    req.on('end', async () => {
      try {
        const body = JSON.parse(raw || '{}');
        const message = typeof body.message === 'string' ? body.message.trim().slice(0, 1000) : '';
        const language = body.language === 'hi' ? 'Hindi' : 'English';
        if (!message) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ reply: 'Please ask a short health question.' }));
          return;
        }

        const profile = body.profile ?? {};
        const health = body.health ?? {};
        const context = JSON.stringify({
          age: profile.age ?? 'not provided',
          gender: profile.gender ?? 'not provided',
          height: profile.height ?? 'not provided',
          weight: profile.weight ?? 'not provided',
          conditions: profile.conditions ?? [],
          foodPreference: profile.food ?? 'not provided',
          heartRate: health.heartRate ?? 0,
          bloodPressure: health.bloodPressure ?? '0/0',
          temperature: health.temperature ?? 0,
          stepsToday: health.stepsToday ?? 0,
          waterToday: health.waterToday ?? 0,
        });

        const key = apiKey.trim();
        if (!key) {
          const fallback = language === 'Hindi'
            ? 'पानी पीते रहें और अपनी दवाइयां समय पर लें; चिंता हो तो डॉक्टर से बात करें।'
            : 'Keep sipping water and take your medicines on time; speak with your doctor if you are worried.';
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ reply: fallback, demo: true }));
          return;
        }

        const prompt = `You are Arogyam, a warm health companion. Reply in ${language}. Use the user's details only to make the answer relevant. Give exactly one short, sweet sentence in plain language, under 25 words. Do not diagnose, prescribe, or invent readings. If the user asks about an emergency or dangerous reading, tell them to contact a doctor or emergency service. User details: ${context}. Question: ${message}`;
        const candidateModels = ['gemini-flash-latest', 'gemini-3.7-flash', 'gemini-3.8-flash'];
        let reply = '';

        for (const model of candidateModels) {
          try {
            const geminiRes = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json', 'x-goog-api-key': key },
              body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }], generationConfig: { temperature: 0.2, maxOutputTokens: 1000 } }),
            });
            if (geminiRes.ok) {
              const data = await geminiRes.json() as { candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }> };
              const candidateText = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
              if (candidateText) {
                reply = candidateText;
                break;
              }
            }
          } catch (err) {
            console.error(`Local dev Gemini fetch failed for ${model}:`, err instanceof Error ? err.message : 'error');
          }
        }

        if (!reply) {
          const fallback = language === 'Hindi'
            ? 'पानी पीते रहें और अपनी दवाइयां समय पर लें; चिंता हो तो डॉक्टर से बात करें।'
            : 'Keep sipping water and take your medicines on time; speak with your doctor if you are worried.';
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ reply: fallback, demo: true }));
          return;
        }

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ reply, demo: false }));
      } catch {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ reply: 'The AI service is unavailable right now; please try again shortly.' }));
      }
    });
  };
}

function aiAssistantPlugin(apiKey: string): Plugin {
  const handler = createAiMiddleware(apiKey);
  return {
    name: 'ai-assistant-middleware',
    configureServer(server) {
      server.middlewares.use('/functions/v1/ai-assistant', handler);
    },
    configurePreviewServer(server) {
      server.middlewares.use('/functions/v1/ai-assistant', handler);
    },
  };
}

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const geminiApiKey = env.GEMINI_API_KEY || process.env.GEMINI_API_KEY || '';

  return {
    plugins: [react(), aiAssistantPlugin(geminiApiKey)],
    resolve: {
      alias: {
        '@': fileURLToPath(new URL('./src', import.meta.url)),
      },
    },
    optimizeDeps: {
      exclude: ['lucide-react'],
    },
  };
});

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

type RequestBody = {
  message?: unknown;
  language?: unknown;
  profile?: {
    age?: unknown;
    gender?: unknown;
    height?: unknown;
    weight?: unknown;
    conditions?: unknown;
    food?: unknown;
  };
  health?: {
    heartRate?: unknown;
    bloodPressure?: unknown;
    temperature?: unknown;
    stepsToday?: unknown;
    waterToday?: unknown;
  };
};

const jsonResponse = (body: Record<string, unknown>, status = 200) => new Response(JSON.stringify(body), {
  status,
  headers: { ...corsHeaders, "Content-Type": "application/json" },
});

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 200, headers: corsHeaders });

  try {
    const body = await req.json() as RequestBody;
    const message = typeof body.message === "string" ? body.message.trim().slice(0, 1000) : "";
    const language = body.language === "hi" ? "Hindi" : "English";
    if (!message) return jsonResponse({ reply: "Please ask a short health question." }, 400);

    const profile = body.profile ?? {};
    const health = body.health ?? {};
    const context = JSON.stringify({
      age: profile.age ?? "not provided",
      gender: profile.gender ?? "not provided",
      height: profile.height ?? "not provided",
      weight: profile.weight ?? "not provided",
      conditions: profile.conditions ?? [],
      foodPreference: profile.food ?? "not provided",
      heartRate: health.heartRate ?? 0,
      bloodPressure: health.bloodPressure ?? "0/0",
      temperature: health.temperature ?? 0,
      stepsToday: health.stepsToday ?? 0,
      waterToday: health.waterToday ?? 0,
    });
    const apiKey = (Deno.env.get("GEMINI_API_KEY") || Deno.env.get("VITE_GEMINI_API_KEY"))?.trim();

    if (!apiKey) {
      const fallback = language === "Hindi"
        ? "पानी पीते रहें और अपनी दवाइयां समय पर लें; चिंता हो तो डॉक्टर से बात करें।"
        : "Keep sipping water and take your medicines on time; speak with your doctor if you are worried.";
      return jsonResponse({ reply: fallback, demo: true });
    }

    const prompt = `You are Arogyam, a warm health companion. Reply in ${language}. Use the user's details only to make the answer relevant. Give exactly one short, sweet sentence in plain language, under 25 words. Do not diagnose, prescribe, or invent readings. If the user asks about an emergency or dangerous reading, tell them to contact a doctor or emergency service. User details: ${context}. Question: ${message}`;
    const candidateModels = [
      "gemini-flash-lite-latest",
      "gemini-3.1-flash-lite",
      "gemini-3.5-flash-lite",
      "gemini-3.5-flash",
      "gemini-3.8-flash",
      "gemini-3.7-flash",
      "gemini-flash-latest",
    ];
    let reply = "";

    for (const model of candidateModels) {
      try {
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
          method: "POST",
          headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey },
          body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }], generationConfig: { temperature: 0.2, maxOutputTokens: 1000 } }),
        });
        if (response.ok) {
          const data = await response.json() as { candidates?: Array<{ content?: { parts?: Array<{ text?: string; thought?: boolean }> } }> };
          const parts = data.candidates?.[0]?.content?.parts ?? [];
          const textPart = parts.find((p) => p.text && !p.thought)?.text || parts[0]?.text;
          const candidateText = textPart?.trim();
          if (candidateText) {
            reply = candidateText;
            break;
          }
        } else {
          const providerError = await response.text();
          console.error(`Gemini model ${model} failed`, response.status, providerError.slice(0, 300));
        }
      } catch (err) {
        console.error(`Gemini fetch error for ${model}`, err instanceof Error ? err.message : "network error");
      }
    }

    if (!reply) {
      const fallback = language === "Hindi"
        ? "पानी पीते रहें और अपनी दवाइयां समय पर लें; चिंता हो तो डॉक्टर से बात करें।"
        : "Keep sipping water and take your medicines on time; speak with your doctor if you are worried.";
      return jsonResponse({ reply: fallback, demo: true });
    }
    return jsonResponse({ reply, demo: false });
  } catch (error) {
    console.error("AI assistant failed", error instanceof Error ? error.message : "unknown error");
    return jsonResponse({ reply: "The AI service is unavailable right now; please try again shortly." }, 500);
  }
});

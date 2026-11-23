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
    // Keep Gemini credentials in Supabase Function secrets, never in the app bundle.
    // GEMINI_API_KEYS accepts comma- or newline-separated backup keys; the singular
    // variable remains supported for existing deployments.
    const apiKeys = [
      ...(Deno.env.get("GEMINI_API_KEYS") ?? "").split(/[\s,]+/),
      Deno.env.get("GEMINI_API_KEY") ?? "",
    ].map((key) => key.trim()).filter(Boolean);

    if (apiKeys.length === 0) {
      return jsonResponse({ error: "AI_NOT_CONFIGURED" }, 503);
    }

    const prompt = `You are Arogyam, a warm health companion. Reply in ${language}. Use the user's details only to make the answer relevant. Give exactly one short, sweet sentence in plain language, under 25 words. Do not diagnose, prescribe, or invent readings. If the user asks about an emergency or dangerous reading, tell them to contact a doctor or emergency service. User details: ${context}. Question: ${message}`;
    const candidateModels = ["gemini-3.8-flash", "gemini-3.7-flash", "gemini-3.5-flash-lite"];
    let reply = "";
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 17_000);

    try {
      // Try each key against the available models, so quota or key failures can
      // fall through to another configured credential without exposing details.
      for (const apiKey of apiKeys) {
        for (const model of candidateModels) {
          if (controller.signal.aborted) break;
          try {
            const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
              method: "POST",
              headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey },
              body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }], generationConfig: { temperature: 0.2, maxOutputTokens: 1000 } }),
              signal: controller.signal,
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
              // Do not log provider response bodies: they can contain request data.
              console.error(`Gemini request failed for ${model}`, response.status);
            }
          } catch (err) {
            if (!controller.signal.aborted) {
              console.error(`Gemini fetch failed for ${model}`, err instanceof Error ? err.message : "network error");
            }
          }
        }
        if (reply || controller.signal.aborted) break;
      }
    } finally {
      clearTimeout(timeout);
    }

    if (!reply) {
      return jsonResponse({ error: "AI_PROVIDER_UNAVAILABLE" }, 502);
    }
    return jsonResponse({ reply, demo: false });
  } catch (error) {
    console.error("AI assistant failed", error instanceof Error ? error.message : "unknown error");
    return jsonResponse({ reply: "The AI service is unavailable right now; please try again shortly." }, 500);
  }
});

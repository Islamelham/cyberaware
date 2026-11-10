"use strict";
// Appel du modèle Google Gemini. La clé API reste côté serveur (variable d'environnement),
// jamais dans le navigateur, et n'est jamais placée dans l'URL (donc absente des journaux).

// Modèle modifiable dans .env (GEMINI_MODEL). Vérifier le nom actuel dans la documentation Google AI Studio.
const MODEL = process.env.GEMINI_MODEL || "gemini-2.5-flash";

function available() {
  return !!process.env.GEMINI_API_KEY;
}

async function complete({ system, user, maxTokens = 1800, timeoutMs = 45000 }) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("GEMINI_API_KEY manquante");

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(MODEL)}:generateContent`;

  const body = {
    contents: [{ role: "user", parts: [{ text: user }] }],
    generationConfig: {
      // Les modèles « raisonnement » consomment des jetons pour réfléchir : on laisse de la marge
      // pour que le JSON ne soit pas tronqué.
      maxOutputTokens: Math.max(maxTokens, 4000),
      responseMimeType: "application/json"
    }
  };
  if (system) body.systemInstruction = { parts: [{ text: system }] };

  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), timeoutMs);

  try {
    const res = await fetch(url, {
      method: "POST",
      signal: ctl.signal,
      headers: { "content-type": "application/json", "x-goog-api-key": apiKey },
      body: JSON.stringify(body)
    });

    if (!res.ok) {
      const errText = (await res.text()).slice(0, 300);
      throw new Error(`Gemini HTTP ${res.status}: ${errText}`);
    }

    const data = await res.json();
    const parts = (data.candidates && data.candidates[0] && data.candidates[0].content && data.candidates[0].content.parts) || [];
    return parts.map((p) => p.text || "").join("");
  } finally {
    clearTimeout(timer);
  }
}

function parseJSON(text) {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start < 0 || end <= start) throw new Error("JSON introuvable dans la réponse");
  return JSON.parse(text.slice(start, end + 1));
}

module.exports = { available, complete, parseJSON, MODEL };

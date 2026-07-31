/**
 * Tam-Tam Silence — Assistant IA (Netlify Function)
 * ---------------------------------------------------
 * Fait le lien en toute sécurité entre l'appli et l'API Gemini de Google.
 * La clé Gemini ne se trouve JAMAIS dans index.html ni simulations.html —
 * uniquement ici, côté serveur, dans une variable d'environnement Netlify.
 *
 * Pour configurer la clé :
 *   Netlify → ton site → Site configuration → Environment variables
 *   → Add a variable → Key: GEMINI_API_KEY → Value: (ta clé AQ....)
 *
 * Endpoint : POST https://<ton-site>.netlify.app/.netlify/functions/askAI
 * Corps attendu (JSON) : { "message": "...", "mode": "eleve" | "prof" | "exercice" }
 */

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Content-Type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Content-Type": "application/json"
};

const SYSTEM_PROMPTS = {
  eleve:
    "Tu es un assistant pédagogique pour des élèves togolais du collège et du lycée (matières : SVT, physique, chimie, mathématiques, technologie). " +
    "Réponds en français, de façon claire, simple et bienveillante, adaptée au niveau scolaire de la question. " +
    "Explique les notions étape par étape, avec des exemples concrets si possible. " +
    "Ne donne jamais directement la réponse d'un devoir sans expliquer le raisonnement : aide l'élève à comprendre, pas seulement à copier. " +
    "Reste bref et va à l'essentiel (quelques phrases ou une courte liste), sauf si on te demande explicitement plus de détails.",
  prof:
    "Tu es un assistant pour un enseignant togolais de SVT, physique, chimie, mathématiques ou technologie, au collège et au lycée. " +
    "Aide-le à préparer ses cours : reformuler une explication, proposer une progression pédagogique, suggérer des exemples locaux et concrets, " +
    "clarifier une notion scientifique, ou rédiger un court texte pour ses élèves ou parents. Réponds en français, de façon professionnelle et concise.",
  exercice:
    "Tu es un générateur d'exercices scolaires pour le collège et le lycée togolais (programme francophone). " +
    "À partir du thème demandé, génère un exercice clair avec un énoncé précis, adapté au niveau indiqué (ou niveau collège/lycée standard si non précisé), " +
    "suivi d'un corrigé détaillé étape par étape. Structure ta réponse ainsi : \n\n**Énoncé :**\n...\n\n**Corrigé :**\n... " +
    "Réponds uniquement en français."
};

exports.handler = async function (event) {
  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 204, headers: CORS_HEADERS, body: "" };
  }
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, headers: CORS_HEADERS, body: JSON.stringify({ error: "Méthode non autorisée" }) };
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return {
      statusCode: 500,
      headers: CORS_HEADERS,
      body: JSON.stringify({ error: "Clé IA non configurée côté serveur." })
    };
  }

  let payload;
  try {
    payload = JSON.parse(event.body || "{}");
  } catch (e) {
    return { statusCode: 400, headers: CORS_HEADERS, body: JSON.stringify({ error: "Requête invalide" }) };
  }

  const message = (payload.message || "").trim();
  const mode = SYSTEM_PROMPTS[payload.mode] ? payload.mode : "eleve";

  if (!message) {
    return { statusCode: 400, headers: CORS_HEADERS, body: JSON.stringify({ error: "Message vide" }) };
  }
  if (message.length > 2000) {
    return { statusCode: 400, headers: CORS_HEADERS, body: JSON.stringify({ error: "Message trop long (2000 caractères max)" }) };
  }

  try {
    const resp = await fetch(
      "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": apiKey
        },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: SYSTEM_PROMPTS[mode] }] },
          contents: [{ role: "user", parts: [{ text: message }] }],
          generationConfig: { temperature: 0.6, maxOutputTokens: 1024 }
        })
      }
    );

    const data = await resp.json();

    if (!resp.ok) {
      return {
        statusCode: 502,
        headers: CORS_HEADERS,
        body: JSON.stringify({ error: "Erreur de l'IA", detail: data.error ? data.error.message : "inconnue" })
      };
    }

    const text =
      data.candidates &&
      data.candidates[0] &&
      data.candidates[0].content &&
      data.candidates[0].content.parts &&
      data.candidates[0].content.parts[0]
        ? data.candidates[0].content.parts[0].text
        : "";

    if (!text) {
      return {
        statusCode: 502,
        headers: CORS_HEADERS,
        body: JSON.stringify({ error: "Réponse vide de l'IA (question peut-être bloquée par les filtres de sécurité)." })
      };
    }

    return { statusCode: 200, headers: CORS_HEADERS, body: JSON.stringify({ reply: text }) };
  } catch (err) {
    return {
      statusCode: 500,
      headers: CORS_HEADERS,
      body: JSON.stringify({ error: "Erreur serveur", detail: String(err) })
    };
  }
};
  

/**
 * Tam-Tam Silence — Génération de codes (Netlify Function, facultatif)
 * Protégé par une clé d'administration — n'appelle cet endpoint que
 * depuis ton générateur de codes privé, jamais depuis l'appli elle-même.
 * Endpoint : GET https://<ton-site>.netlify.app/.netlify/functions/generateLicense?adminKey=...&plan=MENSUEL&days=30
 */

const { computeSig, ADMIN_KEY, CORS_HEADERS } = require("./_shared");

exports.handler = async function (event) {
  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 204, headers: CORS_HEADERS, body: "" };
  }

  const params = event.queryStringParameters || {};

  if (params.adminKey !== ADMIN_KEY) {
    return {
      statusCode: 403,
      headers: CORS_HEADERS,
      body: JSON.stringify({ error: "Non autorisé" })
    };
  }

  const plan = (params.plan || "MENSUEL").toUpperCase();
  const days = parseInt(params.days) || 30;
  if (plan !== "MENSUEL" && plan !== "ANNUEL") {
    return {
      statusCode: 400,
      headers: CORS_HEADERS,
      body: JSON.stringify({ error: "plan doit être MENSUEL ou ANNUEL" })
    };
  }

  const expiryDate = new Date();
  expiryDate.setDate(expiryDate.getDate() + days);
  const y = expiryDate.getFullYear();
  const m = String(expiryDate.getMonth() + 1).padStart(2, "0");
  const d = String(expiryDate.getDate()).padStart(2, "0");
  const expiry = `${y}${m}${d}`;
  const sig = computeSig(plan, expiry);

  return {
    statusCode: 200,
    headers: CORS_HEADERS,
    body: JSON.stringify({ code: `${plan}-${expiry}-${sig}`, expiresOn: `${d}/${m}/${y}` })
  };
};

/**
 * Tam-Tam Silence — Logique partagée de vérification des codes d'abonnement
 * --------------------------------------------------------------------------
 * Ce fichier n'est pas une fonction en lui-même : il est importé par
 * verifyLicense.js et generateLicense.js. Le secret ne quitte jamais
 * le serveur, donc il ne peut plus être lu depuis index.html.
 */

const LICENSE_SECRET = "h961f9TG0ZvK3ppM4bxYzjwOQxxwMAhm"; // même secret que dans le générateur privé

function simpleHash(str) {
  let h = 5381;
  for (let i = 0; i < str.length; i++) {
    h = ((h * 33) ^ str.charCodeAt(i)) >>> 0;
  }
  return h;
}

function computeSig(plan, expiry) {
  return (simpleHash(plan + "|" + expiry + "|" + LICENSE_SECRET) % 1679616)
    .toString(36)
    .toUpperCase()
    .padStart(4, "0");
}

function validateCode(raw) {
  const code = (raw || "").trim().toUpperCase();
  const parts = code.split("-");
  if (parts.length !== 3) return { valid: false, reason: "format" };
  const [plan, expiry, sig] = parts;
  if (plan !== "MENSUEL" && plan !== "ANNUEL") return { valid: false, reason: "plan" };
  if (!/^\d{8}$/.test(expiry)) return { valid: false, reason: "expiry_format" };
  if (computeSig(plan, expiry) !== sig) return { valid: false, reason: "signature" };
  const y = expiry.slice(0, 4), m = expiry.slice(4, 6), d = expiry.slice(6, 8);
  const expiresAt = new Date(`${y}-${m}-${d}T23:59:59`).getTime();
  if (isNaN(expiresAt)) return { valid: false, reason: "expiry_invalid" };
  if (expiresAt < Date.now()) return { valid: false, reason: "expired" };
  return { valid: true, plan: plan.toLowerCase(), expiresAt };
}

const ADMIN_KEY = "rr20Rrf13KDZH7aNdErRD7KWmVfYXir"; // protège generateLicense

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Content-Type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Content-Type": "application/json"
};

module.exports = { computeSig, validateCode, ADMIN_KEY, CORS_HEADERS };

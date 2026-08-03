/**
 * Tam-Tam Silence — Vérification des codes d'abonnement (Netlify Function)
 * Endpoint : GET https://<ton-site>.netlify.app/.netlify/functions/verifyLicense?code=XXXX-XXXXXXXX-XXXX
 */

const { validateCode, CORS_HEADERS } = require("./_shared");

exports.handler = async function (event) {
  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 204, headers: CORS_HEADERS, body: "" };
  }

  let code;
  if (event.httpMethod === "POST") {
    try {
      const body = JSON.parse(event.body || "{}");
      code = body.code;
    } catch (e) {
      code = null;
    }
  } else {
    code = event.queryStringParameters && event.queryStringParameters.code;
  }

  if (!code) {
    return {
      statusCode: 400,
      headers: CORS_HEADERS,
      body: JSON.stringify({ valid: false, reason: "missing_code" })
    };
  }

  const result = validateCode(code);
  return {
    statusCode: 200,
    headers: CORS_HEADERS,
    body: JSON.stringify(result)
  };
};

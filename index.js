import express from "express";
import dotenv from "dotenv";
import axios from "axios";

dotenv.config();

const app = express();
const port = process.env.PORT || 10000;

// Helper to determine backend base URL (fall back to env or derive from request)
function getBackendBaseUrl(req) {
  if (process.env.BACKEND_BASE_URL) return process.env.BACKEND_BASE_URL.replace(/\/$/, "");
  const proto = req.headers["x-forwarded-proto"] || req.protocol;
  const host = req.headers["x-forwarded-host"] || req.headers.host;
  return `${proto}://${host}`.replace(/\/$/, "");
}

app.get("/", (req, res) => {
  res.send("Vyve Backend is running ✅");
});

// Start OAuth flow. Accept optional redirect_uri from the mobile app (e.g. vyve://auth)
// and pass it through by encoding it into the Strava redirect_uri query so we can forward
// the final token back to the app.
app.get("/auth/strava", (req, res) => {
  const clientId = process.env.STRAVA_CLIENT_ID;
  if (!clientId) {
    return res.status(500).send("Missing STRAVA_CLIENT_ID in env");
  }

  // The app can include its own deep link (e.g. vyve://auth) via ?redirect_uri=...
  const appRedirectUri = req.query.redirect_uri || "vyve://auth";

  // Build the callback URL Strava should call after user authorizes.
  // We include the app redirect_uri as a query param so we can forward the token later.
  const backendBase = getBackendBaseUrl(req);
  const exchangeCallback = `${backendBase}/exchange_token?redirect_uri=${encodeURIComponent(appRedirectUri)}`;

  const scope = "read,activity:read"; // adjust scopes as needed
  const approvalPrompt = "force";

  const stravaAuthUrl = `https://www.strava.com/oauth/authorize` +
    `?client_id=${encodeURIComponent(clientId)}` +
    `&response_type=code` +
    `&redirect_uri=${encodeURIComponent(exchangeCallback)}` +
    `&approval_prompt=${encodeURIComponent(approvalPrompt)}` +
    `&scope=${encodeURIComponent(scope)}`;

  res.redirect(stravaAuthUrl);
});

// Exchange the code returned by Strava for an access token, then redirect to the original app deep link.
// The app deep link is expected to be present in req.query.redirect_uri because we included it when starting auth.
app.get("/exchange_token", async (req, res) => {
  const { code, redirect_uri: appRedirectUri } = req.query;

  if (!code) {
    return res.status(400).json({ error: "Missing code in query" });
  }

  if (!process.env.STRAVA_CLIENT_ID || !process.env.STRAVA_CLIENT_SECRET) {
    return res.status(500).json({ error: "Missing Strava client credentials in env" });
  }

  try {
    const response = await axios.post("https://www.strava.com/oauth/token", {
      client_id: process.env.STRAVA_CLIENT_ID,
      client_secret: process.env.STRAVA_CLIENT_SECRET,
      code,
      grant_type: "authorization_code",
    });

    const token = response.data.access_token;

    // If the app provided a redirect_uri (e.g. vyve://auth), redirect to it with the token.
    // Fallback to a simple JSON response if no appRedirectUri is present.
    if (appRedirectUri) {
      // Be sure to encode the token and any other params you send.
      const redirectUrl = `${appRedirectUri}?token=${encodeURIComponent(token)}`;
      return res.redirect(redirectUrl);
    }

    // No app redirect provided — return token in JSON (useful for web flows)
    res.json({ token });
  } catch (err) {
    console.error("Error exchanging Strava token:", err?.response?.data || err.message || err);
    res.status(500).json({ error: "Erreur lors de l’échange de token" });
  }
});

app.listen(port, () => console.log(`🚀 Serveur lancé sur le port ${port}`));

console.log("CLIENT_ID =", process.env.STRAVA_CLIENT_ID);

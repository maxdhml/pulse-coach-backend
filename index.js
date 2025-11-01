// Dépendances
const express = require('express');
const app = express();

// Middlewares
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Route 1: Initiation OAuth
app.get('/auth/strava', async (req, res) => {
  try {
    const redirectUri = req.query.redirect_uri || 'vyve://auth';
    const stravaRedirectUri = `${req.protocol}://${req.get('host')}/auth/strava/callback`;
    
    const stravaAuthUrl = `https://www.strava.com/oauth/authorize?` +
      `client_id=${process.env.STRAVA_CLIENT_ID}` +
      `&redirect_uri=${encodeURIComponent(stravaRedirectUri)}` +
      `&response_type=code` +
      `&scope=read,activity:read` +
      `&state=${encodeURIComponent(redirectUri)}`;
    
    res.redirect(stravaAuthUrl);
  } catch (error) {
    console.error('Erreur lors de l\'initiation OAuth:', error);
    res.status(500).json({ error: "Erreur lors de l'authentification Strava" });
  }
}); // ← IMPORTANT: Point-virgule et accolade fermante

// Route 2: Callback OAuth
app.get('/auth/strava/callback', async (req, res) => {
  try {
    const { code, state } = req.query;
    
    if (!code) {
      return res.status(400).json({ error: "Code d'autorisation manquant" });
    }
    
    const appRedirectUri = state || 'vyve://auth';
    
    if (!process.env.STRAVA_CLIENT_ID || !process.env.STRAVA_CLIENT_SECRET) {
      return res.status(500).json({ error: "Configuration serveur incomplète" });
    }
    
    const tokenResponse = await fetch('https://www.strava.com/oauth/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        client_id: process.env.STRAVA_CLIENT_ID,
        client_secret: process.env.STRAVA_CLIENT_SECRET,
        code: code,
        grant_type: 'authorization_code',
      }),
    });
    
    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text();
      console.error('Erreur Strava API:', errorText);
      return res.status(400).json({ error: "Erreur lors de l'échange du token" });
    }
    
    const tokenData = await tokenResponse.json();
    
    if (!tokenData.access_token) {
      return res.status(400).json({ error: "Token d'accès non reçu" });
    }
    
    const accessToken = tokenData.access_token;
    const appUrl = `${appRedirectUri}?token=${encodeURIComponent(accessToken)}`;
    
    res.send(`<!DOCTYPE html>
<html>
  <head>
    <meta charset="UTF-8">
    <title>Redirection Vyve</title>
    <style>
      body {
        font-family: -apple-system, sans-serif;
        display: flex;
        justify-content: center;
        align-items: center;
        height: 100vh;
        margin: 0;
        background: linear-gradient(135deg, #000814 0%, #001D3D 100%);
        color: white;
      }
      .container { text-align: center; padding: 2rem; }
      .spinner {
        border: 3px solid rgba(0, 180, 216, 0.3);
        border-top: 3px solid #00B4D8;
        border-radius: 50%;
        width: 50px;
        height: 50px;
        animation: spin 1s linear infinite;
        margin: 0 auto 1rem;
      }
      @keyframes spin {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
      }
      a { color: #00B4D8; text-decoration: none; }
    </style>
  </head>
  <body>
    <div class="container">
      <div class="spinner"></div>
      <h2>Connexion réussie !</h2>
      <p>Redirection vers l'application Vyve...</p>
      <p style="font-size: 0.9rem; opacity: 0.7; margin-top: 2rem;">
        <a href="${appUrl.replace(/"/g, '&quot;')}">Cliquez ici si la redirection ne fonctionne pas</a>
      </p>
    </div>
    <script>
      try {
        window.location.href = ${JSON.stringify(appUrl)};
      } catch (e) {
        console.error('Erreur:', e);
      }
      setTimeout(() => {
        try {
          window.location.href = ${JSON.stringify(appUrl)};
        } catch (e) {
          console.error('Erreur:', e);
        }
      }, 2000);
    </script>
  </body>
</html>`);
    
  } catch (err) {
    console.error('Erreur lors de l\'échange de token:', err);
    res.status(500).json({ error: "Erreur lors de l'échange de token" });
  }
}); // ← IMPORTANT: Point-virgule et accolade fermante

// Route de santé
app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

// Démarrage du serveur
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
    
  } catch (err) {
    console.error('Erreur lors de l\'échange de token:', err);
    res.status(500).json({ error: "Erreur lors de l'échange de token" });
  }
});

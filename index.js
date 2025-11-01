// Dans votre index.js (backend)

app.get('/auth/strava', async (req, res) => {
  try {
    // Récupérer l'URL de redirection passée par l'app mobile
    const redirectUri = req.query.redirect_uri || 'vyve://auth';
    
    // Stocker l'URL de redirection dans la session (ou utilisez un autre mécanisme)
    // pour l'utiliser après l'échange du token
    req.session.redirectUri = redirectUri;
    
    // URL de redirection pour Strava OAuth (doit être enregistrée dans Strava)
    // IMPORTANT: Cette URL doit pointer vers votre callback backend, PAS vers l'app
    const stravaRedirectUri = `${req.protocol}://${req.get('host')}/auth/strava/callback`;
    
    // URL d'autorisation Strava
    const stravaAuthUrl = `https://www.strava.com/oauth/authorize?` +
      `client_id=${process.env.STRAVA_CLIENT_ID}` +
      `&redirect_uri=${encodeURIComponent(stravaRedirectUri)}` +
      `&response_type=code` +
      `&scope=read,activity:read` +
      `&state=${encodeURIComponent(redirectUri)}`; // Passer redirect_uri via state pour sécurité
    
    res.redirect(stravaAuthUrl);
  } catch (error) {
    console.error('Erreur lors de l\'initiation OAuth:', error);
    res.status(500).json({ error: "Erreur lors de l'authentification Strava" });
  }
});

// Callback après autorisation Strava
app.get('/auth/strava/callback', async (req, res) => {
  try {
    const { code, state } = req.query;
    
    if (!code) {
      return res.status(400).json({ error: "Code d'autorisation manquant" });
    }
    
    // Récupérer l'URL de redirection depuis le state (plus sécurisé)
    const appRedirectUri = state || 'vyve://auth';
    
    // Échanger le code contre un token d'accès
    const tokenResponse = await fetch('https://www.strava.com/oauth/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        client_id: process.env.STRAVA_CLIENT_ID,
        client_secret: process.env.STRAVA_CLIENT_SECRET,
        code: code,
        grant_type: 'authorization_code',
      }),
    });
    
    const tokenData = await tokenResponse.json();
    
    if (!tokenData.access_token) {
      return res.status(400).json({ error: "Erreur lors de l'obtention du token" });
    }
    
    const accessToken = tokenData.access_token;
    
    // Option 1: Redirection directe vers l'app (fonctionne sur mobile)
    // Construire l'URL avec le token
    const appUrl = `${appRedirectUri}?token=${encodeURIComponent(accessToken)}`;
    
    // Pour iOS/Android, on peut rediriger directement
    // Mais pour Safari/web, il faut une page intermédiaire
    const userAgent = req.headers['user-agent'] || '';
    const isMobileApp = userAgent.includes('Mobile') || userAgent.includes('iPhone') || userAgent.includes('Android');
    
    if (isMobileApp) {
      // Redirection directe pour mobile
      res.redirect(appUrl);
    } else {
      // Page HTML intermédiaire pour Safari/web
      res.send(`
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Redirection vers Vyve</title>
            <style>
              body {
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
                display: flex;
                justify-content: center;
                align-items: center;
                height: 100vh;
                margin: 0;
                background: linear-gradient(135deg, #000814 0%, #001D3D 100%);
                color: white;
              }
              .container {
                text-align: center;
                padding: 2rem;
              }
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
            </style>
          </head>
          <body>
            <div class="container">
              <div class="spinner"></div>
              <h2>Connexion réussie !</h2>
              <p>Redirection vers l'application Vyve...</p>
              <p style="font-size: 0.9rem; opacity: 0.7; margin-top: 2rem;">
                Si l'application ne s'ouvre pas automatiquement, 
                <a href="${appUrl}" style="color: #00B4D8;">cliquez ici</a>
              </p>
            </div>
            <script>
              // Essayer d'ouvrir l'app immédiatement
              window.location.href = "${appUrl}";
              
              // Fallback après 2 secondes
              setTimeout(function() {
                window.location.href = "${appUrl}";
              }, 2000);
            </script>
          </body>
        </html>
      `);
    }
    
  } catch (err) {
    console.error('Erreur lors de l\'échange de token:', err);
    res.status(500).json({ error: "Erreur lors de l'échange de token" });
  }
});

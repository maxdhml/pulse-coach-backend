import express from "express";
import dotenv from "dotenv";
import axios from "axios";

dotenv.config();

const app = express();
const port = process.env.PORT || 10000;

app.get("/", (req, res) => {
  res.send("Pulse Coach Backend is running ✅");
});

app.get("/auth/strava", (req, res) => {
  res.redirect(
    `https://www.strava.com/oauth/authorize?client_id=${process.env.STRAVA_CLIENT_ID}&response_type=code&redirect_uri=https://pulse-coach-backend.onrender.com/exchange_token&approval_prompt=force&scope=read,activity:read_all`
  );
});


app.get("/exchange_token", async (req, res) => {
  const { code } = req.query;
  try {
    const response = await axios.post("https://www.strava.com/oauth/token", {
      client_id: process.env.STRAVA_CLIENT_ID,
      client_secret: process.env.STRAVA_CLIENT_SECRET,
      code,
      grant_type: "authorization_code",
    });

    const token = response.data.access_token;
    // Redirige vers ton app Expo
    res.redirect(`exp://localhost:8081?token=${token}`);
  } catch (err) {
    res.status(500).json({ error: "Erreur lors de l’échange de token" });
  }
});


app.listen(port, () => console.log(`🚀 Serveur lancé sur le port ${port}`));

console.log("CLIENT_ID =", process.env.STRAVA_CLIENT_ID);


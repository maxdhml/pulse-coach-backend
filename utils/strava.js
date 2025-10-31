// utils/strava.js
import axios from 'axios';

const STRAVA_OAUTH_TOKEN = 'https://www.strava.com/oauth/token';
const STRAVA_API_ACTIVITIES = 'https://www.strava.com/api/v3/athlete/activities';

export async function exchangeCodeForToken(clientId, clientSecret, code) {
  const res = await axios.post(STRAVA_OAUTH_TOKEN, {
    client_id: clientId,
    client_secret: clientSecret,
    code,
    grant_type: 'authorization_code'
  });
  return res.data; // contains access_token, refresh_token, expires_at, athlete
}

export async function refreshToken(clientId, clientSecret, refreshToken) {
  const res = await axios.post(STRAVA_OAUTH_TOKEN, {
    client_id: clientId,
    client_secret: clientSecret,
    grant_type: 'refresh_token',
    refresh_token: refreshToken
  });
  return res.data;
}

export async function getActivities(accessToken, per_page = 30) {
  const res = await axios.get(STRAVA_API_ACTIVITIES, {
    params: { per_page },
    headers: { Authorization: `Bearer ${accessToken}` }
  });
  return res.data;
}

// models/User.js
import mongoose from 'mongoose';

const UserSchema = new mongoose.Schema({
  strava_id: { type: Number, unique: true, required: true },
  firstname: String,
  lastname: String,
  username: String,
  access_token: String,
  refresh_token: String,
  expires_at: Number, // timestamp
  createdAt: { type: Date, default: Date.now }
});

export default mongoose.model('User', UserSchema);

import passport from "passport";
import { Strategy as GoogleStrategy, Profile } from "passport-google-oauth20";
import dotenv from "dotenv";
import { User } from "../models/User";
import { connectDB } from "../lib/db";

dotenv.config();

if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
  throw new Error("Missing Google OAuth environment variables");
}

passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL:
        process.env.GOOGLE_CALLBACK_URL ||
        "http://localhost:5000/auth/google/callback",
    },
    async (_accessToken, _refreshToken, profile: Profile, done) => {
      try {
        await connectDB()
        if (!profile.emails?.length) {
          return done(new Error("Google account has no email"));
        }

        const email = profile.emails[0].value.toLowerCase();

        let user = await User.findOne({
          $or: [{ googleId: profile.id }, { email }],
        });

        if (!user) {
          user = await User.create({
            name: profile.displayName,
            email,
            googleId: profile.id,
            profilePicture: profile.photos?.[0]?.value,
          });
        } else if (!user.googleId) {
          user.googleId = profile.id;
          user.profilePicture = profile.photos?.[0]?.value;
          await user.save();
        }

        return done(null, user);
      } catch (err) {
        console.error("Google Strategy Failed:", err);
        return done(err);
      }
    }
  )
);

import passport from "passport";
import { Strategy as GoogleStrategy, Profile as GoogleProfile } from "passport-google-oauth20";
import dotenv from "dotenv";
import { User } from "../models/User";

dotenv.config();

passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      callbackURL: process.env.GOOGLE_CALLBACK_URL || "http://localhost:5000/auth/google/callback",
    },
    async (
      accessToken: string,
      refreshToken: string,
      profile: GoogleProfile,
      done: (err: any, user?: any) => void
    ) => {
      try {
        const email = profile.emails?.[0]?.value;
        
        if (!email) {
          return done(new Error("No email found in Google profile"));
        }

        // Find or create user in database
        let user = await User.findOne({ googleId: profile.id });

        if (!user) {
          // Check if user exists with this email (for linking accounts)
          user = await User.findOne({ email });

          if (user) {
            // Link Google account to existing user
            user.googleId = profile.id;
            user.profilePicture = profile.photos?.[0]?.value;
            await user.save();
          } else {
            // Create new user
            user = await User.create({
              name: profile.displayName,
              email,
              googleId: profile.id,
              profilePicture: profile.photos?.[0]?.value,
            });
          }
        }

        return done(null, user);
      } catch (err) {
        return done(err as Error);
      }
    }
  )
);

// Serialize user - store user ID in session
passport.serializeUser((user: any, done) => {
  done(null, user._id.toString());
});

// Deserialize user - retrieve user from database by ID
passport.deserializeUser(async (id: string, done) => {
  try {
    const user = await User.findById(id);
    done(null, user);
  } catch (err) {
    done(err);
  }
});

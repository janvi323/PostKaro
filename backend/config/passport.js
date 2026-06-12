const LocalStrategy = require('passport-local');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const User = require('../models/users');

module.exports = function (passport) {
  // Local Strategy (passport-local-mongoose handles this)
  passport.use(new LocalStrategy(User.authenticate()));

  // Google OAuth Strategy
  passport.use(
    new GoogleStrategy(
      {
        clientID: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        callbackURL: process.env.GOOGLE_CALLBACK_URL,
      },
      async (accessToken, refreshToken, profile, done) => {
        try {
          const email = profile.emails?.[0]?.value?.toLowerCase();
          const emailVerified = profile.emails?.[0]?.verified !== false;
          if (!email || !emailVerified) {
            return done(null, false, { message: 'Google account email is not verified' });
          }

          // Check if user already exists with this email
          let user = await User.findOne({ email });

          if (user) {
            // User exists — update google info if needed
            if (!user.googleId) {
              user.googleId = profile.id;
              await user.save();
            }
            return done(null, user);
          }

          // Create new user from Google profile
          user = new User({
            googleId: profile.id,
            username: email.split('@')[0].replace(/[^a-zA-Z0-9_]/g, '').slice(0, 20) + '_' + Date.now().toString(36),
            email,
            fullname: profile.displayName,
            dp: profile.photos?.[0]?.value || '/images/default-avatar.svg',
          });

          await user.save();
          return done(null, user);
        } catch (err) {
          return done(err, null);
        }
      }
    )
  );

  // Serialize/Deserialize
  passport.serializeUser((user, done) => {
    done(null, user.id);
  });

  passport.deserializeUser(async (id, done) => {
    try {
      const user = await User.findById(id);
      done(null, user);
    } catch (err) {
      done(err, null);
    }
  });
};

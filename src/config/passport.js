// config/passport.js
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const User = require('../apis/models/User');
const { GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_CALLBACK_URL } = require('../util/constants');

module.exports = (passport) => {
    // GOOGLE STRATEGY
    passport.use(
        new GoogleStrategy(
            {
                clientID: GOOGLE_CLIENT_ID,
                clientSecret: GOOGLE_CLIENT_SECRET,
                callbackURL: GOOGLE_CALLBACK_URL,
            },
            async (accessToken, refreshToken, profile, done) => {
                const email = profile.emails[0].value;
                const name = profile.displayName;

                let user = await User.findOne({ email });

                if (user) {
                    if (!user.googleId) user.googleId = profile.id;
                    user.verified = true;
                    await user.save();
                } else {
                    user = await User.create({
                        email,
                        name,
                        googleId: profile.id,
                        avatar_url: profile.photos[0].value,
                    });
                }

                return done(null, user);
            },
        ),
    );

    passport.serializeUser((user, done) => {
        done(null, user.id);
    });

    passport.deserializeUser(async (id, done) => {
        const user = await User.findById(id);
        done(null, user);
    });
};

import passport from "passport";
import { Strategy } from "passport-google-oauth20";
import { userGoogleModel, userModel } from "../../schema/user.mjs";
import dotenv from 'dotenv';
dotenv.config();

const clientId = process.env.GOOGLE_CLIENT_ID;
const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
const callbackUrl = process.env.GOOGLE_CALLBACK_URL;

passport.use(new Strategy({
    clientID: clientId,
    clientSecret: clientSecret,
    callbackURL: callbackUrl
}, async (accessToken, refreshToken, profile, done) => {
    try {
        const email = profile.emails?.[0]?.value;
        let findUser = await userModel.findOne({ email });
        if (!findUser) {
            const newUser = await userModel.create({
                name: profile.displayName,
                email: email,
                password: "admin123"
            });

            return done(null, newUser);
        }

        return done(null, findUser);

    } catch (error) {
        console.log(error);
        return done(error, null);
    }
}))
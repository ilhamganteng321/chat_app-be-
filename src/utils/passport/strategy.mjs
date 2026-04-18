
import passport from "passport";
import { Strategy } from "passport-local";
import { userGoogleModel, userModel } from "../../schema/user.mjs";
import { comparePassword, hashPassword } from "../bcrypt/bcrypt.mjs";

passport.serializeUser((user, done) => {
    return done(null, user.id)
})

passport.deserializeUser(async (id, done) => {
    try {
        let user = await userModel.findById(id, {password: 0});

        if (!user) {
            user = await userGoogleModel.findById(id);
        }

        return done(null, user);
    } catch (error) {
        return done(error, null);
    }
});

export default passport.use(new Strategy(
    {
        usernameField: "email",
    },
    async (email, password, done) => {
        try {
            const user = await userModel.findOne({ email });

            if (!user) {
                return done(null, false, { message: "User not found" });
            }
            const isMatch = comparePassword(password, user.password) // pastikan async kalau pakai bcrypt
            if (!isMatch) {
                return done(null, false, { message: "Wrong password" });
            }

            return done(null, user);
        } catch (error) {
            console.log(error)
            return done(error);
        }
    }
));



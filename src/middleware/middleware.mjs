import { userModel } from "../schema/user.mjs";

export const middleware = async (req, res, next) => {
    try {
        const user = req.session.passport.user;
        if (!user) return res.statusCode(401)
        const findeUser = await userModel.findById(user)
        if (!findeUser) return res.json({ message: "unautorized" })
        next();
    } catch (error) {
        console.log(error);
        return res.json({ message: "Internal error server" })
    }
}
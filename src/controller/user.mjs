
import { userGoogleModel, userLoginSchema, userModel, userRegisterSchema } from "../schema/user.mjs"
import { comparePassword, hashPassword } from "../utils/bcrypt/bcrypt.mjs";

export const registerUserHandler = async (req, res) => {
    const result = userRegisterSchema.safeParse(req.body);
    console.log(req.body)
    try {
        console.log(result.data)
        if (!result.success) {
            return res.status(400).json({ error: result.error._zod.def.map((err) => err.message).join(", ") });
        }

        const userExist = await userModel.findOne({ email: result.data.email });
        if (userExist) {
            return res.status(400).json({ error: "Email already exists" });
        }

        const hashPass = hashPassword(result.data.password)
        const newUser = new userModel({
            name: result.data.name,
            email: result.data.email,
            password: hashPass
        });
        await newUser.save();
        return res.status(201).json({ message: "User registered successfully" });
    } catch (error) {
        console.log(error)
        return res.status(500).json({ error: "Internal server error" });
    }
}

export const loginUserHandler = async (req, res) => {
    try {
        const result = userLoginSchema.safeParse(req.body);
        const user = await userModel.findOne({ email: result.data.email }, { password: 0 })
        if (!result.success) {
            return res.status(400).json({ error: result.error._zod.map((err) => err.message).join(", ") });
        }
        return res.status(201).json({ data: user, message: "Login successyully" })
    } catch (error) {
        console.log(error)
        return res.status(500).json({ message: "Internal server error" })
    }
}

// Di authRoutes.js atau controller kamu
export const logoutHandler = (req, res) => {
    // 1. Hapus session passport jika pakai passport
    req.logout((err) => {
        if (err) return res.status(500).json({ message: "Logout failed" });
        // 2. Hapus cookie JWT secara manual (sesuaikan dengan nama cookie kamu)
        res.clearCookie("connect.sid"); // Jika pakai session default passport

        res.status(200).json({ message: "Logout berhasil" });
    });
}

export const checkAuthHandler = async (req, res) => {
    try {
        // ✅ ini cara paling aman

        if (!req.isAuthenticated()) {
            return res.status(401).json({ message: "unauthorized" });
        }

        const user = req.user;

        return res.status(200).json({
            data: user
        });

    } catch (error) {
        console.log(error);
        return res.status(500).json({ message: "Internal server error" });
    }
};

export const updateFcmTokenHandler = async (req, res) => {
    try {
        const userId = req.user._id;
        const { token } = req.body;

        if (!token) {
            return res.status(400).json({
                error: "Token is required"
            });
        }

        // 🔥 Tambah token tanpa duplikat
        const user = await userModel.findByIdAndUpdate(
            userId,
            {
                $addToSet: { fcmTokens: token } // ini penting!
            },
            { new: true }
        );

        return res.status(200).json({
            message: "FCM token updated",
            data: user
        });

    } catch (error) {
        console.error("Error update FCM token:", error);
        res.status(500).json({ error: error.message });
    }
};
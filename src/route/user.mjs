import express from "express";
import { loginUserHandler, logoutHandler, registerUserHandler, checkAuthHandler, updateFcmTokenHandler } from "../controller/user.mjs";
import passport from "passport";
import { middleware } from "../middleware/middleware.mjs";

const router = express.Router();

router.post("/auth/register", registerUserHandler);
router.post("/auth/login", passport.authenticate('local'), loginUserHandler);
router.get("/auth/google", passport.authenticate('google', { scope: ['profile', 'email'] }))
router.get('/auth/me', checkAuthHandler)
router.post('/auth/logout', middleware, logoutHandler)
router.get("/auth/google/callback",
    passport.authenticate('google', {
        failureRedirect: 'http://localhost:5173/login' // Ganti ke URL login frontend
    }),
    (req, res) => {
        // Jika berhasil, redirect ke dashboard frontend
        // Browser akan membawa cookie session secara otomatis
        res.redirect("http://localhost:5173/dashboard");
    }
);
router.patch("/user/fcm-token", middleware, updateFcmTokenHandler)



export default router;
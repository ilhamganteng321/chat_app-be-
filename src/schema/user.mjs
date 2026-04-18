import mongoose from "mongoose";
import passport from "passport";
import z, { email } from "zod";

const userSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true
    },
    email: {
        type: String,
        required: true,
        unique: true
    },
    password: {
        type: String,
        required: true
    },
    fcmTokens: [
        {
            type: String
        }
    ],
    created_at: {
        type: Date,
        default: Date.now
    }
})

const loginGoogleSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true
    },
    email: {
        type: String,
        required: true,
        unique: true
    },
    created_at: {
        type: Date,
        default: Date.now
    }
})

export const userRegisterSchema = z.object({
    name: z.string("Name is required").min(2).max(100),
    email: z.string("Email is required").email("Invalid email format"),
    password: z.string("Password is required").min(6).max(100)
})

export const userLoginSchema = z.object({
    email: z.string("Email is required"),
    password: z.string("Password is required"),
})



export const userGoogleModel = mongoose.model("Google", loginGoogleSchema);
export const userModel = mongoose.model("User", userSchema);
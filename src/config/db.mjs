import mongoose from "mongoose";
import dotenv from "dotenv";
dotenv.config();

const mongoUri = process.env.MONGO_URI;

export const connectDB = async () => {
    await mongoose.connect(mongoUri).then(() => console.log("connected"))
}

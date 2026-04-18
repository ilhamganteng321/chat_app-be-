import express from "express";
import session from "express-session";
import passport from "passport";
import { connectDB } from "./config/db.mjs";
import userRoute from "./route/user.mjs";
import contactRoute from "./route/contacts.mjs";
import messageRoute from "./route/message.mjs";
import cookieParser from "cookie-parser";
import MongoStore from "connect-mongo";
import mongoose from "mongoose";
import { Server } from "socket.io";
import http from "http";
import cors from 'cors';

export async function main() {
    await connectDB();
    const app = express();
    const server = http.createServer(app);

    app.use(express.json());
    app.use(express.urlencoded({ extended: true }));
    app.use(cookieParser());
    app.use(cors({
        origin: "http://localhost:5173",
        credentials: true,
        methods: ["GET", "POST", "PUT", "DELETE", "PATCH"],
        allowedHeaders: ["Content-Type", "Authorization"]
    }));

    app.use(session({
        secret: "your-secret-key",
        resave: false,
        saveUninitialized: false,
        store: MongoStore.create({
            client: mongoose.connection.getClient()
        }),
        cookie: {
            maxAge: 7 * 24 * 60 * 60 * 1000,
            httpOnly: true
        }
    }));

    app.use(passport.initialize());
    app.use(passport.session());
    app.use("/api", userRoute);
    app.use("/api", contactRoute);
    app.use("/api", messageRoute);

    app.use((err, req, res, next) => {
        res.status(500).json({ error: err.message });
    });

    // ============ SOCKET.IO IMPLEMENTATION ============
    const io = new Server(server, {
        cors: {
            origin: "http://localhost:5173",
            credentials: true,
            methods: ["GET", "POST"]
        }
    });

    // Store untuk tracking user online dan typing status
    const onlineUsers = new Map(); // userId -> socketId
    const typingUsers = new Map(); // chatId -> { userId, timeout }

    io.on("connection", (socket) => {
        console.log("socket id", socket.id)
        socket.on("user-online", (userId) => {
            if (userId) {
                if (!onlineUsers.has(userId)) {
                    onlineUsers.set(userId, new Set());
                }
                const result = onlineUsers.get(userId).add(socket.id);
                console.log(result)
                io.emit("user-status", { userId, status: "online" });
            }
        });

        // 2. User mulai mengetik
        socket.on("typing-start", ({ senderId, receiverId }) => {
            const receiverSocketIds = onlineUsers.get(receiverId); // sekarang Set

            // Kirim ke semua socket milik receiver
            if (receiverSocketIds && receiverSocketIds.size > 0) {
                for (const socketId of receiverSocketIds) {
                    io.to(socketId).emit("typing-indicator", {
                        senderId,
                        isTyping: true
                    });
                }
            }

            // Auto-stop typing setelah 3 detik
            const chatKey = `${senderId}-${receiverId}`;
            if (typingUsers.has(chatKey)) {
                clearTimeout(typingUsers.get(chatKey));
            }

            const timeout = setTimeout(() => {
                if (receiverSocketIds && receiverSocketIds.size > 0) {
                    for (const socketId of receiverSocketIds) {
                        io.to(socketId).emit("typing-indicator", {
                            senderId,
                            isTyping: false
                        });
                    }
                }
                typingUsers.delete(chatKey);
            }, 5000);

            typingUsers.set(chatKey, timeout);
        });

        // 3. User berhenti mengetik
        socket.on("typing-stop", ({ senderId, receiverId }) => {
            const receiverSocketId = onlineUsers.get(receiverId);
            const chatKey = `${senderId}-${receiverId}`;

            if (typingUsers.has(chatKey)) {
                clearTimeout(typingUsers.get(chatKey));
                typingUsers.delete(chatKey);
            }

            if (receiverSocketId) {
                io.to(receiverSocketId).emit("typing-indicator", {
                    senderId,
                    isTyping: false
                });
            }
        });

        // 4. Kirim pesan real-time
        socket.on("send-message", async (messageData) => {
            const { senderId, receiverId, message, attachments } = messageData;
            const receiverSocketId = onlineUsers.get(receiverId);

            if (receiverSocketId) {
                // Kirim pesan ke receiver secara real-time
                io.to(receiverSocketId).emit("new-message", {
                    ...messageData,
                    createdAt: new Date(),
                    isRead: false
                });
            }

            // Stop typing indicator setelah pesan terkirim
            const chatKey = `${senderId}-${receiverId}`;
            if (typingUsers.has(chatKey)) {
                clearTimeout(typingUsers.get(chatKey));
                typingUsers.delete(chatKey);
            }
        });

        // 5. Pesan sudah dibaca
        socket.on("message-read", ({ messageId, senderId, receiverId }) => {
            const senderSocketId = onlineUsers.get(senderId);
            if (senderSocketId) {
                io.to(senderSocketId).emit("message-read-status", {
                    messageId,
                    receiverId,
                    isRead: true
                });
            }
        });

        // 6. User disconnect
        socket.on("disconnect", () => {
            let disconnectedUserId = null;

            for (let [userId, socketIds] of onlineUsers.entries()) {
                if (socketIds.has(socket.id)) {
                    socketIds.delete(socket.id);
                    if (socketIds.size === 0) {
                        // Benar-benar offline kalau tidak ada socket lain
                        onlineUsers.delete(userId);
                        disconnectedUserId = userId;
                    }
                    break;
                }
            }

            if (disconnectedUserId) {
                io.emit("user-status", { userId: disconnectedUserId, status: "offline" });
            }
        });
    });

    // Export io untuk digunakan di route jika diperlukan
    app.set("io", io);
    app.set("onlineUsers", onlineUsers);

    return { app, server, io };
}
import admin from "../firebase.js";
import { Contact, messageModel } from "../schema/message.mjs";
import { userModel } from "../schema/user.mjs";
import cloudinary from "../utils/cloudinary/cloudinary.mjs";

export const sendMessageHandler = async (req, res) => {
    const sender = req.user?._id;

    try {
        const { receiver, message } = req.body || {};

        // 1. Validasi
        if (!sender || !receiver) {
            return res.status(401).json({
                error: "Sender and receiver are required"
            });
        }

        let attachments = [];

        // 2. Handle file
        if (req.files && req.files.length > 0) {
            attachments = req.files.map(file => {
                let resourceType = "file";
                if (file.mimetype.startsWith("image")) resourceType = "image";
                if (file.mimetype.startsWith("video")) resourceType = "video";

                return {
                    url: file.path,
                    publicId: file.filename,
                    type: resourceType,
                    originalName: file.originalname
                };
            });
        }

        // 3. Validasi isi
        if (!message && attachments.length === 0) {
            return res.status(400).json({
                error: "Pesan atau file harus diisi"
            });
        }

        // 4. Simpan ke DB
        const newMessage = await messageModel.create({
            sender,
            receiver,
            message,
            attachments,
            status: "sent"
        });

        // 🔥 5. SOCKET EMIT (INI YANG PENTING)
        const io = req.app.get("io");
        const onlineUsers = req.app.get("onlineUsers");

        const receiverSockets = onlineUsers?.get(receiver.toString());

        if (receiverSockets && receiverSockets.size > 0) {
            for (const socketId of receiverSockets) {
                io.to(socketId).emit("new-message", newMessage);
            }
        }

        // 🔥 OPTIONAL: emit ke sender juga (biar sync multi device)
        const senderSockets = onlineUsers?.get(sender.toString());
        if (senderSockets) {
            for (const socketId of senderSockets) {
                io.to(socketId).emit("new-message", newMessage);
            }
        }

        // 🔥 Ambil user penerima
        const receiverUser = await userModel.findById(receiver);
        console.log(receiverUser)

        // 🔥 Cek apakah notif aktif & ada token
        if (receiverUser?.fcmTokens && receiverUser.fcmTokens.length > 0) {

            const tokens = receiverUser.fcmTokens;
            const senderName = await userModel.findById(sender, { name: 1, _id: 0 })

            for (const token of tokens) {
                try {
                    await admin.messaging().send({
                        token,
                        notification: {
                            title: `Pesan baru ${senderName.name}`,
                            body: message || "Mengirim file"
                        },
                        data: {
                            senderId: sender.toString(),
                            messageId: newMessage._id.toString()
                        }
                    });
                } catch (err) {
                    console.error("FCM error:", err.code);

                    // 🔥 Hapus token invalid
                    if (err.code === "messaging/registration-token-not-registered") {
                        await userModel.findByIdAndUpdate(receiver, {
                            $pull: { fcmTokens: token }
                        });
                    }
                }
            }
        }

        // 6. Response
        return res.status(201).json({
            message: "Send message successfully",
            data: newMessage
        });

    } catch (error) {
        console.error("Error in sendMessageHandler:", error);
        res.status(500).json({ error: error.message });
    }
};

export const getMessageHandler = async (req, res) => {
    let sendId = req.user._id;
    try {
        const { recId } = req.query;

        if (!sendId || !recId) {
            return res.status(400).json({ error: "sendId & recId required" });
        }

        // Mencari percakapan antara dua user (bolak-balik)
        const messages = await messageModel.find({
            $or: [
                { sender: sendId, receiver: recId },
                { sender: recId, receiver: sendId }
            ]
        }).sort({ createdAt: 1 });

        if (!messages) return res.stats(404).json({ error: "Message not found" }) // Urutkan dari yang terlama ke terbaru

        return res.status(200).json(messages);
    } catch (error) {
        console.error("Error getMessage:", error.message);
        res.status(500).json({ error: "Internal server error" });
    }
}

export const editMessageHandler = async (req, res) => {
    try {
        const { messageId } = req.params; // ID pesan dari URL
        const { senderId, newMessage } = req.body; // ID pengirim untuk validasi

        if (!newMessage) {
            return res.status(400).json({ error: "Pesan baru tidak boleh kosong" });
        }

        // 1. Cari pesan terlebih dahulu
        const existingMessage = await messageModel.findById(messageId);

        if (!existingMessage) {
            return res.status(404).json({ error: "Pesan tidak ditemukan" });
        }

        // 2. Validasi: Apakah yang mengedit adalah pengirim aslinya?
        // Gunakan .toString() karena sender biasanya berupa ObjectId
        if (existingMessage.sender.toString() !== senderId) {
            return res.status(403).json({ error: "Anda tidak memiliki izin untuk mengedit pesan ini" });
        }

        // 3. Update pesan dan tambahkan tanda bahwa pesan telah diedit
        existingMessage.message = newMessage;
        existingMessage.isEdited = true; // Tambahkan field ini di schema jika perlu

        await existingMessage.save();

        return res.status(200).json({
            message: "Pesan berhasil diperbarui",
            data: existingMessage
        });

    } catch (error) {
        console.error("Error editMessage:", error.message);
        res.status(500).json({ error: "Gagal memperbarui pesan" });
    }
};

export const deleteMessageHandler = async (req, res) => {
    try {
        const { messageId } = req.params;
        const { senderId } = req.body;

        const message = await messageModel.findById(messageId);

        if (!message) {
            return res.status(404).json({ error: "Pesan tidak ditemukan" });
        }

        // 1. Validasi Kepemilikan
        if (message.sender.toString() !== senderId) {
            return res.status(403).json({ error: "Gak boleh hapus pesan orang lain!" });
        }

        // 2. Hapus file dari Cloudinary jika ada lampiran
        if (message.attachments && message.attachments.length > 0) {
            const deletePromises = message.attachments.map(file => {
                // Jika file video, harus tambah resource_type: 'video'
                const options = file.type === 'video' ? { resource_type: 'video' } : {};
                return cloudinary.uploader.destroy(file.publicId, options);
            });

            await Promise.all(deletePromises);
        }

        // 3. Hapus data dari Database
        await messageModel.findByIdAndDelete(messageId);

        return res.status(200).json({ message: "Pesan dan file berhasil dihapus" });
    } catch (error) {
        console.error("Delete Error:", error.message);
        res.status(500).json({ error: error.message });
    }
};

export const clearChatHandler = async (req, res) => {
    try {
        const { sendId, recId } = req.query;

        const result = await messageModel.deleteMany({
            $or: [
                { sender: sendId, receiver: recId },
                { sender: recId, receiver: sendId }
            ]
        });

        return res.status(200).json({
            message: `Berhasil menghapus ${result.deletedCount} pesan`
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

export const readMessageHandler = async (req, res) => {
    const userId = req.user._id; // ini receiver (yang login)
    const { sender } = req.body; // sender yang chatnya mau ditandai baca

    try {
        // Cek apakah ada pesan dari sender ke receiver
        const messages = await messageModel.find({
            sender: sender,
            receiver: userId
        });
        console.log("ini message", messages)

        if (messages.length < 0) {
            return res.status(404).json({ message: "No messages found" });
        }

        // Update semua pesan yang belum dibaca
        const readMessage = await messageModel.updateMany(
            {
                sender,
                receiver: userId,
                status: { $ne: "read" }
            },
            {
                status: "read",
                readAt: new Date()
            }
        );

        if (!readMessage) throw new Error('failed save read message');

        // 🔥 Kasih tau sender bahwa pesannya sudah dibaca
        const io = req.app.get("io");
        const onlineUsers = req.app.get("onlineUsers");
        const senderSockets = onlineUsers.get(sender.toString());

        if (senderSockets) {
            for (const socketId of senderSockets) {
                io.to(socketId).emit("message-read", {
                    readerId: userId.toString(), // yang membaca
                    readAt: new Date()
                });
            }
        }

        res.status(200).json({
            message: "Messages marked as read",
            updatedCount: readMessage.modifiedCount
        });
    } catch (error) {
        console.error("errornya dimana", error);
        return res.status(500).json({ message: "Internal server error" });
    }
};

export const getMessageSenderAndReceiver = async (req, res) => {
    const userId = req.user._id;

    try {
        // 1. Ambil contact list user
        const contactDoc = await Contact.findOne({ userId })
            .populate("contacts.userId", "name email");

        if (!contactDoc) {
            return res.json({ data: [] });
        }

        const contacts = contactDoc.contacts;

        // 2. Loop tiap contact
        const results = await Promise.all(
            contacts.map(async (contact) => {
                const otherUserId = contact.userId._id;

                // 🔥 last message (dua arah)
                const lastMessage = await messageModel
                    .findOne({
                        $or: [
                            { sender: userId, receiver: otherUserId },
                            { sender: otherUserId, receiver: userId }
                        ]
                    })
                    .sort({ createdAt: -1 });

                // 🔥 unread count (pesan ke user login)
                const unreadCount = await messageModel.countDocuments({
                    sender: otherUserId,
                    receiver: userId,
                    status: { $ne: "read" }
                });

                return {
                    user: contact.userId,
                    lastMessage,
                    unreadCount
                };
            })
        );

        return res.json({
            data: results
        });

    } catch (error) {
        console.log(error);
        return res.status(500).json({
            message: "Internal server error"
        });
    }
};


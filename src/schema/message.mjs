import mongoose, { Types } from "mongoose";


const messageSchema = new mongoose.Schema({
    sender: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true
    },
    receiver: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true
    },
    message: {
        type: String,
        default: ""
    },

    // Di dalam file schema/message.mjs

    attachments: [
        {
            url: { type: String, required: true },
            // publicId bertipe String untuk menyimpan ID unik dari Cloudinary
            publicId: { type: String, required: true },
            type: {
                type: String,
                enum: ['image', 'video', 'file'],
                default: 'file'
            },
            originalName: String
        }
    ],

    isEdited: { type: Boolean, default: false },

    status: {
        type: String,
        enum: ["sent", "delivered", "read"],
        default: "sent"
    },

    readAt: {
        type: Date,
        default: null
    },

    createdAt: {
        type: Date,
        default: Date.now
    }
});

const contactSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
        unique: true
    },
    contacts: [
        {
            userId: {
                type: mongoose.Schema.Types.ObjectId,
                ref: 'User', // Pastikan nama model tujuan adalah 'User'
                required: true
            },
            createdAt: {
                type: Date,
                default: Date.now // Otomatis mengisi tanggal saat ini
            }
        }
    ]
});

export const Contact = mongoose.model('Contact', contactSchema);

export const messageModel = mongoose.model("Message", messageSchema)

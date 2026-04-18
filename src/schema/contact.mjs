import mongoose from "mongoose";

const contactRequest = mongoose.Schema({
    from: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true
    },
    to: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true
    },
    status: {
        type: String,
        enum: ['Pending', 'Accepted', 'Reject'],
        default: 'Pending'
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
})

export const ContactRequestModel = mongoose.model("ContactRequest", contactRequest);

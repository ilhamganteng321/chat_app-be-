import { treeifyError } from "zod";
import { ContactRequestModel } from "../schema/contact.mjs";
import { Contact } from "../schema/message.mjs";
import { userModel } from "../schema/user.mjs";

export const createContactHandler = async (req, res) => {
    const { email } = req.body;
    const userId = req.user; // 🔥 ambil dari session, jangan dari body

    try {
        if (!email) {
            return res.status(400).json({ error: "Email required" });
        }

        const targetUser = await userModel.findOne({ email });
        if (!targetUser) {
            return res.status(404).json({ error: "User not found" });
        }

        if (targetUser._id.toString() === userId.toString()) {
            return res.status(400).json({ error: "Cannot add yourself" });
        }

        // cek request sudah ada
        const existingRequest = await ContactRequestModel.findOne({
            from: userId,
            to: targetUser._id
        });

        if (existingRequest) {
            return res.status(400).json({ error: "Request already sent" });
        }

        await ContactRequestModel.create({
            from: userId,
            to: targetUser._id,
            status: 'Pending'
        });

        return res.status(201).json({ message: "Request sent" });

    } catch (error) {
        console.error(error);
        return res.status(500).json({ error: "Internal server error" });
    }
};

export const deleteContactHandler = async (req, res) => {
    const { targetId, userId } = req.body; // userId adalah pemilik daftar kontak

    try {
        if (!targetId || !userId) {
            return res.status(400).json({ error: "targetId & userId required" });
        }

        const isExist = await Contact.findOne({ userId }, { _id: 1 })
        if (!isExist) return res.status(400).json({ error: "User not found" })
        // Gunakan $pull untuk menarik/menghapus item dari array contacts
        const result = await Contact.findOneAndUpdate(
            { userId: userId },
            {
                $pull: {
                    contacts: { userId: targetId }
                }
            },
            { new: true } // Mengembalikan data terbaru setelah dihapus
        );

        if (!result) {
            return res.status(404).json({ error: "Contact list not found" });
        }

        return res.status(200).json({
            message: "Contact removed successfully",
            data: result
        });

    } catch (error) {
        console.error(error);
        return res.status(500).json({ error: "Internal server error" });
    }
};

export const acceptContactHandler = async (req, res) => {
    const { requestId, status } = req.body;

    try {
        const request = await ContactRequestModel.findById(requestId);

        if (!request) {
            return res.status(404).json({ error: "Request not found" });
        }

        if (request.status !== 'Pending') {
            return res.status(400).json({ error: "Already processed" });
        }

        // update status
        request.status = status;
        await request.save();

        // 🔥 add ke dua arah
        await Contact.findOneAndUpdate(
            { userId: request.from },
            { $addToSet: { contacts: { userId: request.to } } },
            { upsert: true }
        );

        await Contact.findOneAndUpdate(
            { userId: request.to },
            { $addToSet: { contacts: { userId: request.from } } },
            { upsert: true }
        );

        return res.status(200).json({ message: "Contact added both ways" });

    } catch (error) {
        console.error(error);
        return res.status(500).json({ error: "Internal server error" });
    }
};

export const getContactRequest = async (req, res) => {
    const userId = req.user;
    try {
        const getContactReq = await ContactRequestModel.findOne({ to: userId }, { from: 1, status: 1, to: 1 })
            .populate("from", "name email");

        if (!getContactReq && getContactReq.status !== 'Pending') return res.status(404).json({ message: "No request contact" })
        return res.status(200).json({ data: getContactReq });
    } catch (e) {
        console.log(e)
        return res.status(500).json({ message: "Internal server error" })
    }
}

export const getChatHandler = async (req, res) => {
    const userId = req.user._id;

    try {
        const contacts = await Contact.findOne({ userId })
            .populate("contacts.userId", "name email"); // 🔥 ambil field tertentu

        if (!contacts) {
            return res.status(200).json({ data: [] });
        }

        return res.status(200).json({
            data: contacts.contacts
        });

    } catch (error) {
        console.error(error);
        return res.status(500).json({ error: "Internal server error" });
    }
};
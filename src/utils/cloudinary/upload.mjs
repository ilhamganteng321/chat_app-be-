// utils/upload.mjs
import multer from "multer";
import { CloudinaryStorage } from "multer-storage-cloudinary";
import cloudinary from "./cloudinary.mjs";

const storage = new CloudinaryStorage({
    cloudinary,
    params: async (req, file) => {
        let resourceType = "auto";

        if (file.mimetype.startsWith("image")) {
            resourceType = "image";
        } else if (file.mimetype.startsWith("video")) {
            resourceType = "video";
        }

        // Di dalam upload.mjs
        return {
            folder: "chat-app",
            resource_type: resourceType,
            // Hapus originalname atau ganti spasi dengan underscore
            public_id: Date.now() + "-" + file.originalname.replace(/\s+/g, '_')
        };
    }
});

export const upload = multer({
    storage,
    limits: {
        fileSize: 5 * 1024 * 1024 // 5MB
    }
});

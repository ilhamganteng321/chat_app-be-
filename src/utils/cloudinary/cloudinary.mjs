import { v2 as cloudinary } from 'cloudinary';
import dotenv from 'dotenv'
dotenv.config();

const name = process.env.CLOUDINARY_NAME || '';
const key = process.env.CLOUDINARY_API_KEY || ''
const secret = process.env.CLOUDINARY_SECRET || ''


 cloudinary.config({
    cloud_name: name,
    api_key: key,
    api_secret: secret
});

export default cloudinary;


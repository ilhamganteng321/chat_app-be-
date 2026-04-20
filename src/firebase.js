import admin from "firebase-admin";

const privateKey = process.env.PRIVATE_KEY.replace(/\\n/g, '\n')

const serviceAccount = {
    projectId: process.env.PROJECT_ID,
    clientEmail: process.env.CLIENT_EMAIL,
    privateKey
};

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
});

export default admin;

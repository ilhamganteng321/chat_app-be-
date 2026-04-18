import admin from "firebase-admin";

const privateKey = process.env.private_key.replace(/\\n/g, '\n')

const serviceAccount = {
    projectId: process.env.project_id,
    clientEmail: process.env.client_email,
    privateKey
};

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
});

export default admin;

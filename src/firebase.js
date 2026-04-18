import admin from "firebase-admin";

const serviceAccount = {
    projectId: process.env.project_id,
    clientEmail: process.env.client_email,
    privateKey: process.env.private_key.replace(/\\n/g, '\n'),
};

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
});

export default admin;

import { connectDB } from "./src/config/db.mjs";
import './src/utils/passport/strategy.mjs';
import './src/utils/passport/google.mjs';
import { main } from "./src/app.mjs";

const { app, server, io } = await main();

// ✅ Gunakan SERVER, bukan app.listen
server.listen(3000, () => {
    console.log("Server running on port 3000");
    console.log("Socket.IO is ready");
});
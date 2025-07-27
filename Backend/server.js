import express from 'express';
import dotenv from 'dotenv';
import cookieParser from 'cookie-parser';
import path from 'path';
import cors from 'cors';
import authRoutes from './routes/authRoutes.js';
import messageRoutes from './routes/messageRoutes.js';
import userRoutes from './routes/userRoutes.js';
import connectToMongoDB from './db/connectToMongoDB.js';
import { app, server } from './socket/socket.js';

dotenv.config();

app.use(cors({
   //origin: "http://localhost:3000",
    origin:"https://chat-app-frontend-gules-chi.vercel.app",
    methods: ["GET", "POST", "PUT", "DELETE"],
    credentials: true
}));

const __dirname = path.resolve();
const PORT = process.env.PORT || 5000;

app.use(express.json());
app.use(cookieParser());

app.use("/api/auth", authRoutes);
app.use("/api/messages", messageRoutes);
app.use("/api/users", userRoutes);

app.use(express.static(path.join(__dirname, "/Frontend/dist")));
app.get("/",(req,res)=>{
    res.send("hellow");
})

app.get("*", (req, res) => {
    res.sendFile(path.join(__dirname, "Frontend", "dist", "index.html"));
});

// server.listen(PORT, () => {
//     connectToMongoDB();
//     console.log(`Server Running on port ${PORT}`);
// });
 connectToMongoDB();
// app.listen(PORT,()=>{
   
//     console.log(`Server running on port ${PORT}`);
// })
connectToMongoDB();
server.listen(PORT, () => {
	console.log(`✅ Server + Socket.IO running on port ${PORT}`);
});

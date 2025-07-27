import { Server } from "socket.io";
import http from "http";
import express from "express";

const app = express();

const server = http.createServer(app);
const io = new Server(server, {
	cors: {
		//origin: ["http://localhost:3000"],
		origin: "https://chat-app-frontend-gules-chi.vercel.app",
		methods: ["GET", "POST"],
		credentials: true,
	},
});

const userSocketMap = {}; // { userId: socketId }

export const getReceiverSocketId = (receiverId) => {
	return userSocketMap[receiverId];
};

io.on("connection", (socket) => {
	console.log("A user connected", socket.id);

	const userId = socket.handshake.query.userId;

	if (userId && userId !== "undefined") {
		userSocketMap[userId] = socket.id;
		socket.userId = userId; // ✅ attach userId for future use
	}

	io.emit("getOnlineUsers", Object.keys(userSocketMap));

	// ✅ Typing events
	socket.on("typing", ({ to }) => {
		socket.to(userSocketMap[to]).emit("userTyping", socket.userId);
	});

	socket.on("stopTyping", ({ to }) => {
		socket.to(userSocketMap[to]).emit("userStoppedTyping", socket.userId);
	});

	socket.on("disconnect", () => {
		console.log("User disconnected", socket.id);
		delete userSocketMap[userId];
		io.emit("getOnlineUsers", Object.keys(userSocketMap));
	});
});

export { app, io, server };

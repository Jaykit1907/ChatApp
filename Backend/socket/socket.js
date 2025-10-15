import { Server } from "socket.io";
import http from "http";
import express from "express";

const app = express();

const server = http.createServer(app);
const io = new Server(server, {
	cors: {
		//origin: ["http://localhost:3000"],
		origin:"https://chat-app-frontend-gules-chi.vercel.app",
		methods: ["GET", "POST"],
		credentials: true,
	},
});

const userSocketMap = {};
const activeCalls = new Map();

export const getReceiverSocketId = (receiverId) => {
	return userSocketMap[receiverId];
};

io.on("connection", (socket) => {
	console.log("A user connected", socket.id);

	const userId = socket.handshake.query.userId;

	if (userId && userId !== "undefined") {
		userSocketMap[userId] = socket.id;
		socket.userId = userId;
	}

	io.emit("getOnlineUsers", Object.keys(userSocketMap));

	// Typing events
	socket.on("typing", ({ to }) => {
		socket.to(userSocketMap[to]).emit("userTyping", socket.userId);
	});

	socket.on("stopTyping", ({ to }) => {
		socket.to(userSocketMap[to]).emit("userStoppedTyping", socket.userId);
	});

	// Call events
	socket.on("initiateCall", (data) => {
		const { to, from, callType } = data;
		const callId = `${from}-${to}-${Date.now()}`;
		
		activeCalls.set(callId, {
			participants: [from, to],
			callType: callType,
			status: 'calling',
			caller: from,
			receiver: to,
			callId: callId
		});

		const receiverSocketId = getReceiverSocketId(to);
		if (receiverSocketId) {
			socket.to(receiverSocketId).emit("incomingCall", {
				callId,
				from: from,
				to: to,
				callType: callType,
				callerName: data.callerName
			});
			console.log(`Call initiated: ${callId}, Type: ${callType}`);
		} else {
			activeCalls.delete(callId);
			socket.emit("callEnded", {
				callId,
				reason: "User is offline"
			});
		}
	});

	socket.on("acceptCall", (data) => {
		const { callId, to, from } = data;
		const call = activeCalls.get(callId);
		
		if (call) {
			activeCalls.set(callId, { ...call, status: 'active' });
			
			const callerSocketId = getReceiverSocketId(to);
			if (callerSocketId) {
				socket.to(callerSocketId).emit("callAccepted", {
					callId,
					from: from,
					to: to
				});
			}
		}
	});

	socket.on("rejectCall", (data) => {
		const { callId, to, from, reason } = data;
		const call = activeCalls.get(callId);
		
		if (call) {
			const callerSocketId = getReceiverSocketId(to);
			if (callerSocketId) {
				socket.to(callerSocketId).emit("callRejected", {
					callId,
					from: from,
					to: to,
					reason: reason
				});
			}
			activeCalls.delete(callId);
		}
	});

	socket.on("endCall", (data) => {
		const { callId, to, from } = data;
		const call = activeCalls.get(callId);
		
		if (call) {
			// Notify receiver
			const receiverSocketId = getReceiverSocketId(to);
			if (receiverSocketId) {
				socket.to(receiverSocketId).emit("callEnded", {
					callId,
					from: from,
					reason: "Call ended by user"
				});
			}

			// Notify caller
			const callerSocketId = getReceiverSocketId(from);
			if (callerSocketId) {
				socket.to(callerSocketId).emit("callEnded", {
					callId,
					from: from,
					reason: "Call ended by you"
				});
			}

			activeCalls.delete(callId);
		}
	});

	// WebRTC signaling events
	socket.on("webrtc-offer", (data) => {
		const { offer, to } = data;
		const receiverSocketId = getReceiverSocketId(to);
		if (receiverSocketId) {
			socket.to(receiverSocketId).emit("webrtc-offer", {
				offer,
				from: socket.userId
			});
		}
	});

	socket.on("webrtc-answer", (data) => {
		const { answer, to } = data;
		const receiverSocketId = getReceiverSocketId(to);
		if (receiverSocketId) {
			socket.to(receiverSocketId).emit("webrtc-answer", {
				answer,
				from: socket.userId
			});
		}
	});

	socket.on("webrtc-ice-candidate", (data) => {
		const { candidate, to } = data;
		const receiverSocketId = getReceiverSocketId(to);
		if (receiverSocketId) {
			socket.to(receiverSocketId).emit("webrtc-ice-candidate", {
				candidate,
				from: socket.userId
			});
		}
	});

	socket.on("disconnect", () => {
		console.log("User disconnected", socket.id);
		
		for (const [callId, callData] of activeCalls.entries()) {
			if (callData.participants.includes(userId)) {
				callData.participants.forEach(participantId => {
					if (participantId !== userId) {
						const participantSocketId = getReceiverSocketId(participantId);
						if (participantSocketId) {
							socket.to(participantSocketId).emit("callEnded", {
								callId,
								from: userId,
								reason: "User disconnected"
							});
						}
					}
				});
				activeCalls.delete(callId);
			}
		}

		if (userId) {
			delete userSocketMap[userId];
			io.emit("getOnlineUsers", Object.keys(userSocketMap));
		}
	});
});

export { app, io, server };
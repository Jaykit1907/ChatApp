import { Server } from "socket.io";
import http from "http";
import express from "express";

const app = express();

const server = http.createServer(app);
const io = new Server(server, {
	cors: {
		origin: [
			"http://localhost:3000",
			"https://chat-app-frontend-gules-chi.vercel.app",
		],
		methods: ["GET", "POST"],
		credentials: true,
	},
});

const userSocketMap = {};
const activeCalls = new Map(); // Track active calls

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

	// ✅ Send online users list to all clients
	io.emit("getOnlineUsers", Object.keys(userSocketMap));

	/* ==============================
	   ✅ TYPING EVENTS
	   ============================== */
	socket.on("typing", ({ to }) => {
		const receiverSocketId = userSocketMap[to];
		if (receiverSocketId) {
			// Send event to the receiver only
			socket.to(receiverSocketId).emit("userTyping", socket.userId);
			console.log(`✍️ ${socket.userId} is typing to ${to}`);
		}
	});

	socket.on("stopTyping", ({ to }) => {
		const receiverSocketId = userSocketMap[to];
		if (receiverSocketId) {
			socket.to(receiverSocketId).emit("userStoppedTyping", socket.userId);
			console.log(`💬 ${socket.userId} stopped typing to ${to}`);
		}
	});

	/* ==============================
	   📞 CALL EVENTS
	   ============================== */

	// Call initiation
	socket.on("callUser", (data) => {
		const { userToCall, callType, caller, roomID } = data;

		const callId = `${caller._id}-${userToCall}-${Date.now()}`;

		activeCalls.set(callId, {
			participants: [caller._id, userToCall],
			callType,
			status: "calling",
			caller: caller._id,
			receiver: userToCall,
			callId,
			roomID,
		});

		const receiverSocketId = getReceiverSocketId(userToCall);
		if (receiverSocketId) {
			socket.to(receiverSocketId).emit("incomingCall", {
				callType,
				caller,
				roomID,
				callId,
			});
			console.log(
				`📞 Call initiated from ${caller.fullName} to ${userToCall}, Type: ${callType}`
			);
		} else {
			activeCalls.delete(callId);
			socket.emit("callEnded", { reason: "User is offline" });
		}
	});

	// Call acceptance
	socket.on("acceptCall", (data) => {
		const { callerId, roomID } = data;

		let callIdToUpdate = null;
		for (const [callId, callData] of activeCalls.entries()) {
			if (callData.caller === callerId && callData.roomID === roomID) {
				callIdToUpdate = callId;
				break;
			}
		}

		if (callIdToUpdate) {
			const call = activeCalls.get(callIdToUpdate);
			activeCalls.set(callIdToUpdate, { ...call, status: "active" });

			const callerSocketId = getReceiverSocketId(callerId);
			if (callerSocketId) {
				socket.to(callerSocketId).emit("callAccepted", { roomID });
				console.log(`✅ Call accepted by ${socket.userId}`);
			}
		}
	});

	// Call rejection
	socket.on("rejectCall", (data) => {
		const { callerId } = data;

		let callIdToDelete = null;
		for (const [callId, callData] of activeCalls.entries()) {
			if (callData.caller === callerId && callData.status === "calling") {
				callIdToDelete = callId;
				break;
			}
		}

		if (callIdToDelete) {
			const call = activeCalls.get(callIdToDelete);
			const callerSocketId = getReceiverSocketId(callerId);
			if (callerSocketId) {
				socket.to(callerSocketId).emit("callRejected", {
					reason: "Call rejected",
				});
				console.log(`❌ Call rejected by ${socket.userId}`);
			}
			activeCalls.delete(callIdToDelete);
		}
	});

	// Call end
	socket.on("endCall", (data) => {
		const { userToCall } = data;

		const callsToEnd = [];
		for (const [callId, callData] of activeCalls.entries()) {
			if (
				callData.participants.includes(socket.userId) &&
				callData.participants.includes(userToCall)
			) {
				callsToEnd.push(callId);
			}
		}

		callsToEnd.forEach((callId) => {
			const call = activeCalls.get(callId);

			const otherParticipant = call.participants.find(
				(id) => id !== socket.userId
			);
			const otherSocketId = getReceiverSocketId(otherParticipant);

			if (otherSocketId) {
				socket.to(otherSocketId).emit("callEnded");
				console.log(`📵 Call ended by ${socket.userId}`);
			}

			activeCalls.delete(callId);
		});
	});

	/* ==============================
	   📴 DISCONNECT HANDLING
	   ============================== */
	socket.on("disconnect", () => {
		console.log("User disconnected", socket.id);

		// Handle ongoing calls
		for (const [callId, callData] of activeCalls.entries()) {
			if (callData.participants.includes(userId)) {
				callData.participants.forEach((participantId) => {
					if (participantId !== userId) {
						const participantSocketId = getReceiverSocketId(participantId);
						if (participantSocketId) {
							socket.to(participantSocketId).emit("callEnded", {
								reason: "User disconnected",
							});
						}
					}
				});
				activeCalls.delete(callId);
				console.log(`Call ${callId} ended due to user disconnect`);
			}
		}

		if (userId) {
			delete userSocketMap[userId];
			io.emit("getOnlineUsers", Object.keys(userSocketMap));
		}
	});
});

export { app, io, server };

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
const activeCalls = new Map(); // Store active calls: { callId: { participants, callType, status } }

export const getReceiverSocketId = (receiverId) => {
	return userSocketMap[receiverId];
};

export const getActiveCall = (userId) => {
	for (const [callId, callData] of activeCalls.entries()) {
		if (callData.participants.includes(userId)) {
			return { callId, ...callData };
		}
	}
	return null;
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

	// ✅ Call events
	socket.on("initiateCall", (data) => {
		const { to, from, callType } = data;
		const callId = `${from}-${to}-${Date.now()}`;
		
		// Store call information
		activeCalls.set(callId, {
			participants: [from, to],
			callType: callType,
			status: 'calling',
			caller: from,
			receiver: to,
			callId: callId
		});

		// Notify the receiver
		const receiverSocketId = getReceiverSocketId(to);
		if (receiverSocketId) {
			socket.to(receiverSocketId).emit("incomingCall", {
				callId,
				from: from,
				to: to,
				callType: callType,
				callerName: data.callerName
			});
			console.log(`Call initiated: ${callId}, Type: ${callType}, Notified: ${to}`);
		} else {
			console.log(`Call initiated but receiver ${to} is offline`);
			// Remove call if receiver is offline
			activeCalls.delete(callId);
			// Notify caller that receiver is offline
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
			// Update call status
			activeCalls.set(callId, { ...call, status: 'active' });
			
			// Notify the caller
			const callerSocketId = getReceiverSocketId(to);
			if (callerSocketId) {
				socket.to(callerSocketId).emit("callAccepted", {
					callId,
					from: from,
					to: to
				});
				console.log(`Call accepted: ${callId}, Notified caller: ${to}`);
			} else {
				console.log(`Call accepted but caller ${to} is offline`);
				activeCalls.delete(callId);
			}
		} else {
			console.log(`Call ${callId} not found when trying to accept`);
			// Notify the user that call doesn't exist
			socket.emit("callEnded", {
				callId,
				reason: "Call not found"
			});
		}
	});

	socket.on("rejectCall", (data) => {
		const { callId, to, from, reason } = data;
		const call = activeCalls.get(callId);
		
		if (call) {
			// Notify the caller
			const callerSocketId = getReceiverSocketId(to);
			if (callerSocketId) {
				socket.to(callerSocketId).emit("callRejected", {
					callId,
					from: from,
					to: to,
					reason: reason
				});
			}

			// Remove call from active calls
			activeCalls.delete(callId);
			console.log(`Call rejected: ${callId}, Reason: ${reason}`);
		} else {
			console.log(`Call ${callId} not found when trying to reject`);
		}
	});

	socket.on("endCall", (data) => {
		const { callId, to, from } = data;
		const call = activeCalls.get(callId);
		
		if (call) {
			console.log(`🟢 ENDING CALL: ${callId} from ${from} to ${to}`);
			
			// FIXED: Notify the receiver with "callEnded" event
			const receiverSocketId = getReceiverSocketId(to);
			if (receiverSocketId) {
				console.log(`🟢 Notifying receiver ${to} about call end`);
				socket.to(receiverSocketId).emit("callEnded", {
					callId,
					from: from,
					reason: "Call ended by user"
				});
			}

			// FIXED: Notify the caller themselves with "callEndedSelf" event
			const callerSocketId = getReceiverSocketId(from);
			if (callerSocketId) {
				console.log(`🟢 Notifying caller ${from} about call end`);
				socket.to(callerSocketId).emit("callEndedSelf", {
					callId,
					reason: "Call ended by you"
				});
			}

			// Also notify the current socket (the one who ended the call)
			socket.emit("callEndedSelf", {
				callId,
				reason: "Call ended by you"
			});

			// Remove call from active calls
			activeCalls.delete(callId);
			console.log(`🟢 Call ${callId} completely removed from active calls`);
		} else {
			console.log(`🔴 Call ${callId} not found when trying to end`);
			// Still notify the sender that call is ended
			socket.emit("callEndedSelf", {
				callId,
				reason: "Call not found"
			});
		}
	});

	// ✅ WebRTC signaling events
	socket.on("webrtc-offer", (data) => {
		const { offer, to, callId } = data;
		const receiverSocketId = getReceiverSocketId(to);
		if (receiverSocketId) {
			socket.to(receiverSocketId).emit("webrtc-offer", {
				offer,
				from: socket.userId,
				callId
			});
			console.log(`WebRTC offer sent to ${to} for call ${callId}`);
		} else {
			console.log(`WebRTC offer failed: Receiver ${to} offline`);
		}
	});

	socket.on("webrtc-answer", (data) => {
		const { answer, to, callId } = data;
		const receiverSocketId = getReceiverSocketId(to);
		if (receiverSocketId) {
			socket.to(receiverSocketId).emit("webrtc-answer", {
				answer,
				from: socket.userId,
				callId
			});
			console.log(`WebRTC answer sent to ${to} for call ${callId}`);
		} else {
			console.log(`WebRTC answer failed: Receiver ${to} offline`);
		}
	});

	socket.on("webrtc-ice-candidate", (data) => {
		const { candidate, to, callId } = data;
		const receiverSocketId = getReceiverSocketId(to);
		if (receiverSocketId) {
			socket.to(receiverSocketId).emit("webrtc-ice-candidate", {
				candidate,
				from: socket.userId,
				callId
			});
		}
	});

	// Handle call timeout from frontend
	socket.on("callTimeout", (data) => {
		const { callId, to } = data;
		const call = activeCalls.get(callId);
		
		if (call) {
			// Notify the other participant about timeout
			const receiverSocketId = getReceiverSocketId(to);
			if (receiverSocketId) {
				socket.to(receiverSocketId).emit("callEnded", {
					callId,
					reason: "Call timeout - no answer"
				});
			}
			
			// Remove call from active calls
			activeCalls.delete(callId);
			console.log(`Call ${callId} timed out`);
		}
	});

	socket.on("disconnect", () => {
		console.log("User disconnected", socket.id, "User ID:", userId);
		
		// Clean up user's active calls more aggressively
		for (const [callId, callData] of activeCalls.entries()) {
			if (callData.participants.includes(userId)) {
				console.log(`Cleaning up call ${callId} due to user ${userId} disconnect`);
				
				// Notify other participants
				callData.participants.forEach(participantId => {
					if (participantId !== userId) {
						const participantSocketId = getReceiverSocketId(participantId);
						if (participantSocketId) {
							socket.to(participantSocketId).emit("callEnded", {
								callId,
								from: userId,
								reason: "User disconnected"
							});
							console.log(`Notified ${participantId} about disconnection`);
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
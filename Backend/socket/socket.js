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

	io.emit("getOnlineUsers", Object.keys(userSocketMap));

	// Typing events
	socket.on("typing", ({ to }) => {
		socket.to(userSocketMap[to]).emit("userTyping", socket.userId);
	});

	socket.on("stopTyping", ({ to }) => {
		socket.to(userSocketMap[to]).emit("userStoppedTyping", socket.userId);
	});

	// 🔥 CALL EVENTS - Updated to match frontend

	// Call initiation
	socket.on("callUser", (data) => {
		const { userToCall, callType, caller, roomID } = data;
		
		const callId = `${caller._id}-${userToCall}-${Date.now()}`;
		
		// Store call information
		activeCalls.set(callId, {
			participants: [caller._id, userToCall],
			callType: callType,
			status: 'calling',
			caller: caller._id,
			receiver: userToCall,
			callId: callId,
			roomID: roomID
		});

		const receiverSocketId = getReceiverSocketId(userToCall);
		if (receiverSocketId) {
			socket.to(receiverSocketId).emit("incomingCall", {
				callType: callType,
				caller: caller,
				roomID: roomID,
				callId: callId
			});
			console.log(`📞 Call initiated from ${caller.fullName} to ${userToCall}, Type: ${callType}`);
		} else {
			// User is offline
			activeCalls.delete(callId);
			socket.emit("callEnded", {
				reason: "User is offline"
			});
		}
	});

	// Call acceptance
	socket.on("acceptCall", (data) => {
		const { callerId, roomID } = data;
		
		// Find the call by caller ID and room ID
		let callIdToUpdate = null;
		for (const [callId, callData] of activeCalls.entries()) {
			if (callData.caller === callerId && callData.roomID === roomID) {
				callIdToUpdate = callId;
				break;
			}
		}
		
		if (callIdToUpdate) {
			const call = activeCalls.get(callIdToUpdate);
			activeCalls.set(callIdToUpdate, { ...call, status: 'active' });
			
			const callerSocketId = getReceiverSocketId(callerId);
			if (callerSocketId) {
				socket.to(callerSocketId).emit("callAccepted", {
					roomID: roomID
				});
				console.log(`✅ Call accepted by ${socket.userId}`);
			}
		}
	});

	// Call rejection
	socket.on("rejectCall", (data) => {
		const { callerId } = data;
		
		// Find calls by this caller
		let callIdToDelete = null;
		for (const [callId, callData] of activeCalls.entries()) {
			if (callData.caller === callerId && callData.status === 'calling') {
				callIdToDelete = callId;
				break;
			}
		}
		
		if (callIdToDelete) {
			const call = activeCalls.get(callIdToDelete);
			const callerSocketId = getReceiverSocketId(callerId);
			if (callerSocketId) {
				socket.to(callerSocketId).emit("callRejected", {
					reason: "Call rejected"
				});
				console.log(`❌ Call rejected by ${socket.userId}`);
			}
			activeCalls.delete(callIdToDelete);
		}
	});

	// Call end
	socket.on("endCall", (data) => {
		const { userToCall } = data;
		
		// Find all calls involving these users
		const callsToEnd = [];
		for (const [callId, callData] of activeCalls.entries()) {
			if (callData.participants.includes(socket.userId) && 
				callData.participants.includes(userToCall)) {
				callsToEnd.push(callId);
			}
		}
		
		callsToEnd.forEach(callId => {
			const call = activeCalls.get(callId);
			
			// Notify the other participant
			const otherParticipant = call.participants.find(id => id !== socket.userId);
			const otherSocketId = getReceiverSocketId(otherParticipant);
			
			if (otherSocketId) {
				socket.to(otherSocketId).emit("callEnded");
				console.log(`📵 Call ended by ${socket.userId}`);
			}
			
			activeCalls.delete(callId);
		});
	});

	socket.on("disconnect", () => {
		console.log("User disconnected", socket.id);
		
		// Handle calls when user disconnects
		for (const [callId, callData] of activeCalls.entries()) {
			if (callData.participants.includes(userId)) {
				// Notify other participants
				callData.participants.forEach(participantId => {
					if (participantId !== userId) {
						const participantSocketId = getReceiverSocketId(participantId);
						if (participantSocketId) {
							socket.to(participantSocketId).emit("callEnded", {
								reason: "User disconnected"
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
import { createContext, useState, useEffect, useContext } from "react";
import { useAuthContext } from "./AuthContext";
import io from "socket.io-client";
import { BASE_URL } from "../Url";
import useConversation from "../zustand/useConversation";

const SocketContext = createContext();

export const useSocketContext = () => {
	return useContext(SocketContext);
};

export const SocketContextProvider = ({ children }) => {
	const [socket, setSocket] = useState(null);
	const [onlineUsers, setOnlineUsers] = useState([]);
	const { authUser } = useAuthContext();
	const { setTypingUsers } = useConversation(); // ✅ ADDED for Zustand typing state

	// ✅ Create or destroy socket when authUser changes
	useEffect(() => {
		if (authUser) {
			const socketInstance = io(BASE_URL, {
				transports: ["polling"], // or ["websocket"] depending on backend
				query: { userId: authUser._id },
			});

			setSocket(socketInstance);

			// ✅ Update online users
			socketInstance.on("getOnlineUsers", (users) => {
				setOnlineUsers(users);
			});

			// Cleanup on logout or unmount
			return () => {
				socketInstance.close();
				setSocket(null);
			};
		} else {
			if (socket) {
				socket.close();
				setSocket(null);
			}
		}
	}, [authUser]);

	// ✅ Listen for typing indicators
	useEffect(() => {
		if (!socket) return;

		const handleTyping = (senderId) => {
			setTypingUsers(senderId, true); // user started typing
		};

		const handleStopTyping = (senderId) => {
			setTypingUsers(senderId, false); // user stopped typing
		};

		socket.on("userTyping", handleTyping);
		socket.on("userStoppedTyping", handleStopTyping);

		// Cleanup listeners to avoid duplicates
		return () => {
			socket.off("userTyping", handleTyping);
			socket.off("userStoppedTyping", handleStopTyping);
		};
	}, [socket, setTypingUsers]);

	return (
		<SocketContext.Provider value={{ socket, onlineUsers }}>
			{children}
		</SocketContext.Provider>
	);
};

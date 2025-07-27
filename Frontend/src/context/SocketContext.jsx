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
	const { setTypingUsers } = useConversation(); // ✅ FIX: moved here

	useEffect(() => {
		if (authUser) {
			const socket = io(BASE_URL, {
				transports: ["polling"], // or ["websocket"] based on your needs
				query: { userId: authUser._id },
			});

			setSocket(socket);

			socket.on("getOnlineUsers", (users) => {
				setOnlineUsers(users);
			});

			return () => socket.close();
		} else {
			if (socket) {
				socket.close();
				setSocket(null);
			}
		}
	}, [authUser]);

	useEffect(() => {
		if (!socket) return;

		const handleTyping = (senderId) => {
			setTypingUsers(senderId, true);
		};

		const handleStopTyping = (senderId) => {
			setTypingUsers(senderId, false);
		};

		socket.on("userTyping", handleTyping);
		socket.on("userStoppedTyping", handleStopTyping);

		return () => {
			socket.off("userTyping", handleTyping);
			socket.off("userStoppedTyping", handleStopTyping);
		};
	}, [socket, setTypingUsers]); // include setTypingUsers as a dependency

	return (
		<SocketContext.Provider value={{ socket, onlineUsers }}>
			{children}
		</SocketContext.Provider>
	);
};

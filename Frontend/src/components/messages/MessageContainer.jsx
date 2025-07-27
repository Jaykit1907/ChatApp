import { useEffect, useState } from "react";
import useConversation from "../../zustand/useConversation";
import MessageInput from "./MessageInput";
import Messages from "./Messages";
import { TiMessages } from "react-icons/ti";
import { IoArrowBack } from "react-icons/io5";
import { useAuthContext } from "../../context/AuthContext";
import { useSocketContext } from "../../context/SocketContext";
import "./MessageContainer.css";

const MessageContainer = ({ onBack }) => {
	const [user, setUser] = useState(null);
	const { selectedConversation } = useConversation();
	const { onlineUsers } = useSocketContext();

	const isSelectedUserOnline =
		selectedConversation && onlineUsers.includes(selectedConversation._id);

	const isLoggedUserOnline =
		user && onlineUsers.includes(user._id); // ✅ check for logged-in user

	useEffect(() => {
		const userData = localStorage.getItem("chat-user");
		if (userData) {
			try {
				setUser(JSON.parse(userData));
			} catch (e) {
				console.error("Error parsing user from localStorage", e);
			}
		}
	}, []);

	return (
		<div className="blur-bg">
			<div className="message-container">
				{!selectedConversation ? (
					<NoChatSelected />
				) : (
					<div className="chat-panel">
						{/* Header */}
						<div className="chat-header">
							<button className="back-button" onClick={onBack}>
								<IoArrowBack size={20} />
							</button>

							<div className="chat-with">
								<span className="chat-label">Chatting with:</span>
								<span className="chat-name">{selectedConversation.fullName}</span>
								<span className={`chat-status ${isSelectedUserOnline ? "online1" : "offline1"}`}>
									{isSelectedUserOnline ? "Online" : "Offline"}
								</span>
							</div>

							{/* Logged in user */}
							{user && (
								<div className="user-info">
									<div className="user-avatar-container">
										<img
											src={user.profilePic || "/default-avatar.png"}
											alt="Profile"
											className="user-avatar"
										/>
										{isLoggedUserOnline && <span className="online-dot"></span>}
									</div>
									<span className="logged-user">{user.username}</span>
								</div>
							)}
						</div>

						{/* Messages */}
						<div className="messages">
							<Messages />
						</div>

						{/* Input */}
						<div className="message-input">
							<MessageInput />
						</div>
					</div>
				)}
			</div>
		</div>
	);
};

const NoChatSelected = () => {
	const { authUser } = useAuthContext();
	return (
		<div className="no-chat-container">
			<div className="no-chat-content">
				<p>Welcome 👋 {authUser.fullName} ❄</p>
				<p>Select a chat to start messaging</p>
				<TiMessages className="no-chat-icon" />
			</div>
		</div>
	);
};

export default MessageContainer;

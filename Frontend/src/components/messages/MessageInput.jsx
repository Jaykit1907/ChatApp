import { useEffect, useRef, useState } from "react";
import { BsSend } from "react-icons/bs";
import { GrEmoji } from "react-icons/gr";
import useSendMessage from "../../hooks/useSendMessage";
import EmojiPicker from "emoji-picker-react";
import useConversation from "../../zustand/useConversation";
import { useSocketContext } from "../../context/SocketContext";

const MessageInput = () => {
	const [message, setMessage] = useState("");
	const { loading, sendMessage } = useSendMessage();
	const [showEmojiPicker, setShowEmojiPicker] = useState(false);
	const { selectedConversation } = useConversation();
	const { socket } = useSocketContext();

	const typingTimeoutRef = useRef(null);

	const handleChange = (e) => {
		setMessage(e.target.value);

		// Emit typing event
		if (socket && selectedConversation) {
			socket.emit("typing", { to: selectedConversation._id });

			// Stop typing after 2 seconds of inactivity
			if (typingTimeoutRef.current) {
				clearTimeout(typingTimeoutRef.current);
			}
			typingTimeoutRef.current = setTimeout(() => {
				socket.emit("stopTyping", { to: selectedConversation._id });
			}, 2000);
		}
	};

	const handleSubmit = async (e) => {
		e.preventDefault();
		if (!message) return;
		await sendMessage(message);
		setMessage("");
		socket.emit("stopTyping", { to: selectedConversation._id }); // stop typing on send
	};

	const handleEmojiClick = (emojiData) => {
		setMessage((prevMessage) => prevMessage + emojiData.emoji);
	};

	return (
		<div className="relative">
			<form className="px-4 my-3" onSubmit={handleSubmit}>
				<div className="w-full relative flex items-center">
					<button type="button" className="text-white me-2" onClick={() => setShowEmojiPicker(!showEmojiPicker)}>
						<GrEmoji />
					</button>
					{showEmojiPicker && (
						<div className="absolute bottom-10 left-0">
							<EmojiPicker onEmojiClick={handleEmojiClick} />
						</div>
					)}

					<input
						type="text"
						className="border text-sm rounded-lg block w-full p-2.5 bg-gray-700 border-gray-600 text-white"
						placeholder="Send a message"
						value={message}
						onChange={handleChange}
					/>

					<button type="submit" className="absolute inset-y-0 end-0 flex items-center pe-3 text-white">
						{loading ? <div className="loading loading-spinner" /> : <BsSend />}
					</button>
				</div>
			</form>
		</div>
	);
};

export default MessageInput;

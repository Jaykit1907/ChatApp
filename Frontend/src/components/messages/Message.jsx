import { useAuthContext } from "../../context/AuthContext";
import { extractTime } from "../../utils/extractTime";
import useConversation from "../../zustand/useConversation";

const Message = ({ message }) => {
	const { authUser } = useAuthContext();
	const { selectedConversation } = useConversation();
	const fromMe = message.senderId === authUser._id;
	const formattedTime = extractTime(message.createdAt);
	const chatClassName = fromMe ? "chat-end" : "chat-start";
	const profilePic = fromMe ? authUser.profilePic : selectedConversation?.profilePic;
	const bubbleBgColor = fromMe ? "bg-blue-500" : "bg-gray-700";
	const shakeClass = message.shouldShake ? "shake" : "";

	// ✅ Prefer translatedMessage if available
	let messageContent = "";
	if (typeof message.translatedMessage === "string" && message.translatedMessage.trim()) {
		messageContent = message.translatedMessage; // show translated text
	} else if (typeof message.message === "string") {
		messageContent = message.message; // fallback to original
	} else if (typeof message.message === "object") {
		messageContent = JSON.stringify(message.message); // fallback
	} else {
		messageContent = String(message.message); // catch-all fallback
	}

	return (
		<div className={`chat ${chatClassName}`}>
			<div className="chat-image avatar">
				<div className="w-10 rounded-full">
					<img alt="Profile" src={profilePic} />
				</div>
			</div>
			<div className={`chat-bubble break-words text-white ${bubbleBgColor} ${shakeClass} pb-2`}>
				{messageContent}
			</div>
			<div className="chat-footer opacity-50 text-xs flex gap-1 items-center text-white">
				{formattedTime}
			</div>
		</div>
	);
};

export default Message;

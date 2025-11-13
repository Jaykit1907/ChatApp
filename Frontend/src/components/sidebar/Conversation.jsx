	import { useSocketContext } from "../../context/SocketContext";
	import useConversation from "../../zustand/useConversation";
	import "./Conversation.css";

	const Conversation = ({ contact, lastIdx, emoji }) => {
		const { selectedConversation, setSelectedConversation, typingUsers } = useConversation();

		const { onlineUsers } = useSocketContext();
		const isTyping = typingUsers[contact._id]; // ✅ now this works
		const isSelected = selectedConversation?._id === contact._id;
		const isOnline = onlineUsers.includes(contact._id);

		return (
			<>
				<div
					className={`flex gap-2 items-center hover:bg-sky-500 rounded p-2 py-1 cursor-pointer relative
					${isSelected ? "bg-sky-500" : ""}
				`}
					onClick={() => setSelectedConversation(contact)}
				>
					<div className={`avatar ${isOnline ? "online" : ""}`}>
						<div className='w-12 rounded-full'>
							<img src={contact.profilePic} alt='user avatar' />
						</div>
					</div>

					<div className='flex flex-col flex-1'>
						<div className='flex gap-3 justify-between'>
							<p className='font-bold text-gray-200'>{contact.fullName}</p>
						{isTyping && (
								<p className="typing-status">Typing...</p>
							)}


							<span className='text-xl'>{emoji}</span>
						</div>
					</div>
				</div>

				{!lastIdx && <div className='divider my-0 py-0 h-1' />}
			</>
		);
	};

	export default Conversation;

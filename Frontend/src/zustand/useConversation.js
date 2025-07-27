import { create } from "zustand";

const useConversation = create((set) => ({
	selectedConversation: null,
	setSelectedConversation: (selectedConversation) => set({ selectedConversation }),
	messages: [],
	setMessages: (updater) =>
	set((state) => ({
		messages: typeof updater === "function" ? updater(state.messages) : updater,
	})),
	typingUsers: {}, // ✅ Add this
	setTypingUsers: (userId, isTyping) =>
		set((state) => ({
			typingUsers: {
				...state.typingUsers,
				[userId]: isTyping,
			},
		})),

}));

export default useConversation;
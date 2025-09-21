import { useEffect, useRef, useState } from "react";
import { BsSend } from "react-icons/bs";
import { GrEmoji } from "react-icons/gr";
import { MdTranslate } from "react-icons/md";
import useSendMessage from "../../hooks/useSendMessage";
import EmojiPicker from "emoji-picker-react";
import useConversation from "../../zustand/useConversation";
import { useSocketContext } from "../../context/SocketContext";
import LanguageList from "./LanguageList";
import { toast } from "react-hot-toast";
import { LANGUAGE } from "../../Url";

const MessageInput = () => {
  const [message, setMessage] = useState("");
  const { loading, sendMessage } = useSendMessage();
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showLanguagePopup, setShowLanguagePopup] = useState(false);
  const [searchLang, setSearchLang] = useState("");

  const { selectedConversation } = useConversation();
  const { socket } = useSocketContext();
  const typingTimeoutRef = useRef(null);
  const langRef = useRef(null);

  // ✅ Load language from localStorage (fallback English)
  const getInitialLanguage = () => {
    const storedLang = localStorage.getItem("language");
    if (storedLang) {
      try {
        return JSON.parse(storedLang);
      } catch (error) {
        console.error("Error parsing language from localStorage:", error);
      }
    }
    return { code: "en", name: "English" }; // fallback default
  };

  const [selectedLanguage, setSelectedLanguage] = useState(getInitialLanguage);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (langRef.current && !langRef.current.contains(e.target)) {
        setShowLanguagePopup(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleChange = (e) => {
    setMessage(e.target.value);
    if (socket && selectedConversation) {
      socket.emit("typing", { to: selectedConversation._id });
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = setTimeout(() => {
        socket.emit("stopTyping", { to: selectedConversation._id });
      }, 2000);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!message) return;
    await sendMessage(message, selectedLanguage.code);
    setMessage("");
    if (socket && selectedConversation) {
      socket.emit("stopTyping", { to: selectedConversation._id });
    }
  };

  const handleEmojiClick = (emojiData) => {
    setMessage((prev) => prev + emojiData.emoji);
  };

  const handleLanguageSelect = async (lang) => {
    setSelectedLanguage(lang);
    setShowLanguagePopup(false);

    try {
      const user = JSON.parse(localStorage.getItem("chat-user"));
      if (!user?._id) throw new Error("User not found");

      const response = await fetch(LANGUAGE, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: user._id, language: lang.code }),
      });

      const data = await response.json();

      if (response.ok) {
        toast.success(data.message || `Language set to ${lang.name}`);
        localStorage.setItem("language", JSON.stringify(lang)); // ✅ save whole object
      } else {
        toast.error(data.error || "Failed to update language");
      }
    } catch (error) {
      console.error("Error sending language:", error);
      toast.error("Something went wrong");
    }
  };

  const filteredLanguages = LanguageList.filter((lang) =>
    lang.name.toLowerCase().includes(searchLang.toLowerCase())
  );

  return (
    <div className="relative flex items-center px-4 my-3">
      {/* Language icon + dropdown */}
      <div className="relative mr-2" ref={langRef}>
        <MdTranslate
          className="cursor-pointer text-white text-2xl hover:scale-125 transition-transform duration-200"
          onClick={() => setShowLanguagePopup(!showLanguagePopup)}
        />

        {showLanguagePopup && (
          <div className="absolute bottom-full mb-2 left-0 z-50 w-64 bg-gradient-to-br from-white to-gray-50 border border-gray-200 rounded-xl shadow-xl overflow-hidden animate-fadeIn">
            {/* Search bar */}
            <div className="sticky top-0 bg-white p-2 border-b border-gray-200 z-10">
              <input
                type="text"
                placeholder="🔍 Search language..."
                className="w-full px-3 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400"
                value={searchLang}
                onChange={(e) => setSearchLang(e.target.value)}
              />
            </div>

            {/* List */}
            <div className="max-h-64 overflow-y-auto custom-scrollbar">
              {filteredLanguages.length > 0 ? (
                filteredLanguages.map((lang) => (
                  <button
                    key={lang.code}
                    className={`flex items-center justify-between w-full px-4 py-2.5 text-sm transition-all duration-300 relative group rounded-md
                      ${
                        selectedLanguage.code === lang.code
                          ? "bg-gradient-to-r from-blue-500 to-indigo-500 text-white font-semibold shadow-md scale-[1.02]"
                          : "hover:bg-gray-100 text-gray-800"
                      }`}
                    onClick={() => handleLanguageSelect(lang)}
                  >
                    <span className="flex items-center gap-2">
                      <span className="w-6 h-6 flex items-center justify-center rounded-full bg-blue-100 text-blue-600 font-bold text-xs">
                        {lang.name.charAt(0)}
                      </span>
                      {lang.name}
                    </span>
                    {selectedLanguage.code === lang.code && (
                      <span className="text-white group-hover:scale-125 transition-transform duration-200">
                        ✔
                      </span>
                    )}
                  </button>
                ))
              ) : (
                <p className="text-gray-500 text-sm p-3">No results found</p>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Input + emoji + send */}
      <form className="flex flex-1 relative" onSubmit={handleSubmit}>
        {/* Emoji toggle */}
        <span
          className="absolute left-2 top-1/2 -translate-y-1/2 cursor-pointer text-white hover:scale-125 transition-transform"
          onClick={() => setShowEmojiPicker(!showEmojiPicker)}
        >
          <GrEmoji />
        </span>

        <input
          type="text"
          className="pl-10 border text-sm rounded-lg block w-full p-2.5 bg-gray-700 border-gray-600 text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500 outline-none"
          placeholder={`Message (${selectedLanguage.name})`}
          value={message}
          onChange={handleChange}
        />

        {/* Emoji Picker */}
        {showEmojiPicker && (
          <div className="absolute bottom-12 left-2 z-50 bg-white rounded-xl shadow-lg p-2 transform origin-bottom-left animate-scaleIn">
            <EmojiPicker onEmojiClick={handleEmojiClick} />
          </div>
        )}

        {/* Send button */}
        <button
          type="submit"
          className="absolute right-2 top-1/2 -translate-y-1/2 text-white hover:scale-125 transition-transform"
        >
          {loading ? <div className="loading loading-spinner" /> : <BsSend />}
        </button>
      </form>
    </div>
  );
};

export default MessageInput;

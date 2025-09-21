import { useRef, Fragment, useState, useEffect } from 'react';
import { Popover, PopoverButton, PopoverPanel, Transition } from '@headlessui/react';
import { FaSignOutAlt, FaUser, FaLink } from 'react-icons/fa';
import { X } from 'lucide-react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { fas } from '@fortawesome/free-solid-svg-icons';
import { library } from '@fortawesome/fontawesome-svg-core';
import toast from 'react-hot-toast';
import { Link } from 'react-router-dom';
import useLogout from "../../hooks/useLogout";
import useConversation from "../../zustand/useConversation";
import useGetConversations from "../../hooks/useGetConversations";

library.add(fas);

export default function ProfileDropdown({ children }) {
  const popoverRef = useRef(null);
  const [user, setUser] = useState({});
  const [chatLink, setChatLink] = useState(""); // store generated chat link
  const { logout, loading } = useLogout();
  const { setSelectedConversation } = useConversation();
  const { conversations } = useGetConversations();

  useEffect(() => {
    const userData = localStorage.getItem('chat-user');
    if (userData) {
      try {
        setUser(JSON.parse(userData));
      } catch (e) {
        console.error('Error parsing user from localStorage', e);
      }
    }
  }, []);

  // Generate shareable chat link
  const handleStartChat = async () => {
    try {
      const baseUrl =
        typeof window !== 'undefined'
          ? window.location.origin
          : process.env.REACT_APP_BASE_URL; // define if needed

      const link = `${baseUrl}/chat/${user._id}`; // chat route with user ID
      setChatLink(link);
      toast.success("Shareable chat link generated!");
    } catch (err) {
      console.error(err);
      toast.error("Failed to generate chat link.");
    }
  };

  const copyLinkToClipboard = () => {
    if (!chatLink) return;
    navigator.clipboard.writeText(chatLink)
      .then(() => toast.success("Chat link copied to clipboard!"))
      .catch(() => toast.error("Failed to copy link."));
  };

  return (
    <Popover className="relative">
      {({ open, close }) => (
        <>
          <PopoverButton className="flex items-center focus:outline-none hover:scale-103 transition hover:rotate-6">
            {children ? (
              children
            ) : user?.profileImage ? (
              <img
                src={user.profileImage}
                alt={user?.username ?? 'User'}
                className="w-10 h-10 rounded-full border border-gray-300 hover:ring-1 hover:ring-gray-600"
              />
            ) : (
              <div className="w-10 h-10 flex items-center justify-center rounded-full bg-[#1E88E5] text-white font-bold cursor-pointer">
                {(user?.username?.charAt(0) ?? 'U').toUpperCase()}
              </div>
            )}
          </PopoverButton>

          <Transition
            as={Fragment}
            enter="transition ease-out duration-200"
            enterFrom="opacity-0 translate-y-1"
            enterTo="opacity-100 translate-y-0"
            leave="transition ease-in duration-150"
            leaveFrom="opacity-100 translate-y-0"
            leaveTo="opacity-0 translate-y-1"
          >
            <PopoverPanel
              ref={popoverRef}
              className="absolute -right-10 md:right-0 top-12 z-10 mt-3 w-64 transform"
            >
              <div className="relative overflow-hidden rounded-lg shadow-lg ring-1 bg-white/90 ring-gray-300 ring-opacity-5 p-3">
                <button
                  onClick={() => close()}
                  className="absolute top-2 right-2 p-1 rounded-full text-gray-500 hover:bg-gray-100"
                >
                  <X size={16} />
                </button>

                <div className="mb-3 border-b pb-2">
                  <p className="text-sm font-medium text-gray-900">{user?.username ?? 'User'}</p>
                  <p className="text-xs text-gray-500">{user?.email ?? ''}</p>
                </div>

                <Link to="/profile" onClick={() => close()} className="no-underline">
                  <div className="flex cursor-pointer items-center rounded-md p-2 text-sm text-gray-700 hover:bg-gray-50">
                    <FaUser className="mr-2 text-gray-400" /> Profile
                  </div>
                </Link>

                <button
                  onClick={() => {
                    handleStartChat();
                  }}
                  className="flex w-full items-center rounded-md p-2 text-sm text-gray-700 hover:bg-gray-50"
                >
                  <FontAwesomeIcon icon={['fas', 'comments']} className="mr-2 text-gray-400 w-4 h-4" />
                  Start Chat
                </button>

                {/* Show chat link if generated */}
                {chatLink && (
                  <div className="mt-2 p-2 bg-gray-100 rounded flex items-center justify-between">
                    <span className="text-xs break-all">{chatLink}</span>
                    <button onClick={copyLinkToClipboard} className="ml-2 p-1 bg-blue-500 text-white rounded text-xs">Copy</button>
                  </div>
                )}

                <button
                  onClick={() => {
                    close();
                    logout();
                  }}
                  disabled={loading}
                  className={`flex w-full items-center rounded-md p-2 text-sm text-red-600 hover:bg-red-50 ${
                    loading ? 'opacity-50 cursor-not-allowed' : ''
                  }`}
                >
                  <FaSignOutAlt className="mr-2" /> {loading ? 'Signing Out...' : 'Sign Out'}
                </button>
              </div>
            </PopoverPanel>
          </Transition>
        </>
      )}
    </Popover>
  );
}

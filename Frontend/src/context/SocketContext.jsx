// src/context/SocketContext.jsx
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
  const [contactRefreshTrigger, setContactRefreshTrigger] = useState(0); // NEW
  const { authUser } = useAuthContext();
  const { setTypingUsers } = useConversation();

  useEffect(() => {
    if (authUser) {
      const socketInstance = io(BASE_URL, {
        transports: ["polling"],
        query: { userId: authUser._id },
      });

      setSocket(socketInstance);

      // Online users list
      socketInstance.on("getOnlineUsers", (users) => {
        setOnlineUsers(users);
      });

      // NEW: Listen for contactAdded events (when someone adds this user)
      socketInstance.on("contactAdded", (payload) => {
        console.log("contactAdded received:", payload);
        // bump trigger so consumers (hooks/components) can react
        setContactRefreshTrigger((t) => t + 1);
      });

      // Cleanup when authUser changes or component unmounts
      return () => {
        socketInstance.off("getOnlineUsers");
        socketInstance.off("contactAdded");
        socketInstance.close();
        setSocket(null);
      };
    } else {
      // If no authUser, close existing socket if present
      if (socket) {
        socket.close();
        setSocket(null);
      }
    }
  }, [authUser]); // re-run when authUser changes

  // Typing listeners (unchanged)
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
  }, [socket, setTypingUsers]);

  return (
    <SocketContext.Provider
      value={{ socket, onlineUsers, contactRefreshTrigger }}
    >
      {children}
    </SocketContext.Provider>
  );
};

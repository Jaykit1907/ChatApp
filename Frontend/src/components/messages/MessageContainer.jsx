import { useEffect, useState, useRef } from "react";
import useConversation from "../../zustand/useConversation";
import MessageInput from "./MessageInput";
import Messages from "./Messages";
import { TiMessages } from "react-icons/ti";
import { IoArrowBack } from "react-icons/io5";
import { FaPhone, FaVideo, FaPhoneSlash, FaPhoneAlt } from "react-icons/fa";
import { useAuthContext } from "../../context/AuthContext";
import { useSocketContext } from "../../context/SocketContext";
import "./MessageContainer.css";

// 🔥 Import ZEGOCLOUD directly for frontend
import { ZegoUIKitPrebuilt } from "@zegocloud/zego-uikit-prebuilt";

// 🔥 Import ringtone
import ringtone from "../../assets/sounds/ringtone.mp3";

const MessageContainer = ({ onBack }) => {
  const [user, setUser] = useState(null);
  const { selectedConversation } = useConversation();
  const { socket, onlineUsers } = useSocketContext();
  const [isTyping, setIsTyping] = useState(false);

  // Call states
  const [isCallActive, setIsCallActive] = useState(false);
  const [callType, setCallType] = useState(null);
  const [incomingCall, setIncomingCall] = useState(null);
  const [isCallInitiator, setIsCallInitiator] = useState(false);
  const [callStatus, setCallStatus] = useState("");

  // 🔥 New: Zego instance reference for cleanup
  const zegoInstance = useRef(null);

  // 🔥 New: Audio ref for ringtone
  const audioRef = useRef(null);

  const isSelectedUserOnline =
    selectedConversation && onlineUsers.includes(selectedConversation._id);
  const isLoggedUserOnline = user && onlineUsers.includes(user._id);

  const ZEGO_CONFIG = {
    appID: Number(import.meta.env.VITE_ZEGO_APP_ID),
    serverSecret: import.meta.env.VITE_ZEGO_SERVER_SECRET,
  };

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

  // Typing events
  useEffect(() => {
    if (!socket || !selectedConversation) return;

    const handleTyping = (senderId) => {
      if (senderId === selectedConversation._id) {
        setIsTyping(true);
      }
    };

    const handleStopTyping = (senderId) => {
      if (senderId === selectedConversation._id) {
        setIsTyping(false);
      }
    };

    socket.on("userTyping", handleTyping);
    socket.on("userStoppedTyping", handleStopTyping);

    return () => {
      socket.off("userTyping", handleTyping);
      socket.off("userStoppedTyping", handleStopTyping);
    };
  }, [socket, selectedConversation]);

  // 🔥 1. START CALL (Simplified)
  const startCall = async (type) => {
    if (!selectedConversation || !user) {
      alert("Please select a conversation first");
      return;
    }

    if (!isSelectedUserOnline) {
      alert("User is offline. Cannot start call.");
      return;
    }

    setCallType(type);
    setIsCallActive(true);
    setIsCallInitiator(true);
    setCallStatus("calling");

    // Notify the other user
    socket.emit("callUser", {
      userToCall: selectedConversation._id,
      callType: type,
      caller: user,
      roomID: `chat_${[user._id, selectedConversation._id].sort().join("_")}`,
    });

    // Set timeout for no answer
    setTimeout(() => {
      if (callStatus === "calling" && isCallInitiator) {
        endCall();
        alert("No answer from user");
      }
    }, 30000);
  };

  // 🔥 2. HANDLE INCOMING CALLS + RINGTONE
  useEffect(() => {
    if (!socket) return;

    const playRingtone = () => {
      if (audioRef.current) {
        const playPromise = audioRef.current.play();
        if (playPromise !== undefined) {
          playPromise.catch((error) => {
            console.warn("Autoplay blocked:", error);
          });
        }
      }
    };

    const stopRingtone = () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.currentTime = 0;
      }
    };

    const handleIncomingCall = (data) => {
      setIncomingCall(data);
      playRingtone();
    };

    const handleCallAccepted = (data) => {
      if (isCallInitiator && isCallActive) {
        setCallStatus("connected");
        stopRingtone();
      }
    };

    const handleCallRejected = (data) => {
      if (isCallInitiator) {
        endCall();
        stopRingtone();
        alert("Call was rejected");
      }
    };

    const handleCallEnded = (data) => {
      endCall();
      stopRingtone();
      if (!isCallInitiator) {
        alert("Call ended");
      }
    };

    socket.on("incomingCall", handleIncomingCall);
    socket.on("callAccepted", handleCallAccepted);
    socket.on("callRejected", handleCallRejected);
    socket.on("callEnded", handleCallEnded);

    return () => {
      socket.off("incomingCall", handleIncomingCall);
      socket.off("callAccepted", handleCallAccepted);
      socket.off("callRejected", handleCallRejected);
      socket.off("callEnded", handleCallEnded);
    };
  }, [socket, isCallInitiator, isCallActive]);

  // 🔥 3. ACCEPT CALL
  const acceptCall = () => {
    if (!incomingCall) return;

    setCallType(incomingCall.callType);
    setIsCallActive(true);
    setIsCallInitiator(false);
    setCallStatus("connected");
    setIncomingCall(null);

    // Stop ringtone
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }

    socket.emit("acceptCall", {
      callerId: incomingCall.caller._id,
      roomID: incomingCall.roomID,
    });
  };

  // 🔥 4. REJECT CALL
  const rejectCall = () => {
    if (!incomingCall) return;

    socket.emit("rejectCall", {
      callerId: incomingCall.caller._id,
    });

    // Stop ringtone
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }

    setIncomingCall(null);
  };

  // 🔥 5. END CALL (fixed with cleanup)
  const endCall = () => {
    setIsCallActive(false);
    setCallType(null);
    setIsCallInitiator(false);
    setCallStatus("");
    setIncomingCall(null);

    // ✅ Clean up Zego instance
    if (zegoInstance.current) {
      try {
        zegoInstance.current.destroy();
      } catch (e) {
        console.warn("Error destroying Zego instance:", e);
      }
      zegoInstance.current = null;
    }

    // Stop ringtone
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }

    if (selectedConversation) {
      socket.emit("endCall", {
        userToCall: selectedConversation._id,
      });
    }
  };

  // 🔥 6. SIMPLIFIED ZEGOCLOUD INITIALIZATION (Frontend only, fixed)
  const initializeCall = (element) => {
    if (!selectedConversation || !user || !isCallActive || !element) return;

    const roomID = incomingCall
      ? incomingCall.roomID
      : `chat_${[user._id, selectedConversation._id].sort().join("_")}`;

    try {
      // ✅ Clean up any previous Zego instance before starting new call
      if (zegoInstance.current) {
        zegoInstance.current.destroy();
        zegoInstance.current = null;
      }

      const kitToken = ZegoUIKitPrebuilt.generateKitTokenForTest(
        ZEGO_CONFIG.appID,
        ZEGO_CONFIG.serverSecret,
        roomID,
        user._id,
        user.username || "User"
      );

      const zp = ZegoUIKitPrebuilt.create(kitToken);
      zegoInstance.current = zp; // ✅ store instance

      zp.joinRoom({
        container: element,
        scenario: {
          mode: ZegoUIKitPrebuilt.OneONoneCall,
        },
        showPreJoinView: false,
        turnOnMicrophoneWhenJoining:
          callType === "audio" || callType === "video",
        turnOnCameraWhenJoining: callType === "video",
        onLeaveRoom: () => {
          console.log("User left the call");
          endCall();
        },
      });
    } catch (error) {
      console.error("Failed to initialize call:", error);
      alert("Failed to start call. Please try again.");
      endCall();
    }
  };

  return (
    <div className="blur-bg">
      {/* 🔥 Ringtone Audio */}
      <audio ref={audioRef} src={ringtone} loop />

      {/* INCOMING CALL NOTIFICATION */}
      {incomingCall && !isCallActive && (
        <div className="incoming-call-notification">
          <div className="notification-content">
            <div className="caller-info">
              <img
                src={incomingCall.caller.profilePic || "/default-avatar.png"}
                alt="Caller"
                className="caller-avatar"
              />
              <div className="caller-details">
                <h3>{incomingCall.caller.fullName}</h3>
                <p>Incoming {incomingCall.callType} call...</p>
              </div>
            </div>
            <div className="call-actions">
              <button
                className="accept-btn"
                onClick={acceptCall}
                title="Accept Call"
              >
                <FaPhoneAlt size={20} />
              </button>
              <button
                className="reject-btn"
                onClick={rejectCall}
                title="Reject Call"
              >
                <FaPhoneSlash size={20} />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CALLING STATUS MODAL */}
      {isCallActive && callStatus === "calling" && isCallInitiator && (
        <div className="calling-modal-overlay">
          <div className="calling-modal">
            <div className="calling-content">
              <div className="calling-spinner"></div>
              <h3>Calling {selectedConversation?.fullName}...</h3>
              <p>Waiting for user to answer</p>
              <button className="end-call-button" onClick={endCall}>
                <FaPhoneSlash size={16} />
                End Call
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ACTIVE CALL MODAL */}
      {isCallActive && callStatus === "connected" && (
        <div className="call-modal-overlay">
          <div className="call-modal">
            <div className="call-header">
              <span className="call-with">
                {callType === "video" ? "Video Call" : "Audio Call"} with{" "}
                {selectedConversation?.fullName}
              </span>
            </div>
            <div className="call-container">
              <div ref={initializeCall} style={{ width: "100%", height: "100%" }} />
            </div>
          </div>
        </div>
      )}

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
                <span
                  className={`chat-status ${
                    isSelectedUserOnline ? "online1" : "offline1"
                  }`}
                >
                  {isSelectedUserOnline ? "Online" : "Offline"}
                </span>
                {isTyping && (
                  <div className="typing-indicator">
                    {selectedConversation.fullName} is typing...
                  </div>
                )}
              </div>

              {/* Call Buttons */}
              <div className="call-buttons">
                {!isCallActive ? (
                  <>
                    <button
                      className="call-button audio-call"
                      onClick={() => startCall("audio")}
                      title="Audio Call"
                      disabled={!isSelectedUserOnline}
                    >
                      <FaPhone size={16} />
                    </button>
                    <button
                      className="call-button video-call"
                      onClick={() => startCall("video")}
                      title="Video Call"
                      disabled={!isSelectedUserOnline}
                    >
                      <FaVideo size={16} />
                    </button>
                  </>
                ) : (
                  <button className="call-button end-call" onClick={endCall}>
                    <FaPhoneSlash size={16} />
                  </button>
                )}
              </div>
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

import { useEffect, useRef, useState } from "react";
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import useConversation from "../../zustand/useConversation";
import MessageInput from "./MessageInput";
import Messages from "./Messages";
import { TiMessages } from "react-icons/ti";
import { IoArrowBack } from "react-icons/io5";
import { FaVideo, FaPhone, FaVolumeUp, FaVolumeMute } from "react-icons/fa";
import { useAuthContext } from "../../context/AuthContext";
import { useSocketContext } from "../../context/SocketContext";
import CallModal from "./CallModal";
import "./MessageContainer.css";

const MessageContainer = ({ onBack }) => {
    const [user, setUser] = useState(null);
    const { selectedConversation } = useConversation();
    const { socket, onlineUsers } = useSocketContext();
    const [isTyping, setIsTyping] = useState(false);
    
    // Call states
    const [callState, setCallState] = useState({
        isCalling: false,
        isReceivingCall: false,
        callType: null,
        caller: null,
        receiver: null,
        callId: null,
        status: 'idle'
    });
    const [localStream, setLocalStream] = useState(null);
    const [remoteStream, setRemoteStream] = useState(null);
    const [isMuted, setIsMuted] = useState(false);
    const [isVideoOff, setIsVideoOff] = useState(false);
    const [isSpeakerOn, setIsSpeakerOn] = useState(true); // Default to speaker ON

    const localVideoRef = useRef(null);
    const remoteVideoRef = useRef(null);
    const peerConnection = useRef(null);
    const callTimeoutRef = useRef(null);
    const audioContextRef = useRef(null);
    const gainNodeRef = useRef(null); // Store gain node separately

    const isSelectedUserOnline = selectedConversation && onlineUsers.includes(selectedConversation._id);

    // Get user from localStorage
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

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            if (callState.callId || callState.isCalling || callState.status === 'active') {
                endCallCleanup();
            }
            if (callTimeoutRef.current) {
                clearTimeout(callTimeoutRef.current);
            }
        };
    }, []);

    // Initialize WebRTC for calls
    const initializeWebRTC = async (callType) => {
        try {
            console.log("Starting WebRTC for", callType, "call");
            
            const stream = await navigator.mediaDevices.getUserMedia({
                video: callType === 'video',
                audio: true
            });
            
            setLocalStream(stream);
            if (localVideoRef.current) {
                localVideoRef.current.srcObject = stream;
            }

            const configuration = {
                iceServers: [
                    { urls: 'stun:stun.l.google.com:19302' },
                    { urls: 'stun:stun1.l.google.com:19302' }
                ]
            };

            peerConnection.current = new RTCPeerConnection(configuration);

            stream.getTracks().forEach(track => {
                peerConnection.current.addTrack(track, stream);
            });

            peerConnection.current.ontrack = (event) => {
                console.log("Received remote stream");
                const remoteStream = event.streams[0];
                setRemoteStream(remoteStream);
                if (remoteVideoRef.current) {
                    remoteVideoRef.current.srcObject = remoteStream;
                    
                    // Initialize audio with current speaker state
                    initializeAudioContext(remoteVideoRef.current);
                    
                    // Auto-play the audio
                    remoteVideoRef.current.play().catch(error => {
                        console.log("Auto-play prevented, user interaction required:", error);
                    });
                }
            };

            peerConnection.current.onconnectionstatechange = () => {
                console.log("Connection state:", peerConnection.current.connectionState);
                
                if (peerConnection.current.connectionState === 'disconnected' || 
                    peerConnection.current.connectionState === 'failed') {
                    console.log("Call disconnected automatically");
                    handleCallDisconnected();
                }
            };

            peerConnection.current.oniceconnectionstatechange = () => {
                console.log("ICE connection state:", peerConnection.current.iceConnectionState);
                
                if (peerConnection.current.iceConnectionState === 'disconnected' || 
                    peerConnection.current.iceConnectionState === 'failed') {
                    console.log("ICE connection failed");
                    handleCallDisconnected();
                }
            };

            peerConnection.current.onicecandidate = (event) => {
                if (event.candidate) {
                    socket.emit("webrtc-ice-candidate", {
                        to: selectedConversation._id,
                        candidate: event.candidate,
                        callId: callState.callId
                    });
                }
            };

        } catch (error) {
            console.error("Error accessing camera/microphone:", error);
            toast.error("Could not access camera/microphone");
            endCallCleanup();
        }
    };

    // Handle call disconnection
    const handleCallDisconnected = () => {
        console.log("🟡 Call disconnected automatically");
        if (callState.callId) {
            socket.emit("endCall", {
                callId: callState.callId,
                to: selectedConversation._id,
                from: user._id
            });
        }
        toast.info("Call disconnected");
        endCallCleanup();
    };

    // Initialize Audio Context for speaker control - FIXED VERSION
    const initializeAudioContext = (audioElement) => {
        try {
            // Create new audio context
            audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)();
            
            // Create gain node
            gainNodeRef.current = audioContextRef.current.createGain();
            
            // Create media element source
            const source = audioContextRef.current.createMediaElementSource(audioElement);
            
            // Connect: source → gain node → destination
            source.connect(gainNodeRef.current);
            gainNodeRef.current.connect(audioContextRef.current.destination);
            
            // Set initial volume based on speaker state
            gainNodeRef.current.gain.value = isSpeakerOn ? 1 : 0;
            
            console.log("✅ Audio context initialized. Speaker:", isSpeakerOn ? "ON" : "OFF");
            
        } catch (error) {
            console.log("❌ Audio context not supported, using fallback:", error);
            // Fallback to regular volume control
            audioElement.volume = isSpeakerOn ? 1 : 0;
        }
    };

    // Socket event handlers for calls
    useEffect(() => {
        if (!socket || !selectedConversation) return;

        const handleIncomingCall = (data) => {
            console.log("🔵 INCOMING CALL:", data);
            
            endCallCleanup();
            
            setCallState({
                isReceivingCall: true,
                isCalling: false,
                callType: data.callType,
                caller: data.from,
                receiver: data.to,
                callId: data.callId,
                status: 'incoming'
            });

            callTimeoutRef.current = setTimeout(() => {
                if (callState.status === 'incoming') {
                    rejectCall();
                    toast.info("Call missed");
                }
            }, 30000);
        };

        const handleCallAccepted = async (data) => {
            console.log("🟢 CALL ACCEPTED:", data);
            clearTimeout(callTimeoutRef.current);
            
            if (callState.status !== 'calling') {
                console.log("Not in calling state, ignoring call accepted");
                return;
            }
            
            setCallState(prev => ({ 
                ...prev, 
                isCalling: false, 
                status: 'active' 
            }));
            
            toast.success("Call connected");
            
            await initializeWebRTC(callState.callType);
            
            if (peerConnection.current) {
                try {
                    const offer = await peerConnection.current.createOffer();
                    await peerConnection.current.setLocalDescription(offer);
                    
                    socket.emit("webrtc-offer", {
                        to: selectedConversation._id,
                        offer: offer,
                        callId: callState.callId
                    });
                } catch (error) {
                    console.error("Error creating offer:", error);
                    toast.error("Call setup failed");
                    endCall();
                }
            }
        };

        const handleCallRejected = (data) => {
            console.log("🔴 CALL REJECTED:", data);
            clearTimeout(callTimeoutRef.current);
            toast.info(`Call ${data.reason || 'rejected'}`);
            endCallCleanup();
        };

        const handleCallEnded = (data) => {
            console.log("🔴 CALL ENDED BY OTHER USER:", data);
            clearTimeout(callTimeoutRef.current);
            
            const reason = data.reason || "Call ended";
            if (reason.includes("disconnected") || reason.includes("timeout")) {
                toast.info("User disconnected");
            } else {
                toast.info("Call ended");
            }
            
            endCallCleanup();
        };

        const handleCallEndedSelf = (data) => {
            console.log("🔴 CALL ENDED BY YOU:", data);
            clearTimeout(callTimeoutRef.current);
            toast.info("Call ended");
            endCallCleanup();
        };

        const handleWebRTCOffer = async (data) => {
            console.log("Received WebRTC offer");
            await initializeWebRTC(callState.callType);
            
            if (peerConnection.current) {
                try {
                    await peerConnection.current.setRemoteDescription(data.offer);
                    const answer = await peerConnection.current.createAnswer();
                    await peerConnection.current.setLocalDescription(answer);
                    
                    socket.emit("webrtc-answer", {
                        to: data.from,
                        answer: answer,
                        callId: data.callId
                    });
                } catch (error) {
                    console.error("Error handling offer:", error);
                    toast.error("Call setup failed");
                    endCall();
                }
            }
        };

        const handleWebRTCAnswer = async (data) => {
            console.log("Received WebRTC answer");
            if (peerConnection.current) {
                try {
                    await peerConnection.current.setRemoteDescription(data.answer);
                } catch (error) {
                    console.error("Error handling answer:", error);
                    toast.error("Call setup failed");
                    endCall();
                }
            }
        };

        const handleWebRTCIceCandidate = async (data) => {
            if (peerConnection.current && data.candidate) {
                try {
                    await peerConnection.current.addIceCandidate(data.candidate);
                } catch (error) {
                    console.error("Error adding ICE candidate:", error);
                }
            }
        };

        // Listen to socket events
        socket.on("incomingCall", handleIncomingCall);
        socket.on("callAccepted", handleCallAccepted);
        socket.on("callRejected", handleCallRejected);
        socket.on("callEnded", handleCallEnded);
        socket.on("callEndedSelf", handleCallEndedSelf);
        socket.on("webrtc-offer", handleWebRTCOffer);
        socket.on("webrtc-answer", handleWebRTCAnswer);
        socket.on("webrtc-ice-candidate", handleWebRTCIceCandidate);

        // Cleanup event listeners
        return () => {
            socket.off("incomingCall", handleIncomingCall);
            socket.off("callAccepted", handleCallAccepted);
            socket.off("callRejected", handleCallRejected);
            socket.off("callEnded", handleCallEnded);
            socket.off("callEndedSelf", handleCallEndedSelf);
            socket.off("webrtc-offer", handleWebRTCOffer);
            socket.off("webrtc-answer", handleWebRTCAnswer);
            socket.off("webrtc-ice-candidate", handleWebRTCIceCandidate);
            
            clearTimeout(callTimeoutRef.current);
        };
    }, [socket, selectedConversation, callState.callId, callState.callType, callState.status]);

    // Start a new call
    const initiateCall = (callType) => {
        if (!selectedConversation || !isSelectedUserOnline) {
            toast.error("User is offline");
            return;
        }

        const callData = {
            from: user._id,
            to: selectedConversation._id,
            callType: callType,
            callerName: user.fullName
        };

        const newCallId = `${user._id}-${selectedConversation._id}-${Date.now()}`;
        
        endCallCleanup();
        
        setCallState({
            isCalling: true,
            isReceivingCall: false,
            callType: callType,
            caller: user._id,
            receiver: selectedConversation._id,
            callId: newCallId,
            status: 'calling'
        });

        toast.info(`Starting ${callType} call...`);

        callTimeoutRef.current = setTimeout(() => {
            if (callState.status === 'calling') {
                console.log("Call timeout - no answer");
                socket.emit("callTimeout", {
                    callId: newCallId,
                    to: selectedConversation._id
                });
                toast.info("No answer from user");
                endCallCleanup();
            }
        }, 30000);

        socket.emit("initiateCall", callData);
    };

    // Accept incoming call
    const acceptCall = async () => {
        console.log("🟢 ACCEPTING CALL");
        clearTimeout(callTimeoutRef.current);
        
        socket.emit("acceptCall", {
            callId: callState.callId,
            to: callState.caller,
            from: user._id
        });
        
        setCallState(prev => ({ 
            ...prev, 
            isReceivingCall: false, 
            status: 'active' 
        }));
        
        toast.success("Call accepted");
        
        await initializeWebRTC(callState.callType);
    };

    // Reject incoming call
    const rejectCall = () => {
        console.log("🔴 REJECTING CALL");
        clearTimeout(callTimeoutRef.current);
        
        socket.emit("rejectCall", {
            callId: callState.callId,
            to: callState.caller,
            from: user._id,
            reason: "User rejected the call"
        });
        
        toast.info("Call rejected");
        endCallCleanup();
    };

    // End ongoing call
    const endCall = () => {
        console.log("🟡 USER CLICKED END CALL");
        
        if (callState.callId) {
            console.log("🟡 Sending endCall to server with callId:", callState.callId);
            socket.emit("endCall", {
                callId: callState.callId,
                to: selectedConversation._id,
                from: user._id
            });
            
            toast.info("Ending call...");
        } else {
            console.log("🟡 No callId found, cleaning up locally");
            toast.info("Call ended");
            endCallCleanup();
        }
    };

    // Cleanup call resources
    const endCallCleanup = () => {
        console.log("🧹 CLEANING UP CALL");
        
        // Stop camera and microphone
        if (localStream) {
            localStream.getTracks().forEach(track => {
                track.stop();
            });
            setLocalStream(null);
        }
        
        // Close WebRTC connection
        if (peerConnection.current) {
            peerConnection.current.close();
            peerConnection.current = null;
        }

        // Close audio context
        if (audioContextRef.current) {
            audioContextRef.current.close();
            audioContextRef.current = null;
        }
        gainNodeRef.current = null;

        // Clear remote stream
        setRemoteStream(null);
        
        // Clear timeout
        clearTimeout(callTimeoutRef.current);

        // Reset call state completely
        setCallState({
            isCalling: false,
            isReceivingCall: false,
            callType: null,
            caller: null,
            receiver: null,
            callId: null,
            status: 'idle'
        });

        setIsMuted(false);
        setIsVideoOff(false);
        setIsSpeakerOn(true); // Reset to speaker ON for next call
    };

    // Toggle microphone mute
    const toggleMute = () => {
        if (localStream) {
            const audioTracks = localStream.getAudioTracks();
            audioTracks.forEach(track => {
                track.enabled = !track.enabled;
            });
            setIsMuted(!isMuted);
            toast.info(isMuted ? "Microphone on" : "Microphone muted");
        }
    };

    // Toggle camera on/off
    const toggleVideo = () => {
        if (localStream) {
            const videoTracks = localStream.getVideoTracks();
            videoTracks.forEach(track => {
                track.enabled = !track.enabled;
            });
            setIsVideoOff(!isVideoOff);
            toast.info(isVideoOff ? "Camera on" : "Camera off");
        }
    };

    // Toggle speaker on/off - FIXED VERSION
    const toggleSpeaker = () => {
        const newSpeakerState = !isSpeakerOn;
        console.log(`🔊 Toggling speaker: ${newSpeakerState ? 'ON' : 'OFF'}`);
        
        setIsSpeakerOn(newSpeakerState);
        
        try {
            // Use Web Audio API if available
            if (gainNodeRef.current) {
                gainNodeRef.current.gain.value = newSpeakerState ? 1 : 0;
                console.log("✅ Using Web Audio API for volume control");
            } 
            // Fallback to regular volume control
            else if (remoteVideoRef.current) {
                remoteVideoRef.current.volume = newSpeakerState ? 1 : 0;
                console.log("✅ Using regular volume control");
            }
            
            toast.info(newSpeakerState ? "Speaker on" : "Speaker off");
        } catch (error) {
            console.log("❌ Volume control error:", error);
            toast.info("Volume control not available");
        }
    };

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
                                
                                {isTyping && (
                                    <div className="typing-indicator">
                                        {selectedConversation.fullName} is typing...
                                    </div>
                                )}
                            </div>

                            {/* Call Buttons - Only show when no active call */}
                            {callState.status === 'idle' && (
                                <div className="call-buttons">
                                    <button 
                                        className="call-btn video-call"
                                        onClick={() => initiateCall('video')}
                                        disabled={!isSelectedUserOnline}
                                        title="Video Call"
                                    >
                                        <FaVideo size={18} />
                                    </button>
                                    <button 
                                        className="call-btn audio-call"
                                        onClick={() => initiateCall('audio')}
                                        disabled={!isSelectedUserOnline}
                                        title="Audio Call"
                                    >
                                        <FaPhone size={18} />
                                    </button>
                                </div>
                            )}

                            {/* Show call status when in call */}
                            {callState.status !== 'idle' && (
                                <div className="call-status-indicator">
                                    <span className={`call-status-${callState.status}`}>
                                        {callState.status === 'calling' && 'Calling...'}
                                        {callState.status === 'incoming' && 'Incoming Call'}
                                        {callState.status === 'active' && 'In Call'}
                                    </span>
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

                {/* Call Modal */}
                <CallModal 
                    callState={callState}
                    selectedConversation={selectedConversation}
                    onAcceptCall={acceptCall}
                    onRejectCall={rejectCall}
                    onEndCall={endCall}
                    localStream={localStream}
                    remoteStream={remoteStream}
                    isMuted={isMuted}
                    isVideoOff={isVideoOff}
                    isSpeakerOn={isSpeakerOn} // Pass the correct state
                    onToggleMute={toggleMute}
                    onToggleVideo={toggleVideo}
                    onToggleSpeaker={toggleSpeaker}
                    localVideoRef={localVideoRef}
                    remoteVideoRef={remoteVideoRef}
                />

                {/* React Toastify Container */}
                <ToastContainer
                    position="top-right"
                    autoClose={3000}
                    hideProgressBar={false}
                    newestOnTop={false}
                    closeOnClick
                    rtl={false}
                    pauseOnFocusLoss
                    draggable
                    pauseOnHover
                    theme="colored"
                />
            </div>
        </div>
    );
};

// No chat selected component
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
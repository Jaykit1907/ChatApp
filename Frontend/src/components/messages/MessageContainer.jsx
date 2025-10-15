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
    const [isSpeakerOn, setIsSpeakerOn] = useState(true);

    const localVideoRef = useRef(null);
    const remoteVideoRef = useRef(null);
    const peerConnection = useRef(null);
    const callTimeoutRef = useRef(null);

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

    // Initialize WebRTC for calls - SIMPLIFIED AND WORKING
    const initializeWebRTC = async (callType, isCaller = false) => {
        try {
            console.log("Initializing WebRTC for", callType, "call. Is caller:", isCaller);
            
            // Get user media
            const stream = await navigator.mediaDevices.getUserMedia({
                video: callType === 'video',
                audio: true
            });
            
            setLocalStream(stream);
            if (localVideoRef.current) {
                localVideoRef.current.srcObject = stream;
            }

            // Create peer connection with proper configuration
            const configuration = {
                iceServers: [
                    { urls: 'stun:stun.l.google.com:19302' },
                    { urls: 'stun:stun1.l.google.com:19302' }
                ]
            };

            peerConnection.current = new RTCPeerConnection(configuration);

            // Add local stream tracks
            stream.getTracks().forEach(track => {
                peerConnection.current.addTrack(track, stream);
            });

            // Handle remote stream
            peerConnection.current.ontrack = (event) => {
                console.log("Received remote track:", event.track.kind);
                const remoteStream = event.streams[0];
                setRemoteStream(remoteStream);
                if (remoteVideoRef.current) {
                    remoteVideoRef.current.srcObject = remoteStream;
                    // Auto-play the remote video
                    remoteVideoRef.current.play().catch(e => console.log("Remote play error:", e));
                }
            };

            // Handle ICE candidates
            peerConnection.current.onicecandidate = (event) => {
                if (event.candidate) {
                    socket.emit("webrtc-ice-candidate", {
                        to: selectedConversation._id,
                        candidate: event.candidate
                    });
                }
            };

            // Handle connection state
            peerConnection.current.onconnectionstatechange = () => {
                console.log("Connection state:", peerConnection.current.connectionState);
                if (peerConnection.current.connectionState === 'connected') {
                    console.log("✅ WebRTC connection established!");
                    toast.success("Call connected");
                }
            };

            // If caller, create offer
            if (isCaller) {
                const offer = await peerConnection.current.createOffer();
                await peerConnection.current.setLocalDescription(offer);
                socket.emit("webrtc-offer", {
                    to: selectedConversation._id,
                    offer: offer
                });
            }

        } catch (error) {
            console.error("Error in WebRTC initialization:", error);
            toast.error("Failed to start call");
            endCallCleanup();
        }
    };

    // Socket event handlers
    useEffect(() => {
        if (!socket || !selectedConversation) return;

        const handleIncomingCall = (data) => {
            console.log("Incoming call:", data);
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
                }
            }, 30000);
        };

        const handleCallAccepted = async (data) => {
            console.log("Call accepted");
            clearTimeout(callTimeoutRef.current);
            setCallState(prev => ({ ...prev, isCalling: false, status: 'active' }));
            await initializeWebRTC(callState.callType, true);
        };

        const handleCallRejected = (data) => {
            console.log("Call rejected");
            clearTimeout(callTimeoutRef.current);
            toast.info("Call rejected");
            endCallCleanup();
        };

        const handleCallEnded = (data) => {
            console.log("Call ended");
            clearTimeout(callTimeoutRef.current);
            toast.info("Call ended");
            endCallCleanup();
        };

        // WebRTC signaling handlers
        const handleWebRTCOffer = async (data) => {
            console.log("Received WebRTC offer");
            await initializeWebRTC(callState.callType, false);
            
            if (peerConnection.current) {
                await peerConnection.current.setRemoteDescription(data.offer);
                const answer = await peerConnection.current.createAnswer();
                await peerConnection.current.setLocalDescription(answer);
                
                socket.emit("webrtc-answer", {
                    to: data.from,
                    answer: answer
                });
            }
        };

        const handleWebRTCAnswer = async (data) => {
            console.log("Received WebRTC answer");
            if (peerConnection.current) {
                await peerConnection.current.setRemoteDescription(data.answer);
            }
        };

        const handleWebRTCIceCandidate = async (data) => {
            if (peerConnection.current && data.candidate) {
                await peerConnection.current.addIceCandidate(data.candidate);
            }
        };

        // Event listeners
        socket.on("incomingCall", handleIncomingCall);
        socket.on("callAccepted", handleCallAccepted);
        socket.on("callRejected", handleCallRejected);
        socket.on("callEnded", handleCallEnded);
        socket.on("webrtc-offer", handleWebRTCOffer);
        socket.on("webrtc-answer", handleWebRTCAnswer);
        socket.on("webrtc-ice-candidate", handleWebRTCIceCandidate);

        return () => {
            socket.off("incomingCall", handleIncomingCall);
            socket.off("callAccepted", handleCallAccepted);
            socket.off("callRejected", handleCallRejected);
            socket.off("callEnded", handleCallEnded);
            socket.off("webrtc-offer", handleWebRTCOffer);
            socket.off("webrtc-answer", handleWebRTCAnswer);
            socket.off("webrtc-ice-candidate", handleWebRTCIceCandidate);
            clearTimeout(callTimeoutRef.current);
        };
    }, [socket, selectedConversation, callState]);

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

        socket.emit("initiateCall", callData);

        callTimeoutRef.current = setTimeout(() => {
            if (callState.status === 'calling') {
                toast.info("No answer from user");
                endCallCleanup();
            }
        }, 30000);
    };

    // Accept incoming call
    const acceptCall = async () => {
        console.log("Accepting call");
        clearTimeout(callTimeoutRef.current);
        
        socket.emit("acceptCall", {
            callId: callState.callId,
            to: callState.caller,
            from: user._id
        });
        
        setCallState(prev => ({ ...prev, isReceivingCall: false, status: 'active' }));
        await initializeWebRTC(callState.callType, false);
    };

    // Reject incoming call
    const rejectCall = () => {
        clearTimeout(callTimeoutRef.current);
        socket.emit("rejectCall", {
            callId: callState.callId,
            to: callState.caller,
            from: user._id,
            reason: "User rejected the call"
        });
        endCallCleanup();
    };

    // End call
    const endCall = () => {
        if (callState.callId) {
            socket.emit("endCall", {
                callId: callState.callId,
                to: selectedConversation._id,
                from: user._id
            });
        }
        endCallCleanup();
    };

    // Cleanup
    const endCallCleanup = () => {
        console.log("Cleaning up call");
        
        if (localStream) {
            localStream.getTracks().forEach(track => track.stop());
            setLocalStream(null);
        }
        
        if (peerConnection.current) {
            peerConnection.current.close();
            peerConnection.current = null;
        }

        setRemoteStream(null);
        clearTimeout(callTimeoutRef.current);

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
        setIsSpeakerOn(true);
    };

    // Toggle controls
    const toggleMute = () => {
        if (localStream) {
            const audioTracks = localStream.getAudioTracks();
            audioTracks.forEach(track => {
                track.enabled = !track.enabled;
            });
            setIsMuted(!isMuted);
        }
    };

    const toggleVideo = () => {
        if (localStream) {
            const videoTracks = localStream.getVideoTracks();
            videoTracks.forEach(track => {
                track.enabled = !track.enabled;
            });
            setIsVideoOff(!isVideoOff);
        }
    };

    const toggleSpeaker = () => {
        if (remoteVideoRef.current) {
            const newSpeakerState = !isSpeakerOn;
            setIsSpeakerOn(newSpeakerState);
            remoteVideoRef.current.volume = newSpeakerState ? 1 : 0;
        }
    };

    return (
        <div className="blur-bg">
            <div className="message-container">
                {!selectedConversation ? (
                    <NoChatSelected />
                ) : (
                    <div className="chat-panel">
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

                            {callState.status === 'idle' && (
                                <div className="call-buttons">
                                    <button 
                                        className="call-btn video-call"
                                        onClick={() => initiateCall('video')}
                                        disabled={!isSelectedUserOnline}
                                    >
                                        <FaVideo size={18} />
                                    </button>
                                    <button 
                                        className="call-btn audio-call"
                                        onClick={() => initiateCall('audio')}
                                        disabled={!isSelectedUserOnline}
                                    >
                                        <FaPhone size={18} />
                                    </button>
                                </div>
                            )}
                        </div>

                        <div className="messages">
                            <Messages />
                        </div>

                        <div className="message-input">
                            <MessageInput />
                        </div>
                    </div>
                )}

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
                    isSpeakerOn={isSpeakerOn}
                    onToggleMute={toggleMute}
                    onToggleVideo={toggleVideo}
                    onToggleSpeaker={toggleSpeaker}
                    localVideoRef={localVideoRef}
                    remoteVideoRef={remoteVideoRef}
                />

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
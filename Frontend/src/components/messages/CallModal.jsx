import { useEffect, useState } from "react";
import { 
    FaPhone, 
    FaVideo, 
    FaMicrophone, 
    FaMicrophoneSlash, 
    FaVideoSlash, 
    FaTimes, 
    FaUser, 
    FaPhoneSlash,
    FaVolumeUp,
    FaVolumeMute,
    FaExpand,
    FaCompress
} from "react-icons/fa";
import "./CallModal.css";

const CallModal = ({ 
    callState, 
    selectedConversation, 
    onAcceptCall, 
    onRejectCall, 
    onEndCall,
    localStream,
    remoteStream,
    isMuted,
    isVideoOff,
    isSpeakerOn,
    onToggleMute,
    onToggleVideo,
    onToggleSpeaker,
    localVideoRef,
    remoteVideoRef
}) => {
    const [callDuration, setCallDuration] = useState(0);
    const [timer, setTimer] = useState(null);
    const [isFullscreen, setIsFullscreen] = useState(false);

    // Timer for active calls
    useEffect(() => {
        if (callState.status === 'active') {
            const startTime = Date.now();
            const timerId = setInterval(() => {
                setCallDuration(Math.floor((Date.now() - startTime) / 1000));
            }, 1000);
            setTimer(timerId);
        } else {
            if (timer) {
                clearInterval(timer);
                setTimer(null);
            }
            setCallDuration(0);
        }

        return () => {
            if (timer) {
                clearInterval(timer);
            }
        };
    }, [callState.status]);

    // Handle fullscreen changes
    useEffect(() => {
        const handleFullscreenChange = () => {
            setIsFullscreen(!!document.fullscreenElement);
        };

        document.addEventListener('fullscreenchange', handleFullscreenChange);
        return () => {
            document.removeEventListener('fullscreenchange', handleFullscreenChange);
        };
    }, []);

    const formatTime = (seconds) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    };

    const toggleFullscreen = () => {
        if (!document.fullscreenElement) {
            document.documentElement.requestFullscreen().catch(err => {
                console.log(`Error attempting to enable fullscreen: ${err.message}`);
            });
        } else {
            document.exitFullscreen();
        }
    };

    // Render incoming call screen (WhatsApp style)
    const renderIncomingCall = () => (
        <div className="whatsapp-call-modal incoming-call">
            <div className="call-background"></div>
            
            <div className="call-content">
                {/* Caller Info */}
                <div className="caller-info-whatsapp">
                    <div className="caller-avatar-whatsapp">
                        {selectedConversation?.profilePic ? (
                            <img 
                                src={selectedConversation.profilePic} 
                                alt={selectedConversation.fullName}
                                className="avatar-image-whatsapp"
                                onError={(e) => {
                                    e.target.style.display = 'none';
                                    e.target.nextSibling.style.display = 'flex';
                                }}
                            />
                        ) : null}
                        <div className="avatar-placeholder-whatsapp">
                            <FaUser size={50} />
                        </div>
                    </div>
                    
                    <h2 className="caller-name-whatsapp">{selectedConversation?.fullName}</h2>
                    <p className="call-type-whatsapp">
                        {callState.callType === 'video' ? 'Video Call' : 'Voice Call'}
                    </p>
                    <p className="call-status-whatsapp">Incoming call...</p>
                </div>

                {/* Call Controls */}
                <div className="call-controls-whatsapp">
                    <button 
                        className="call-btn-whatsapp reject-btn"
                        onClick={onRejectCall}
                        title="Decline"
                    >
                        <div className="btn-circle reject">
                            <FaPhoneSlash size={24} />
                        </div>
                        <span className="btn-label">Decline</span>
                    </button>
                    
                    <button 
                        className="call-btn-whatsapp accept-btn"
                        onClick={onAcceptCall}
                        title="Accept"
                    >
                        <div className="btn-circle accept">
                            {callState.callType === 'video' ? <FaVideo size={20} /> : <FaPhone size={20} />}
                        </div>
                        <span className="btn-label">Accept</span>
                    </button>
                </div>
            </div>
        </div>
    );

    // Render outgoing call screen
    const renderOutgoingCall = () => (
        <div className="whatsapp-call-modal outgoing-call">
            <div className="call-background"></div>
            
            <div className="call-content">
                <div className="caller-info-whatsapp">
                    <div className="caller-avatar-whatsapp">
                        {selectedConversation?.profilePic ? (
                            <img 
                                src={selectedConversation.profilePic} 
                                alt={selectedConversation.fullName}
                                className="avatar-image-whatsapp"
                                onError={(e) => {
                                    e.target.style.display = 'none';
                                    e.target.nextSibling.style.display = 'flex';
                                }}
                            />
                        ) : null}
                        <div className="avatar-placeholder-whatsapp">
                            <FaUser size={50} />
                        </div>
                    </div>
                    
                    <h2 className="caller-name-whatsapp">{selectedConversation?.fullName}</h2>
                    <p className="call-type-whatsapp">
                        {callState.callType === 'video' ? 'Video Call' : 'Voice Call'}
                    </p>
                    <p className="call-status-whatsapp">Calling...</p>
                </div>

                <div className="call-controls-whatsapp">
                    <button 
                        className="call-btn-whatsapp cancel-btn"
                        onClick={onEndCall}
                        title="Cancel"
                    >
                        <div className="btn-circle cancel">
                            <FaTimes size={24} />
                        </div>
                        <span className="btn-label">Cancel</span>
                    </button>
                </div>
            </div>
        </div>
    );

    // Render active video call
    const renderActiveVideoCall = () => (
        <div className={`whatsapp-call-modal active-call ${isFullscreen ? 'fullscreen' : ''}`}>
            {/* Remote Video (Main) */}
            <div className="video-container">
                <div className="remote-video-container">
                    {remoteStream ? (
                        <video 
                            ref={remoteVideoRef}
                            autoPlay 
                            playsInline 
                            muted={false}
                            className="remote-video"
                        />
                    ) : (
                        <div className="no-video-overlay">
                            <div className="user-avatar-large">
                                {selectedConversation?.profilePic ? (
                                    <img 
                                        src={selectedConversation.profilePic} 
                                        alt={selectedConversation.fullName}
                                        className="avatar-image-large"
                                        onError={(e) => {
                                            e.target.style.display = 'none';
                                            e.target.nextSibling.style.display = 'flex';
                                        }}
                                    />
                                ) : null}
                                <div className="avatar-placeholder-large">
                                    <FaUser size={60} />
                                </div>
                            </div>
                            <h3>{selectedConversation?.fullName}</h3>
                            <p>Connecting...</p>
                        </div>
                    )}
                </div>

                {/* Local Video (Picture-in-picture) */}
                {localStream && (
                    <div className="local-video-pip">
                        <video 
                            ref={localVideoRef}
                            autoPlay 
                            playsInline 
                            muted 
                            className="local-video"
                        />
                        {isVideoOff && (
                            <div className="video-off-indicator">
                                <FaVideoSlash size={16} />
                                <span>Your camera is off</span>
                            </div>
                        )}
                    </div>
                )}

                {/* Call Info Overlay */}
                <div className="call-info-overlay">
                    <div className="caller-info-mini">
                        <h3 className="caller-name-mini">{selectedConversation?.fullName}</h3>
                        <p className="call-duration-mini">{formatTime(callDuration)}</p>
                    </div>
                    
                    <button 
                        className="fullscreen-btn"
                        onClick={toggleFullscreen}
                        title={isFullscreen ? "Exit fullscreen" : "Enter fullscreen"}
                    >
                        {isFullscreen ? <FaCompress size={16} /> : <FaExpand size={16} />}
                    </button>
                </div>
            </div>

            {/* Call Controls */}
            <div className="call-controls-bottom">
                <button 
                    className={`control-btn-bottom ${isMuted ? 'active' : ''}`}
                    onClick={onToggleMute}
                    title={isMuted ? "Unmute" : "Mute"}
                >
                    <div className="btn-circle-control">
                        {isMuted ? <FaMicrophoneSlash size={18} /> : <FaMicrophone size={18} />}
                    </div>
                    <span className="control-label">{isMuted ? "Unmute" : "Mute"}</span>
                </button>

                <button 
                    className={`control-btn-bottom ${isVideoOff ? 'active' : ''}`}
                    onClick={onToggleVideo}
                    title={isVideoOff ? "Turn on camera" : "Turn off camera"}
                >
                    <div className="btn-circle-control">
                        {isVideoOff ? <FaVideoSlash size={18} /> : <FaVideo size={18} />}
                    </div>
                    <span className="control-label">{isVideoOff ? "Camera on" : "Camera off"}</span>
                </button>

                <button 
                    className={`control-btn-bottom ${!isSpeakerOn ? 'active' : ''}`}
                    onClick={onToggleSpeaker}
                    title={isSpeakerOn ? "Speaker off" : "Speaker on"}
                >
                    <div className="btn-circle-control">
                        {isSpeakerOn ? <FaVolumeUp size={18} /> : <FaVolumeMute size={18} />}
                    </div>
                    <span className="control-label">{isSpeakerOn ? "Speaker" : "Muted"}</span>
                </button>

                <button 
                    className="control-btn-bottom end-call-btn"
                    onClick={onEndCall}
                    title="End Call"
                >
                    <div className="btn-circle-control end-call">
                        <FaPhoneSlash size={18} />
                    </div>
                    <span className="control-label">End Call</span>
                </button>
            </div>
        </div>
    );

    // Render active audio call
    const renderActiveAudioCall = () => (
        <div className="whatsapp-call-modal audio-call">
            <div className="call-background"></div>
            
            <div className="call-content">
                <div className="caller-info-whatsapp">
                    <div className="caller-avatar-whatsapp large">
                        {selectedConversation?.profilePic ? (
                            <img 
                                src={selectedConversation.profilePic} 
                                alt={selectedConversation.fullName}
                                className="avatar-image-whatsapp"
                                onError={(e) => {
                                    e.target.style.display = 'none';
                                    e.target.nextSibling.style.display = 'flex';
                                }}
                            />
                        ) : null}
                        <div className="avatar-placeholder-whatsapp">
                            <FaUser size={60} />
                        </div>
                    </div>
                    
                    <h2 className="caller-name-whatsapp">{selectedConversation?.fullName}</h2>
                    <p className="call-duration-audio">{formatTime(callDuration)}</p>
                    <p className="call-status-audio">
                        {remoteStream ? 'Voice call' : 'Connecting...'}
                    </p>
                </div>

                {/* Audio Call Controls */}
                <div className="audio-call-controls">
                    <button 
                        className={`control-btn-audio ${isMuted ? 'active' : ''}`}
                        onClick={onToggleMute}
                        title={isMuted ? "Unmute" : "Mute"}
                    >
                        <div className="btn-circle-audio">
                            {isMuted ? <FaMicrophoneSlash size={18} /> : <FaMicrophone size={18} />}
                        </div>
                        <span className="control-label">{isMuted ? "Unmute" : "Mute"}</span>
                    </button>

                    <button 
                        className={`control-btn-audio ${!isSpeakerOn ? 'active' : ''}`}
                        onClick={onToggleSpeaker}
                        title={isSpeakerOn ? "Speaker off" : "Speaker on"}
                    >
                        <div className="btn-circle-audio">
                            {isSpeakerOn ? <FaVolumeUp size={18} /> : <FaVolumeMute size={18} />}
                        </div>
                        <span className="control-label">{isSpeakerOn ? "Speaker" : "Muted"}</span>
                    </button>

                    <button 
                        className="control-btn-audio end-call-audio"
                        onClick={onEndCall}
                        title="End Call"
                    >
                        <div className="btn-circle-audio end-call">
                            <FaPhoneSlash size={18} />
                        </div>
                        <span className="control-label">End Call</span>
                    </button>
                </div>
            </div>
        </div>
    );

    // Don't render if no active call
    if (!callState.isCalling && !callState.isReceivingCall && callState.status !== 'active') {
        return null;
    }

    return (
        <div className="whatsapp-call-overlay">
            {callState.isReceivingCall && renderIncomingCall()}
            {callState.isCalling && callState.status !== 'active' && renderOutgoingCall()}
            {callState.status === 'active' && callState.callType === 'video' && renderActiveVideoCall()}
            {callState.status === 'active' && callState.callType === 'audio' && renderActiveAudioCall()}
        </div>
    );
};

export default CallModal;
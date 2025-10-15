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
    FaVolumeMute
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

    const formatTime = (seconds) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    };

    // Render different states
    const renderIncomingCall = () => (
        <div className="call-modal incoming-call">
            <div className="call-modal-header">
                <h2>Incoming {callState.callType} Call</h2>
            </div>
            
            <div className="caller-info">
                <div className="caller-avatar">
                    {selectedConversation?.profilePic ? (
                        <img 
                            src={selectedConversation.profilePic} 
                            alt={selectedConversation.fullName}
                            className="avatar-image"
                        />
                    ) : (
                        <div className="avatar-placeholder">
                            <FaUser size={40} />
                        </div>
                    )}
                </div>
                <h3 className="caller-name">{selectedConversation?.fullName}</h3>
                <p className="call-type">
                    {callState.callType === 'video' ? 'Video Call' : 'Audio Call'}
                </p>
            </div>

            <div className="call-modal-actions">
                <button 
                    className="call-btn accept-btn"
                    onClick={onAcceptCall}
                    title="Accept Call"
                >
                    {callState.callType === 'video' ? <FaVideo size={20} /> : <FaPhone size={20} />}
                </button>
                
                <button 
                    className="call-btn reject-btn"
                    onClick={onRejectCall}
                    title="Reject Call"
                >
                    <FaTimes size={24} />
                </button>
            </div>

            <div className="call-actions-label">
                <span>Accept</span>
                <span>Reject</span>
            </div>
        </div>
    );

    const renderOutgoingCall = () => (
        <div className="call-modal outgoing-call">
            <div className="call-modal-header">
                <h2>Calling...</h2>
            </div>
            
            <div className="caller-info">
                <div className="caller-avatar">
                    {selectedConversation?.profilePic ? (
                        <img 
                            src={selectedConversation.profilePic} 
                            alt={selectedConversation.fullName}
                            className="avatar-image"
                        />
                    ) : (
                        <div className="avatar-placeholder">
                            <FaUser size={40} />
                        </div>
                    )}
                </div>
                <h3 className="caller-name">{selectedConversation?.fullName}</h3>
                <p className="call-status">Ringing...</p>
            </div>

            <div className="call-modal-actions">
                <button 
                    className="call-btn cancel-btn"
                    onClick={onEndCall}
                    title="Cancel Call"
                >
                    <FaPhoneSlash size={20} />
                </button>
            </div>

            <div className="call-actions-label">
                <span>Cancel</span>
            </div>
        </div>
    );

    const renderActiveCall = () => (
        <div className={`call-modal active-call ${callState.callType}-call`}>
            {/* Video Streams */}
            <div className="video-streams">
                {/* Remote Video */}
                <div className="remote-stream">
                    {remoteStream ? (
                        <video 
                            ref={remoteVideoRef}
                            autoPlay 
                            playsInline 
                            muted={false}
                            className="video-element remote-video"
                        />
                    ) : (
                        <div className="no-video-placeholder">
                            <div className="user-avatar-large">
                                {selectedConversation?.profilePic ? (
                                    <img 
                                        src={selectedConversation.profilePic} 
                                        alt={selectedConversation.fullName}
                                        className="avatar-image-large"
                                    />
                                ) : (
                                    <div className="avatar-placeholder-large">
                                        <FaUser size={60} />
                                    </div>
                                )}
                            </div>
                            <h3>{selectedConversation?.fullName}</h3>
                            <p>Connecting...</p>
                        </div>
                    )}
                </div>

                {/* Local Video (for video calls) */}
                {callState.callType === 'video' && localStream && (
                    <div className="local-stream">
                        <video 
                            ref={localVideoRef}
                            autoPlay 
                            playsInline 
                            muted 
                            className="video-element local-video"
                        />
                        {isVideoOff && (
                            <div className="video-off-overlay">
                                <FaVideoSlash size={24} />
                                <span>Camera Off</span>
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Call Info */}
            <div className="call-info">
                <h3 className="caller-name-active">{selectedConversation?.fullName}</h3>
                <p className="call-duration">{formatTime(callDuration)}</p>
                <p className="call-status-active">
                    {callState.callType === 'video' ? 'Video Call' : 'Audio Call'} • 
                    {remoteStream ? ' Connected' : ' Connecting...'}
                </p>
            </div>

            {/* Call Controls */}
            <div className="call-controls-active">
                <button 
                    className={`control-btn ${isMuted ? 'active' : ''}`}
                    onClick={onToggleMute}
                    title={isMuted ? "Unmute" : "Mute"}
                >
                    {isMuted ? <FaMicrophoneSlash size={18} /> : <FaMicrophone size={18} />}
                    <span className="control-label">{isMuted ? "Unmute" : "Mute"}</span>
                </button>

                {callState.callType === 'video' && (
                    <button 
                        className={`control-btn ${isVideoOff ? 'active' : ''}`}
                        onClick={onToggleVideo}
                        title={isVideoOff ? "Turn on camera" : "Turn off camera"}
                    >
                        {isVideoOff ? <FaVideoSlash size={18} /> : <FaVideo size={18} />}
                        <span className="control-label">{isVideoOff ? "Camera On" : "Camera Off"}</span>
                    </button>
                )}

                {/* Speaker button for audio calls */}
                {callState.callType === 'audio' && (
                    <button 
                        className={`control-btn ${!isSpeakerOn ? 'active' : ''}`}
                        onClick={onToggleSpeaker}
                        title={isSpeakerOn ? "Turn off speaker" : "Turn on speaker"}
                    >
                        {isSpeakerOn ? <FaVolumeUp size={18} /> : <FaVolumeMute size={18} />}
                        <span className="control-label">{isSpeakerOn ? "Speaker" : "Muted"}</span>
                    </button>
                )}

                <button 
                    className="control-btn end-call-btn"
                    onClick={onEndCall}
                    title="End Call"
                >
                    <FaPhoneSlash size={18} />
                    <span className="control-label">End Call</span>
                </button>
            </div>
        </div>
    );

    const renderAudioCall = () => (
        <div className="call-modal audio-call-only">
            <div className="call-modal-header">
                <h2>Audio Call</h2>
            </div>
            
            <div className="caller-info">
                <div className="caller-avatar">
                    {selectedConversation?.profilePic ? (
                        <img 
                            src={selectedConversation.profilePic} 
                            alt={selectedConversation.fullName}
                            className="avatar-image"
                        />
                    ) : (
                        <div className="avatar-placeholder">
                            <FaUser size={40} />
                        </div>
                    )}
                </div>
                <h3 className="caller-name">{selectedConversation?.fullName}</h3>
                <p className="call-duration-audio">{formatTime(callDuration)}</p>
                <p className="call-status-audio">
                    {remoteStream ? 'Connected' : 'Connecting...'}
                </p>
            </div>

            <div className="call-controls-audio">
                <button 
                    className={`control-btn ${isMuted ? 'active' : ''}`}
                    onClick={onToggleMute}
                    title={isMuted ? "Unmute" : "Mute"}
                >
                    {isMuted ? <FaMicrophoneSlash size={18} /> : <FaMicrophone size={18} />}
                </button>

                {/* Speaker button for audio call */}
                <button 
                    className={`control-btn ${!isSpeakerOn ? 'active' : ''}`}
                    onClick={onToggleSpeaker}
                    title={isSpeakerOn ? "Turn off speaker" : "Turn on speaker"}
                >
                    {isSpeakerOn ? <FaVolumeUp size={18} /> : <FaVolumeMute size={18} />}
                </button>

                <button 
                    className="control-btn end-call-btn"
                    onClick={onEndCall}
                    title="End Call"
                >
                    <FaPhoneSlash size={18} />
                </button>
            </div>
        </div>
    );

    // Don't render if no active call state
    if (!callState.isCalling && !callState.isReceivingCall && callState.status !== 'active') {
        return null;
    }

    return (
        <div className="call-modal-overlay">
            {/* Render based on call state */}
            {callState.isReceivingCall && renderIncomingCall()}
            {callState.isCalling && callState.status !== 'active' && renderOutgoingCall()}
            {callState.status === 'active' && callState.callType === 'video' && renderActiveCall()}
            {callState.status === 'active' && callState.callType === 'audio' && renderAudioCall()}
        </div>
    );
};

export default CallModal;
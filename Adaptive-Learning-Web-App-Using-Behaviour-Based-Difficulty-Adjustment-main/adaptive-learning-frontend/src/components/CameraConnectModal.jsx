import React, { useState, useEffect } from 'react';
import './CameraConnectModal.css';

const CameraConnectModal = ({ 
  isOpen = false, 
  onConnect, 
  onCancel, 
  isLoading = false,
  error = null,
  retryCount = 0 
}) => {
  const [step, setStep] = useState(1);
  const [isChecking, setIsChecking] = useState(false);
  const [cameraStatus, setCameraStatus] = useState('unknown');

  // Check camera availability
  const checkCameraAvailability = async () => {
    setIsChecking(true);
    setCameraStatus('checking');
    
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      const videoDevices = devices.filter(device => device.kind === 'videoinput');
      
      if (videoDevices.length === 0) {
        setCameraStatus('unavailable');
      } else {
        setCameraStatus('available');
        setTimeout(() => setStep(2), 1000);
      }
    } catch (error) {
      setCameraStatus('error');
    } finally {
      setIsChecking(false);
    }
  };

  // Reset step when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      setStep(1);
      setCameraStatus('unknown');
      checkCameraAvailability();
    }
  }, [isOpen]);

  const handleConnect = () => {
    if (onConnect) {
      onConnect();
    }
  };

  const handleCancel = () => {
    if (onCancel) {
      onCancel();
    }
  };

  const handleRetry = () => {
    if (onConnect) {
      onConnect();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="camera-connect-modal-overlay">
      <div className="camera-connect-modal">
        <div className="modal-header">
          <h2 className="modal-title">
            {step === 1 ? 'Camera Setup' : 
             error ? 'Camera Connection Failed' : 
             'Connecting Camera...'}
          </h2>
          {!isLoading && (
            <button 
              className="close-button" 
              onClick={handleCancel}
              aria-label="Close modal"
            >
              ✕
            </button>
          )}
        </div>

        <div className="modal-content">
          {/* Step 1: Camera Check */}
          {step === 1 && !error && (
            <div className="step-content">
              <div className="camera-icon-container">
                <div className={`camera-icon ${cameraStatus}`}>
                  📷
                </div>
                {isChecking && (
                  <div className="checking-spinner"></div>
                )}
              </div>
              
              <h3>Checking Camera Availability</h3>
              
              {cameraStatus === 'checking' && (
                <p className="status-text">Checking for available cameras...</p>
              )}
              
              {cameraStatus === 'available' && (
                <p className="status-text success">Camera found! Ready to connect.</p>
              )}
              
              {cameraStatus === 'unavailable' && (
                <div className="error-content">
                  <p className="status-text error">
                    No camera detected. Please connect a camera and refresh.
                  </p>
                  <button 
                    className="retry-button"
                    onClick={checkCameraAvailability}
                    disabled={isChecking}
                  >
                    {isChecking ? 'Checking...' : 'Retry'}
                  </button>
                </div>
              )}
              
              {cameraStatus === 'error' && (
                <div className="error-content">
                  <p className="status-text error">
                    Unable to check camera status. Please ensure camera permissions are enabled.
                  </p>
                  <button 
                    className="retry-button"
                    onClick={checkCameraAvailability}
                    disabled={isChecking}
                  >
                    {isChecking ? 'Checking...' : 'Retry'}
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Step 2: Connecting */}
          {step === 2 && !error && (
            <div className="step-content">
              <div className="connecting-animation">
                <div className="camera-icon connecting">
                  📷
                </div>
                <div className="connection-waves">
                  <div className="wave"></div>
                  <div className="wave"></div>
                  <div className="wave"></div>
                </div>
              </div>
              
              <h3>Connecting to Camera</h3>
              <p className="status-text">
                Please allow camera access when prompted by your browser.
              </p>
              
              {isLoading && (
                <div className="loading-steps">
                  <div className="loading-step">
                    <div className="step-dot active"></div>
                    <span>Requesting camera permission...</span>
                  </div>
                  <div className="loading-step">
                    <div className={`step-dot ${isLoading ? 'active' : ''}`}></div>
                    <span>Initializing video stream...</span>
                  </div>
                  <div className="loading-step">
                    <div className={`step-dot ${isLoading ? 'active' : ''}`}></div>
                    <span>Configuring detection models...</span>
                  </div>
                </div>
              )}
              
              <button 
                className="connect-button"
                onClick={handleConnect}
                disabled={isLoading}
              >
                {isLoading ? 'Connecting...' : 'Connect Camera'}
              </button>
            </div>
          )}

          {/* Error State */}
          {error && (
            <div className="step-content error-state">
              <div className="error-icon">⚠️</div>
              <h3>Camera Connection Failed</h3>
              <p className="error-message">{error}</p>
              
              <div className="error-suggestions">
                <h4>Troubleshooting Tips:</h4>
                <ul>
                  <li>Ensure your camera is not being used by another application</li>
                  <li>Check if camera permissions are granted in your browser</li>
                  <li>Try refreshing the page and reconnecting</li>
                  <li>Use a different browser if the issue persists</li>
                </ul>
              </div>
              
              <div className="error-actions">
                <button 
                  className="retry-button"
                  onClick={handleRetry}
                  disabled={isLoading}
                >
                  {isLoading ? 'Retrying...' : 'Try Again'}
                </button>
                <button 
                  className="cancel-button"
                  onClick={handleCancel}
                  disabled={isLoading}
                >
                  Cancel
                </button>
              </div>
              
              {retryCount > 0 && (
                <p className="retry-count">
                  Retry attempt: {retryCount + 1}
                </p>
              )}
            </div>
          )}
        </div>

        <div className="modal-footer">
          <div className="security-notice">
            <span className="security-icon">🔒</span>
            <span className="security-text">
              Your camera is only used for exam proctoring and is not recorded
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CameraConnectModal;

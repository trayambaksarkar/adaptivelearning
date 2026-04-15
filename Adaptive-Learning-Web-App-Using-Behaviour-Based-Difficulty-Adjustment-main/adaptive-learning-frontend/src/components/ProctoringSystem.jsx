import React, { useState, useEffect, useCallback } from 'react';
import WebcamStream from './WebcamStream';
import ObjectDetectionOverlay from './ObjectDetectionOverlay';
import CameraConnectModal from './CameraConnectModal';
import useObjectDetection from '../hooks/useObjectDetection';
import './ProctoringSystem.css';

const ProctoringSystem = ({ 
  isActive = false, 
  onViolationDetected,
  onSystemReady,
  onSystemError,
  examId = null,
  userId = null 
}) => {
  const [showCameraModal, setShowCameraModal] = useState(false);
  const [cameraConnected, setCameraConnected] = useState(false);
  const [systemStatus, setSystemStatus] = useState('idle'); // idle, connecting, active, error
  const [retryCount, setRetryCount] = useState(0);
  const [cameraError, setCameraError] = useState(null);

  // Object detection hook
  const {
    isInitialized,
    isDetecting,
    detections,
    violations,
    error: detectionError,
    isLoading: detectionLoading,
    videoRef,
    canvasRef,
    initializeDetector,
    startDetection,
    stopDetection,
    cleanup,
    PROHIBITED_ITEMS,
    hasViolations,
    violationCount,
    highSeverityViolations
  } = useObjectDetection(isActive && cameraConnected);

  // Handle camera connection
  const handleCameraConnect = useCallback(async () => {
    setCameraError(null);
    setSystemStatus('connecting');
    
    try {
      console.log('🔗 Connecting camera for proctoring system...');
      // The WebcamStream component will handle the actual connection
      setCameraConnected(true);
      setSystemStatus('active');
      setShowCameraModal(false);
      
      if (onSystemReady) {
        onSystemReady();
      }
    } catch (error) {
      console.error('❌ Camera connection failed:', error);
      setCameraError(error.message || 'Failed to connect camera');
      setSystemStatus('error');
      setRetryCount(prev => prev + 1);
      
      if (onSystemError) {
        onSystemError(error);
      }
    }
  }, [onSystemReady, onSystemError]);

  // Handle camera connection error
  const handleCameraError = useCallback((error) => {
    console.error('❌ Camera error:', error);
    setCameraError(error.message || 'Camera access failed');
    setSystemStatus('error');
    setRetryCount(prev => prev + 1);
    
    if (onSystemError) {
      onSystemError(error);
    }
  }, [onSystemError]);

  // Handle camera cancel
  const handleCameraCancel = useCallback(() => {
    setShowCameraModal(false);
    setSystemStatus('idle');
    setCameraError(null);
    
    if (onSystemError) {
      onSystemError(new Error('Camera permission denied by user'));
    }
  }, [onSystemError]);

  // Handle video stream ready
  const handleVideoReady = useCallback((stream, videoElement) => {
    console.log('📹 Video stream ready, starting object detection...');
    
    // Start object detection
    if (isActive) {
      initializeDetector();
    }
  }, [isActive, initializeDetector]);

  // Start proctoring system
  const startProctoring = useCallback(() => {
    if (!cameraConnected) {
      setShowCameraModal(true);
      return;
    }
    
    setSystemStatus('active');
    startDetection();
  }, [cameraConnected, startDetection]);

  // Stop proctoring system
  const stopProctoring = useCallback(() => {
    console.log('⏹️ Stopping proctoring system...');
    setSystemStatus('idle');
    stopDetection();
  }, [stopDetection]);

  // Handle violations
  useEffect(() => {
    if (violations.length > 0 && onViolationDetected) {
      const latestViolation = violations[violations.length - 1];
      onViolationDetected(latestViolation);
    }
  }, [violations, onViolationDetected]);

  // Auto-start when active
  useEffect(() => {
    if (isActive && !cameraConnected && systemStatus === 'idle') {
      setShowCameraModal(true);
      setSystemStatus('connecting');
    } else if (isActive && cameraConnected && systemStatus !== 'active') {
      startProctoring();
    } else if (!isActive && systemStatus === 'active') {
      stopProctoring();
    }
  }, [isActive, cameraConnected, systemStatus, startProctoring, stopProctoring]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      cleanup();
    };
  }, [cleanup]);

  // Log violations to backend (in real app)
  useEffect(() => {
    if (violations.length > 0 && examId && userId) {
      const latestViolation = violations[violations.length - 1];
      
      // Log to backend
      fetch('http://localhost:5000/api/anti-cheat/log-event', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          eventType: 'OBJECT_DETECTION_VIOLATION',
          details: {
            violationType: latestViolation.type,
            objectLabel: latestViolation.label,
            confidence: latestViolation.confidence,
            examId,
            userId
          },
          timestamp: latestViolation.timestamp,
          violationCount: violations.length
        })
      }).catch(error => {
        console.error('Failed to log violation:', error);
      });
    }
  }, [violations, examId, userId]);

  const getStatusColor = () => {
    switch (systemStatus) {
      case 'active': return '#22c55e';
      case 'connecting': return '#3b82f6';
      case 'error': return '#ef4444';
      default: return '#6b7280';
    }
  };

  const getStatusText = () => {
    switch (systemStatus) {
      case 'active': return 'Proctoring Active';
      case 'connecting': return 'Connecting...';
      case 'error': return 'Connection Error';
      default: return 'System Idle';
    }
  };

  return (
    <div className="proctoring-system">
      {/* Camera Connect Modal */}
      <CameraConnectModal
        isOpen={showCameraModal}
        onConnect={handleCameraConnect}
        onCancel={handleCameraCancel}
        isLoading={systemStatus === 'connecting'}
        error={cameraError}
        retryCount={retryCount}
      />

      {/* Main Proctoring Interface */}
      <div className={`proctoring-interface ${systemStatus}`}>
        {/* Webcam Stream */}
        <div className="webcam-container">
          <WebcamStream
            isActive={isActive}
            onVideoRef={(ref) => { videoRef.current = ref; }}
            onStreamReady={handleVideoReady}
            onError={handleCameraError}
            showControls={systemStatus === 'active'}
          />
          
          {/* Object Detection Overlay */}
          <ObjectDetectionOverlay
            detections={detections}
            canvasRef={canvasRef}
            isActive={isDetecting}
            showLabels={true}
            showConfidence={true}
            animated={true}
          />
        </div>

        {/* Control Panel */}
        {systemStatus === 'active' && (
          <div className="control-panel">
            <div className="status-indicator">
              <div 
                className="status-dot" 
                style={{ backgroundColor: getStatusColor() }}
              ></div>
              <span className="status-text">{getStatusText()}</span>
            </div>

            <div className="detection-stats">
              <div className="stat-item">
                <span className="stat-label">Objects:</span>
                <span className="stat-value">{detections.length}</span>
              </div>
              <div className="stat-item">
                <span className="stat-label">Violations:</span>
                <span className={`stat-value ${hasViolations ? 'violation' : ''}`}>
                  {violationCount}
                </span>
              </div>
            </div>

            {hasViolations && (
              <div className="violation-alert">
                <span className="alert-icon">⚠️</span>
                <span className="alert-text">
                  {highSeverityViolations > 0 ? 'High severity violations detected!' : 'Violations detected'}
                </span>
              </div>
            )}
          </div>
        )}

        {/* Prohibited Items Legend */}
        {systemStatus === 'active' && (
          <div className="prohibited-items">
            <h4>Prohibited Items</h4>
            <div className="items-grid">
              {Object.entries(PROHIBITED_ITEMS).map(([item, config]) => (
                <div key={item} className="item-badge">
                  <span className={`severity-dot ${config.severity.toLowerCase()}`}></span>
                  <span className="item-label">{config.label}</span>
                  <span className="item-type">{config.type}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* System Messages */}
        {detectionError && (
          <div className="error-message">
            <span className="error-icon">❌</span>
            <span className="error-text">Detection system error: {detectionError}</span>
          </div>
        )}

        {detectionLoading && (
          <div className="loading-message">
            <div className="loading-spinner"></div>
            <span className="loading-text">Initializing detection models...</span>
          </div>
        )}
      </div>
    </div>
  );
};

export default ProctoringSystem;

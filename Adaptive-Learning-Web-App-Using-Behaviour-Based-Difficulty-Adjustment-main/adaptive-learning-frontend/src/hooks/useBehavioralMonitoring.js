import { useState, useEffect, useCallback, useRef } from 'react';
import { ObjectDetector, HandLandmarker, FilesetResolver } from '@mediapipe/tasks-vision';

const useBehavioralMonitoring = (isActive = false, externalWebcamRef = null) => {
  const [warning, setWarning] = useState(null);
  const [violationCount, setViolationCount] = useState(0);
  const [shouldTerminate, setShouldTerminate] = useState(false);
  const [isMonitoring, setIsMonitoring] = useState(false);
  const [modelsReady, setModelsReady] = useState(false);
  
  const internalWebcamRef = useRef(null);
  const objectDetectorRef = useRef(null);
  const handLandmarkerRef = useRef(null);
  const filesetResolverRef = useRef(null);
  const monitoringIntervalRef = useRef(null);
  const warningTimeoutRef = useRef(null);
  const isQuizCompleted = useRef(false);
  
  // Use external webcam ref if provided, otherwise use internal one
  const webcamRef = externalWebcamRef || internalWebcamRef;

  const clearWarning = useCallback(() => {
    if (warningTimeoutRef.current) {
      clearTimeout(warningTimeoutRef.current);
    }
    setWarning(null);
  }, []);

  const showWarning = useCallback((message) => {
    clearWarning();
    setWarning(message);
    warningTimeoutRef.current = setTimeout(() => {
      clearWarning();
    }, 3000);
  }, [clearWarning]);

  const logEvent = useCallback(async (eventType, details) => {
    try {
      await fetch('http://localhost:5000/api/anti-cheat/log-event', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          eventType,
          details,
          timestamp: new Date().toISOString(),
          violationCount: violationCount + 1
        })
      });
    } catch (error) {
      console.error('Failed to log behavioral event:', error);
    }
  }, [violationCount]);

  const handleViolation = useCallback((violationType) => {
    const newViolationCount = violationCount + 1;
    setViolationCount(newViolationCount);
    
    let message = '';
    switch (violationType) {
      case 'MULTIPLE_PEOPLE':
        message = '⚠️ Multiple people detected!';
        break;
      case 'PHONE_DETECTED':
        message = '⚠️ Phone detected!';
        break;
      case 'NOTEBOOK_DETECTED':
        message = '⚠️ Notebook detected!';
        break;
      case 'PAPER_DETECTED':
        message = '⚠️ Paper detected!';
        break;
      case 'HANDS_DETECTED':
        message = '⚠️ Hands detected!';
        break;
      default:
        message = '⚠️ Suspicious activity detected!';
    }
    
    showWarning(message);
    logEvent(violationType, { violationCount: newViolationCount });
    
    if (newViolationCount >= 3) {
      setShouldTerminate(true);
    }
  }, [violationCount, showWarning, logEvent]);

  // Initialize MediaPipe models
  const initializeModels = useCallback(async () => {
    try {
      console.log('🔧 Initializing MediaPipe models...');
      
      // Initialize FilesetResolver
      if (!filesetResolverRef.current) {
        filesetResolverRef.current = await FilesetResolver.forVisionTasks(
          'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.0/wasm'
        );
      }

      // Initialize Object Detector
      if (!objectDetectorRef.current) {
        objectDetectorRef.current = await ObjectDetector.createFromOptions(
          filesetResolverRef.current,
          {
            baseOptions: {
              modelAssetPath: 'https://storage.googleapis.com/mediapipe-models/object_detector/efficientdet_lite0/float16/1/efficientdet_lite0.tflite',
              delegate: 'GPU'
            },
            scoreThreshold: 0.5,
            categoryAllowlist: ['person', 'cell phone', 'book', 'notebook', 'paper']
          }
        );
        console.log('✅ Object detector ready');
      }

      // Initialize Hand Landmarker
      if (!handLandmarkerRef.current) {
        handLandmarkerRef.current = await HandLandmarker.createFromOptions(
          filesetResolverRef.current,
          {
            baseOptions: {
              modelAssetPath: 'https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.tflite',
              delegate: 'GPU'
            },
            runningMode: 'IMAGE',
            numHands: 2
          }
        );
        console.log('✅ Hand landmarker ready');
      }

      setModelsReady(true);
      console.log('🎯 All MediaPipe models initialized successfully');
    } catch (error) {
      console.error('❌ Failed to initialize MediaPipe models:', error);
      showWarning('⚠️ Behavioral monitoring initialization failed');
      setModelsReady(false);
    }
  }, [showWarning]);

  // Fresh detection logic using webcam stream
  const detectObjects = useCallback(() => {
    if (!webcamRef.current || !objectDetectorRef.current) {
      console.log('⏸️ Skipping detection - webcam or detector not ready');
      return;
    }

    const video = webcamRef.current.video;
    if (!video || video.readyState !== 4) {
      console.log('⏸️ Video not ready');
      return;
    }

    try {
      console.log('🔍 Starting detection...');

      // Create canvas from video frame
      const canvas = document.createElement('canvas');
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(video, 0, 0);

      // Convert to ImageData for MediaPipe
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);

      // Run object detection
      const results = objectDetectorRef.current.detect(imageData);
      const detections = results.detections || [];

      console.log(`📊 Found ${detections.length} objects`);

      // Process detections
      detections.forEach((detection, index) => {
        const categoryName = detection.categories[0]?.categoryName;
        const confidence = detection.categories[0]?.score;
        
        console.log(`  ${index + 1}. ${categoryName} (${(confidence * 100).toFixed(1)}%)`);

        // Check for violations
        if (confidence > 0.6) { // Only trigger on high confidence
          if (categoryName === 'person') {
            // Count people
            const peopleCount = detections.filter(d => 
              d.categories[0]?.categoryName === 'person'
            ).length;
            
            if (peopleCount > 1) {
              console.log(`🚨 VIOLATION: ${peopleCount} people detected!`);
              handleViolation('MULTIPLE_PEOPLE');
              return;
            }
          }
          
          if (categoryName === 'cell phone') {
            console.log('🚨 VIOLATION: Phone detected!');
            handleViolation('PHONE_DETECTED');
            return;
          }
          
          if (categoryName === 'book' || categoryName === 'notebook') {
            console.log('🚨 VIOLATION: Notebook detected!');
            handleViolation('NOTEBOOK_DETECTED');
            return;
          }
          
          if (categoryName === 'paper') {
            console.log('🚨 VIOLATION: Paper detected!');
            handleViolation('PAPER_DETECTED');
            return;
          }
        }
      });

      // Run hand detection
      if (handLandmarkerRef.current) {
        const handResults = handLandmarkerRef.current.detect(imageData);
        const handCount = handResults.landmarks ? handResults.landmarks.length : 0;
        
        console.log(`🤚 Found ${handCount} hands`);
        
        if (handCount > 0) {
          console.log('🚨 VIOLATION: Hands detected!');
          handleViolation('HANDS_DETECTED');
          return;
        }
      }

      console.log('✅ No violations detected');

    } catch (error) {
      console.error('❌ Detection error:', error);
    }
  }, [webcamRef, handleViolation]);

  // Start monitoring with fresh logic
  const startMonitoring = useCallback(async () => {
    if (!isActive || isMonitoring || isQuizCompleted.current) return;

    try {
      console.log('🚀 Starting fresh behavioral monitoring...');
      setIsMonitoring(true);
      
      // Initialize models
      await initializeModels();
      
      if (!modelsReady) {
        console.log('⏸️ Models not ready, monitoring paused');
        return;
      }

      // Wait for webcam, then start detection
      setTimeout(() => {
        if (isActive && !isQuizCompleted.current && modelsReady) {
          console.log('⏰ Starting detection interval...');
          
          // Run detection every 3 seconds
          monitoringIntervalRef.current = setInterval(() => {
            if (isActive && !isQuizCompleted.current && modelsReady) {
              detectObjects();
            }
          }, 3000);
          
          console.log('🎯 Fresh behavioral monitoring started!');
        }
      }, 2000);
      
    } catch (error) {
      console.error('❌ Failed to start monitoring:', error);
      setIsMonitoring(false);
    }
  }, [isActive, isMonitoring, initializeModels, modelsReady, detectObjects]);

  const stopMonitoring = useCallback(() => {
    console.log('🛑 Stopping behavioral monitoring...');
    setIsMonitoring(false);
    isQuizCompleted.current = true;
    setModelsReady(false);

    if (monitoringIntervalRef.current) {
      clearInterval(monitoringIntervalRef.current);
      monitoringIntervalRef.current = null;
    }

    // Clean up models
    if (objectDetectorRef.current) {
      try {
        objectDetectorRef.current.close();
      } catch (error) {
        console.log('Error closing object detector:', error);
      }
      objectDetectorRef.current = null;
    }

    if (handLandmarkerRef.current) {
      try {
        handLandmarkerRef.current.close();
      } catch (error) {
        console.log('Error closing hand landmarker:', error);
      }
      handLandmarkerRef.current = null;
    }

    if (filesetResolverRef.current) {
      filesetResolverRef.current = null;
    }

    clearWarning();
    setViolationCount(0);

    console.log('✅ Behavioral monitoring stopped');
  }, [clearWarning]);

  const markQuizCompleted = useCallback(() => {
    isQuizCompleted.current = true;
    console.log('📝 Quiz marked as completed');
  }, []);

  // Handle page navigation away from quiz
  useEffect(() => {
    if (!isActive) return;
    
    const handleBeforeUnload = (event) => {
      stopMonitoring();
    };
    
    const handlePageHide = (event) => {
      stopMonitoring();
    };
    
    window.addEventListener('beforeunload', handleBeforeUnload);
    window.addEventListener('pagehide', handlePageHide);
    
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      window.removeEventListener('pagehide', handlePageHide);
    };
  }, [isActive, stopMonitoring]);

  // Start/stop monitoring based on active state
  useEffect(() => {
    if (isActive) {
      startMonitoring();
    } else {
      stopMonitoring();
    }

    return () => {
      stopMonitoring();
    };
  }, [isActive, startMonitoring, stopMonitoring]);

  return {
    warning,
    violationCount,
    shouldTerminate,
    isMonitoring,
    modelsReady,
    clearWarning,
    stopMonitoring,
    markQuizCompleted,
    webcamRef
  };
};

export default useBehavioralMonitoring;

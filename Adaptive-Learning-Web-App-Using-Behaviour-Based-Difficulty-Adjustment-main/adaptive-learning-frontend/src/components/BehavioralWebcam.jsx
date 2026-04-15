import React from 'react';
import Webcam from 'react-webcam';
import './BehavioralWebcam.css';

const BehavioralWebcam = ({ webcamRef, isActive }) => {
  const videoConstraints = {
    width: 640,
    height: 480,
    facingMode: 'user',
  };

  if (!isActive) {
    return null;
  }

  return (
    <div className="behavioral-webcam-container">
      <Webcam
        ref={webcamRef}
        audio={false}
        videoConstraints={videoConstraints}
        screenshotFormat="image/jpeg"
        className="behavioral-webcam"
        mirrored={true}
      />
    </div>
  );
};

export default BehavioralWebcam;

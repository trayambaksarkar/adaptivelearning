import React from 'react';
import Webcam from 'react-webcam';
import './QuizWebcam.css';

const QuizWebcam = ({ webcamRef, isActive }) => {
  const videoConstraints = {
    width: 320,
    height: 240,
    facingMode: 'user',
  };

  if (!isActive) {
    return null;
  }

  return (
    <div className="quiz-webcam-container">
      <div className="quiz-webcam-wrapper">
        <Webcam
          ref={webcamRef}
          audio={false}
          videoConstraints={videoConstraints}
          screenshotFormat="image/jpeg"
          className="quiz-webcam"
          mirrored={true}
        />
        <div className="webcam-indicator">
          <div className="recording-dot"></div>
          <span>Monitoring</span>
        </div>
      </div>
    </div>
  );
};

export default QuizWebcam;

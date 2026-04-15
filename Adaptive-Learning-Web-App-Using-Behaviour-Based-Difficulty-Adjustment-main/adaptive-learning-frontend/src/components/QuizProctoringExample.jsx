import React, { useState } from 'react';
import ProctoringSystem from './ProctoringSystem';
import './QuizProctoringExample.css';

const QuizProctoringExample = () => {
  const [isExamActive, setIsExamActive] = useState(false);
  const [violations, setViolations] = useState([]);
  const [examData, setExamData] = useState({
    examId: 'exam_123',
    userId: 'user_456',
    subject: 'Mathematics',
    duration: 3600 // 1 hour in seconds
  });

  // Handle violation detection
  const handleViolationDetected = (violation) => {
    console.log('🚨 Violation detected:', violation);
    setViolations(prev => [...prev, violation]);
    
    // In a real app, you might:
    // - Show a warning to the user
    // - Log to backend
    // - Take disciplinary action after 3 violations
    // - Send notification to proctor
    
    if (violations.length >= 2) { // 3rd violation
      alert('Exam terminated due to multiple violations!');
      setIsExamActive(false);
    }
  };

  // Handle system ready
  const handleSystemReady = () => {
    console.log('✅ Proctoring system ready');
    // System is ready, can start exam
  };

  // Handle system error
  const handleSystemError = (error) => {
    console.error('❌ Proctoring system error:', error);
    // Handle error (show message, retry, etc.)
  };

  // Start exam
  const startExam = () => {
    setIsExamActive(true);
    console.log('🎯 Exam started with proctoring');
  };

  // Stop exam
  const stopExam = () => {
    setIsExamActive(false);
    console.log('⏹️ Exam stopped');
  };

  return (
    <div className="quiz-proctoring-example">
      <div className="exam-header">
        <h1>Online Examination System</h1>
        <div className="exam-info">
          <span className="subject-badge">{examData.subject}</span>
          <span className="duration-badge">
            {Math.floor(examData.duration / 60)} minutes
          </span>
        </div>
      </div>

      <div className="exam-controls">
        {!isExamActive ? (
          <button 
            className="start-exam-btn"
            onClick={startExam}
          >
            Start Exam with Proctoring
          </button>
        ) : (
          <button 
            className="stop-exam-btn"
            onClick={stopExam}
          >
            Stop Exam
          </button>
        )}
      </div>

      {/* Proctoring System */}
      <ProctoringSystem
        isActive={isExamActive}
        onViolationDetected={handleViolationDetected}
        onSystemReady={handleSystemReady}
        onSystemError={handleSystemError}
        examId={examData.examId}
        userId={examData.userId}
      />

      {/* Exam Content (when active) */}
      {isExamActive && (
        <div className="exam-content">
          <div className="question-panel">
            <h2>Question 1 of 10</h2>
            <div className="question-text">
              What is the derivative of x² + 3x + 2?
            </div>
            <div className="answer-options">
              <label className="option">
                <input type="radio" name="answer" value="a" />
                <span>2x + 3</span>
              </label>
              <label className="option">
                <input type="radio" name="answer" value="b" />
                <span>x² + 3</span>
              </label>
              <label className="option">
                <input type="radio" name="answer" value="c" />
                <span>2x + 2</span>
              </label>
              <label className="option">
                <input type="radio" name="answer" value="d" />
                <span>x + 3</span>
              </label>
            </div>
          </div>

          <div className="exam-sidebar">
            <div className="timer">
              <div className="timer-display">35:42</div>
              <div className="timer-label">Time Remaining</div>
            </div>

            <div className="violation-log">
              <h3>Proctoring Log</h3>
              {violations.length === 0 ? (
                <p className="no-violations">No violations detected</p>
              ) : (
                <div className="violation-list">
                  {violations.map((violation, index) => (
                    <div key={index} className="violation-item">
                      <span className="violation-time">
                        {new Date(violation.timestamp).toLocaleTimeString()}
                      </span>
                      <span className="violation-type">
                        {violation.label} detected
                      </span>
                      <span className="violation-confidence">
                        {(violation.confidence * 100).toFixed(1)}%
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="exam-progress">
              <div className="progress-bar">
                <div className="progress-fill" style={{ width: '10%' }}></div>
              </div>
              <span className="progress-text">1 / 10 questions</span>
            </div>
          </div>
        </div>
      )}

      {/* Violation Summary */}
      {violations.length > 0 && (
        <div className="violation-summary">
          <div className="summary-header">
            <span className="summary-title">Proctoring Summary</span>
            <span className="violation-count">
              {violations.length} violation{violations.length > 1 ? 's' : ''}
            </span>
          </div>
          <div className="summary-details">
            {violations.map((violation, index) => (
              <div key={index} className="summary-item">
                <span className="item-time">
                  {new Date(violation.timestamp).toLocaleTimeString()}
                </span>
                <span className="item-type">{violation.label}</span>
                <span className="item-severity severity-high">HIGH</span>
              </div>
            ))}
          </div>
          {violations.length >= 2 && (
            <div className="warning-message">
              ⚠️ Multiple violations detected. Exam may be terminated.
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default QuizProctoringExample;

import React from 'react';
import { Eye, X } from 'lucide-react';
import './BehavioralWarning.css';

const BehavioralWarning = ({ warning, onClear }) => {
  if (!warning) return null;

  return (
    <div className="behavioral-warning">
      <div className="behavioral-warning-content">
        <Eye size={20} className="warning-icon" />
        <span className="warning-text">{warning}</span>
        <button 
          className="warning-close"
          onClick={onClear}
          aria-label="Close warning"
        >
          <X size={16} />
        </button>
      </div>
    </div>
  );
};

export default BehavioralWarning;

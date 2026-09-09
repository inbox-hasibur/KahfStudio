"use client";

import React, { useId } from "react";

export interface SlidingToggleProps {
  id?: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
  className?: string;
}

export const SlidingToggle: React.FC<SlidingToggleProps> = ({
  id,
  checked,
  onChange,
  disabled = false,
  className = "",
}) => {
  const generatedId = useId();
  const inputId = id || generatedId;

  return (
    <div className={`relative inline-block select-none ${className} ${disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}>
      <style jsx>{`
        .sliding-switch {
          position: relative;
          width: 60px;
          height: 34px;
          display: inline-block;
        }
        .sliding-switch input[type="checkbox"] {
          position: absolute;
          opacity: 0;
          width: 0;
          height: 0;
          margin: 0;
        }
        .sliding-switch label {
          position: absolute;
          left: 0;
          right: 0;
          top: 0;
          bottom: 0;
          border-radius: 20px;
          background-color: #334155;
          cursor: pointer;
          transition: background-color 0.25s ease;
          box-shadow: inset 0 2px 4px rgba(0,0,0,0.25);
        }
        .sliding-switch input:checked + label {
          background-color: #00c73c;
          box-shadow: 0 0 12px rgba(0, 199, 60, 0.4), inset 0 1px 2px rgba(0,0,0,0.2);
        }
        .sliding-switch label::before,
        .sliding-switch label::after {
          position: absolute;
          top: 0;
          width: 32px;
          line-height: 34px;
          color: #ffffff;
          font-family: ui-monospace, monospace, sans-serif;
          font-weight: 700;
          user-select: none;
          text-align: center;
          transition: opacity 0.2s ease;
        }
        .sliding-switch label::before {
          left: 1px;
          font-size: 11px;
          content: 'ON';
          opacity: 0;
        }
        .sliding-switch label::after {
          right: 2px;
          font-size: 10px;
          content: 'OFF';
          opacity: 0.9;
          color: #94a3b8;
        }
        .sliding-switch input:checked + label::before {
          opacity: 1;
        }
        .sliding-switch input:checked + label::after {
          opacity: 0;
        }
        .sliding-switch label span {
          position: absolute;
          z-index: 2;
          width: 28px;
          height: 28px;
          top: 3px;
          left: 3px;
          border-radius: 50%;
          background-color: #ffffff;
          box-shadow: 0 2px 5px rgba(0,0,0,0.3);
          transition: transform 0.22s cubic-bezier(0.4, 0, 0.2, 1);
        }
        .sliding-switch input:checked + label span {
          transform: translateX(26px);
        }
      `}</style>

      <div className="sliding-switch">
        <input
          type="checkbox"
          id={inputId}
          checked={checked}
          disabled={disabled}
          onChange={(e) => onChange(e.target.checked)}
        />
        <label htmlFor={inputId}>
          <span></span>
        </label>
      </div>
    </div>
  );
};

export default SlidingToggle;

import { useEffect } from "react";

interface ToastProps {
  show: boolean;
  type?: "error" | "success" | "warning" | "info";
  message: string;
  onClose: () => void;
  duration?: number;
}

const Toast = ({ 
  show, 
  type = "error", 
  message, 
  onClose, 
  duration = 4000 
}: ToastProps) => {
  useEffect(() => {
    if (show && duration > 0) {
      const timer = setTimeout(onClose, duration);
      return () => clearTimeout(timer);
    }
  }, [show, duration, onClose]);

  if (!show) return null;

  const colors = {
    error: "#dc2626",
    success: "#16a34a",
    warning: "#d97706",
    info: "#2563eb",
  };

  const bgColors = {
    error: "#fef2f2",
    success: "#f0fdf4",
    warning: "#fffbeb",
    info: "#eff6ff",
  };

  const color = colors[type];
  const bgColor = bgColors[type];

  return (
    <div style={{
      position: "fixed",
      top: "24px",
      right: "24px",
      zIndex: 9999,
      display: "flex",
      alignItems: "center",
      gap: "10px",
      padding: "12px 16px",
      background: bgColor,
      border: `1px solid ${color}30`,
      borderRadius: "8px",
      fontSize: "14px",
      color: "#1a1a1a",
      boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
      animation: "slideIn 0.2s ease-out",
      maxWidth: "360px",
    }}>
      <span style={{ 
        width: "6px", 
        height: "6px", 
        borderRadius: "50%", 
        background: color,
        flexShrink: 0,
      }} />
      
      <span>{message}</span>
      
      <button
        onClick={onClose}
        style={{
          background: "none",
          border: "none",
          cursor: "pointer",
          padding: "2px",
          marginLeft: "4px",
          opacity: 0.4,
          transition: "opacity 0.15s",
          fontSize: "18px",
          lineHeight: 1,
          color: "#666",
        }}
        onMouseEnter={(e) => e.currentTarget.style.opacity = "0.8"}
        onMouseLeave={(e) => e.currentTarget.style.opacity = "0.4"}
      >
        ×
      </button>
      
      <style>{`
        @keyframes slideIn {
          from {
            opacity: 0;
            transform: translateX(20px);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }
      `}</style>
    </div>
  );
};

export default Toast;
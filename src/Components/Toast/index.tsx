import { useEffect, type CSSProperties } from "react";

interface ToastProps {
 show: boolean;
 type?: "error" | "success" | "warning" | "info";
 message: string;
 onClose: () => void;
 duration?: number;
}

const Toast = ({ show, type = "error", message, onClose, duration = 4000 }: ToastProps) => {
 useEffect(() => {
  if (show && duration > 0) {
   const timer = setTimeout(() => {
    onClose();
   }, duration);
   return () => clearTimeout(timer);
  }
 }, [show, duration, onClose]);

 if (!show) return null;

 const styles: Record<string, CSSProperties> = {
  container: {
   position: "fixed",
   top: "20px",
   right: "20px",
   zIndex: 9999,
   animation: "slideInRight 0.3s ease-out",
  },
  box: {
   display: "flex",
   alignItems: "center",
   gap: "12px",
   padding: "14px 18px",
   borderRadius: "8px",
   background: "white",
   boxShadow: "0 4px 12px rgba(0, 0, 0, 0.15)",
   minWidth: "300px",
   maxWidth: "400px",
   borderLeft: "4px solid",
  },
  icon: {
   flexShrink: 0,
  },
  content: {
   flex: 1,
  },
  message: {
   fontSize: "14px",
   color: "#1a1a1a",
   lineHeight: "1.4",
  },
  closeButton: {
   background: "none",
   border: "none",
   cursor: "pointer",
   padding: "4px",
   display: "flex",
   alignItems: "center",
   justifyContent: "center",
  },
 };

 const typeConfig = {
  error: {
   icon: (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#dc2626" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
     <circle cx="12" cy="12" r="10"/>
     <line x1="12" y1="8" x2="12" y2="12"/>
     <line x1="12" y1="16" x2="12.01" y2="16"/>
    </svg>
   ),
   border: "#dc2626",
  },
  success: {
   icon: (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
     <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
     <polyline points="22 4 12 14.01 9 11.01"/>
    </svg>
   ),
   border: "#16a34a",
  },
  warning: {
   icon: (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#d97706" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
     <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
     <line x1="12" y1="9" x2="12" y2="13"/>
     <line x1="12" y1="17" x2="12.01" y2="17"/>
    </svg>
   ),
   border: "#d97706",
  },
  info: {
   icon: (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
     <circle cx="12" cy="12" r="10"/>
     <line x1="12" y1="16" x2="12" y2="12"/>
     <line x1="12" y1="8" x2="12.01" y2="8"/>
    </svg>
   ),
   border: "#2563eb",
  },
 };

 const config = typeConfig[type];

 return (
  <div style={styles.container}>
   <div style={{...styles.box, borderLeftColor: config.border}}>
    <div style={styles.icon}>{config.icon}</div>
    <div style={styles.content}>
     <p style={styles.message}>{message}</p>
    </div>
    <button
     type="button"
     onClick={onClose}
     style={styles.closeButton}
    >
     <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#999" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="6" x2="6" y2="18"/>
      <line x1="6" y1="6" x2="18" y2="18"/>
     </svg>
    </button>
   </div>
  </div>
 );
};

export default Toast;

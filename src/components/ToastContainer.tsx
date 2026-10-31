import React, { useState, useEffect } from 'react';

export interface ToastItem {
  id: string;
  message: string;
}

type ToastListener = (toasts: ToastItem[]) => void;
let toastQueue: ToastItem[] = [];
const listeners = new Set<ToastListener>();

export const showToast = (message: string, duration = 3000): void => {
  const id = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
  toastQueue = [...toastQueue, { id, message }];
  listeners.forEach((listener) => listener(toastQueue));

  setTimeout(() => {
    toastQueue = toastQueue.filter((t) => t.id !== id);
    listeners.forEach((listener) => listener(toastQueue));
  }, duration);
};

export const ToastContainer: React.FC = () => {
  const [toasts, setToasts] = useState<ToastItem[]>(toastQueue);

  useEffect(() => {
    const listener: ToastListener = (newToasts) => setToasts(newToasts);
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  }, []);

  if (toasts.length === 0) return null;

  return (
    <div id="toast-container" className="toast-container">
      {toasts.map((toast) => (
        <div key={toast.id} className="toast toast-notification show">
          <span>{toast.message}</span>
        </div>
      ))}
    </div>
  );
};

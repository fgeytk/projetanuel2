import { useEffect } from 'react'

// Lightweight toast stack. `toasts` is an array of { id, icon, title, message, variant }.
export default function ToastStack({ toasts, onDismiss }) {
  useEffect(() => {
    if (toasts.length === 0) {
      return undefined
    }
    const timers = toasts.map((toast) =>
      setTimeout(() => onDismiss(toast.id), toast.duration ?? 5000),
    )
    return () => timers.forEach(clearTimeout)
  }, [toasts, onDismiss])

  if (toasts.length === 0) {
    return null
  }

  return (
    <div className="toast-stack" role="status" aria-live="polite">
      {toasts.map((toast) => (
        <div key={toast.id} className={`toast ${toast.variant === 'badge' ? 'toast--badge' : ''}`}>
          <span className="toast__icon">{toast.icon || '✨'}</span>
          <div>
            <strong>{toast.title}</strong>
            {toast.message && <span>{toast.message}</span>}
          </div>
        </div>
      ))}
    </div>
  )
}

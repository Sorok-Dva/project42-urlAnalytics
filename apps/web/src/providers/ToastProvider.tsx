import { createContext, PropsWithChildren, useCallback, useContext, useState } from 'react'
import { v4 as uuid } from 'uuid'

interface ToastMessage {
  id: string
  title: string
  description?: string
}

interface ToastContextValue {
  toasts: ToastMessage[]
  push: (toast: Omit<ToastMessage, 'id'>) => void
  dismiss: (id: string) => void
}

const ToastContext = createContext<ToastContextValue | undefined>(undefined)

export const ToastProvider = ({ children }: PropsWithChildren) => {
  const [toasts, setToasts] = useState<ToastMessage[]>([])

  const dismiss = useCallback((id: string) => {
    setToasts(current => current.filter(toast => toast.id !== id))
  }, [])

  const push = useCallback(
    (toast: Omit<ToastMessage, 'id'>) => {
      const id = uuid()
      setToasts(current => [...current, { id, ...toast }])

      setTimeout(() => {
        setToasts(current => current.filter(message => message.id !== id))
      }, 5000)
    },
    []
  )

  return (
    <ToastContext.Provider value={{ toasts, push, dismiss }}>
      {children}
      <div className="pointer-events-none fixed bottom-6 right-6 z-50 flex flex-col space-y-2">
        {toasts.map(toast => (
          <div
            key={toast.id}
            className="pointer-events-auto w-64 rounded-xl border border-accent/40 bg-slate-900/80 px-4 py-3 shadow-xl"
          >
            <div className="flex items-center justify-between text-sm font-medium text-slate-100">
              <span>{toast.title}</span>
              <button onClick={() => dismiss(toast.id)} className="text-xs text-muted">✕</button>
            </div>
            {toast.description && <p className="mt-1 text-xs text-muted">{toast.description}</p>}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}

export const useToast = () => {
  const context = useContext(ToastContext)
  if (!context) throw new Error('useToast must be used within ToastProvider')
  return context
}

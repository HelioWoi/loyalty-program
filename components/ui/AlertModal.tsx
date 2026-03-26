'use client'

import { useState, useEffect } from 'react'

interface AlertModalProps {
  isOpen: boolean
  onClose: () => void
  title: string
  message: string
  type?: 'warning' | 'error' | 'success' | 'info'
  confirmText?: string
  cancelText?: string
  onConfirm?: () => void
  showCancel?: boolean
}

export function AlertModal({
  isOpen,
  onClose,
  title,
  message,
  type = 'info',
  confirmText = 'OK',
  cancelText = 'Cancel',
  onConfirm,
  showCancel = false
}: AlertModalProps) {
  // Close on ESC key
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose()
      }
    }
    window.addEventListener('keydown', handleEsc)
    return () => window.removeEventListener('keydown', handleEsc)
  }, [isOpen, onClose])

  if (!isOpen) return null

  // Color scheme based on type
  const colors = {
    warning: {
      bg: 'bg-amber-50',
      border: 'border-amber-200',
      icon: 'text-amber-600',
      title: 'text-amber-900',
      message: 'text-amber-700',
      confirm: 'bg-amber-600 hover:bg-amber-700 text-white'
    },
    error: {
      bg: 'bg-red-50',
      border: 'border-red-200',
      icon: 'text-red-600',
      title: 'text-red-900',
      message: 'text-red-700',
      confirm: 'bg-red-600 hover:bg-red-700 text-white'
    },
    success: {
      bg: 'bg-green-50',
      border: 'border-green-200',
      icon: 'text-green-600',
      title: 'text-green-900',
      message: 'text-green-700',
      confirm: 'bg-green-600 hover:bg-green-700 text-white'
    },
    info: {
      bg: 'bg-blue-50',
      border: 'border-blue-200',
      icon: 'text-blue-600',
      title: 'text-blue-900',
      message: 'text-blue-700',
      confirm: 'bg-blue-600 hover:bg-blue-700 text-white'
    }
  }

  const scheme = colors[type]

  // Icon based on type
  const icons = {
    warning: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
      </svg>
    ),
    error: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
    success: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
    info: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    )
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className={`relative bg-white rounded-2xl shadow-2xl w-full max-w-md border-2 ${scheme.border} ${scheme.bg}`}>
        {/* Icon */}
        <div className="flex justify-center pt-6">
          <div className={`p-3 rounded-full ${scheme.bg} border ${scheme.border}`}>
            <div className={scheme.icon}>
              {icons[type]}
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="px-6 py-4 text-center">
          <h3 className={`text-lg font-semibold mb-2 ${scheme.title}`}>
            {title}
          </h3>
          <p className={`text-sm ${scheme.message} leading-relaxed`}>
            {message}
          </p>
        </div>

        {/* Actions */}
        <div className={`px-6 pb-6 flex gap-3 ${showCancel ? 'justify-between' : 'justify-center'}`}>
          {showCancel && (
            <button
              onClick={onClose}
              className="flex-1 px-4 py-2.5 rounded-xl font-medium border border-gray-300 text-gray-700 hover:bg-gray-50 transition-all"
            >
              {cancelText}
            </button>
          )}
          <button
            onClick={async () => {
              try {
                await onConfirm?.()
              } catch (err) {
                console.error('Alert confirm error:', err)
              }
              onClose()
            }}
            className={`flex-1 px-4 py-2.5 rounded-xl font-medium transition-all ${scheme.confirm}`}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  )
}

// Hook for managing alerts
export function useAlert() {
  const [alert, setAlert] = useState<{
    isOpen: boolean
    title: string
    message: string
    type?: AlertModalProps['type']
    confirmText?: string
    cancelText?: string
    onConfirm?: () => void
    showCancel?: boolean
  }>({
    isOpen: false,
    title: '',
    message: ''
  })

  const showAlert = (params: Omit<typeof alert, 'isOpen'>) => {
    setAlert({ ...params, isOpen: true })
  }

  const hideAlert = () => {
    setAlert(prev => ({ ...prev, isOpen: false }))
  }

  const AlertComponent = () => (
    <AlertModal
      isOpen={alert.isOpen}
      onClose={hideAlert}
      title={alert.title}
      message={alert.message}
      type={alert.type}
      confirmText={alert.confirmText}
      cancelText={alert.cancelText}
      onConfirm={alert.onConfirm}
      showCancel={alert.showCancel}
    />
  )

  return { showAlert, hideAlert, AlertComponent }
}

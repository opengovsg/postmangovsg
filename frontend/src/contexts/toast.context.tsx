import React, { createContext, useState } from 'react'
import Toast from 'components/common/error-toast'

interface ToastProps {
  showBottomToast: Function;
  showTopToast: Function;
  resetToast: Function;
}

export const ToastContext = createContext({} as ToastProps)

const ToastContextProvider = ({ children }: { children: React.ReactNode }) => {
  const [toastContent, setToastContent] = useState('' as React.ReactNode)
  const [toastPosition, setToastPosition] = useState('')

  function showBottomToast(content: React.ReactNode) {
    setToastPosition('bottom')
    setToastContent(content)
  }

  function showTopToast(content: React.ReactNode) {
    setToastPosition('top')
    setToastContent(content)
  }

  function resetToast() {
    setToastContent('')
  }

  return (
    <ToastContext.Provider value={{ showTopToast, showBottomToast, resetToast }}>
      <Toast position={toastPosition} resetToast={resetToast}>{toastContent}</Toast>
      {children}
    </ToastContext.Provider>
  )
}

export default ToastContextProvider

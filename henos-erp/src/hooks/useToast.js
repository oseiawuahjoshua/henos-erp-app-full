import { useCallback } from 'react'
import { useApp } from '../context/AppContext'
import { uid } from '../utils/helpers'

export function useToast() {
  const { dispatch } = useApp()

  const toast = useCallback((type, message) => {
    const id = uid('T')
    dispatch({ type: 'TOAST_ADD', toast: { id, type, message } })
    setTimeout(() => dispatch({ type: 'TOAST_REMOVE', id }), 3000)
  }, [dispatch])

  return toast
}

import { useCallback, useEffect, useState } from 'react'
import { api } from './api'

export function useApi(path) {
  const [state, setState] = useState({ data: null, error: null, loading: Boolean(path) })
  const load = useCallback(() => {
    if (!path) return
    setState((s) => ({ ...s, loading: true, error: null }))
    api.get(path)
      .then((data) => setState({ data, error: null, loading: false }))
      .catch((error) => setState({ data: null, error, loading: false }))
  }, [path])
  useEffect(load, [load])
  const setData = useCallback((updater) => setState((s) => ({ ...s, data: typeof updater === 'function' ? updater(s.data) : updater })), [])
  return { ...state, reload: load, setData }
}

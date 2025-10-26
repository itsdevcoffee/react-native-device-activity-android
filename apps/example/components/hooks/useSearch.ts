import { useState, useEffect } from 'react'

export function useSearch(initialQuery = '', debounceMs = 200) {
  const [query, setQuery] = useState(initialQuery)
  const [debouncedQuery, setDebouncedQuery] = useState(initialQuery)

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(query)
    }, debounceMs)

    return () => clearTimeout(timer)
  }, [query, debounceMs])

  return {
    query,
    debouncedQuery,
    setQuery,
  }
}

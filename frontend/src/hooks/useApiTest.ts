import { useMutation } from '@tanstack/react-query'
import apiClient from '../lib/apiClient'

async function fetchMe(): Promise<unknown> {
  const { data } = await apiClient.get('/api/me')
  return data
}

async function fetchData(): Promise<unknown> {
  const { data } = await apiClient.get('/api/data')
  return data
}

export function useApiMe() {
  return useMutation({ mutationFn: fetchMe })
}

export function useApiData() {
  return useMutation({ mutationFn: fetchData })
}

import { useMutation, useQueryClient } from '@tanstack/react-query'
import apiClient from '../lib/apiClient'
import type { ServiceStatus } from '../types/service'

export interface ServicePayload {
  name: string
  description: string
  url: string
  status: ServiceStatus
}

export function useCreateService() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (payload: ServicePayload) =>
      apiClient.post('/api/services', payload),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['services'] }),
  })
}

export function useUpdateService() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: ServicePayload }) =>
      apiClient.put(`/api/services/${id}`, payload),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['services'] }),
  })
}

export function useDeleteService() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: number) =>
      apiClient.delete(`/api/services/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['services'] }),
  })
}

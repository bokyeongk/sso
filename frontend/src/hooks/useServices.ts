import { useQuery } from '@tanstack/react-query'
import apiClient from '../lib/apiClient'
import type { Service } from '../types/service'

interface ApiResponse<T> {
  success: boolean
  message: string | null
  data: T
}

async function fetchServices(): Promise<Service[]> {
  const { data } = await apiClient.get<ApiResponse<Service[]>>('/api/services')
  return data.data
}

export function useServices() {
  return useQuery({
    queryKey: ['services'],
    queryFn: fetchServices,
  })
}

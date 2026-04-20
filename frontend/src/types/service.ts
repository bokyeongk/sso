export type ServiceStatus = 'RUNNING' | 'STOPPED' | 'MAINTENANCE'

export interface Service {
  id: number
  name: string
  description: string
  status: ServiceStatus
  url: string | null
  iconUrl: string | null
  sortOrder: number
}

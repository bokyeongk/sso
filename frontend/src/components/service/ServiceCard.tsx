import type { Service, ServiceStatus } from '../../types/service'

const statusConfig: Record<ServiceStatus, { label: string; statusClass: string }> = {
  RUNNING:     { label: '구동중', statusClass: 'status-running' },
  STOPPED:     { label: '중지됨', statusClass: 'status-stopped' },
  MAINTENANCE: { label: '점검중', statusClass: 'status-maintenance' },
}

interface ServiceCardProps {
  service: Service
  isEditMode?: boolean
  onEdit?: () => void
  onDelete?: () => void
}

export function ServiceCard({ service, isEditMode, onEdit, onDelete }: ServiceCardProps) {
  const { label, statusClass } = statusConfig[service.status]

  const handleClick = () => {
    if (service.url) window.open(service.url, '_blank', 'noopener,noreferrer')
  }

  return (
    <div
      className={`service-card${service.url ? ' service-card--clickable' : ''}`}
      onClick={handleClick}
    >
      <div className="service-card-body">
        <div className="service-card-info">
          <h3 className="service-card-name">{service.name}</h3>
          {service.description && (
            <p className="service-card-desc">{service.description}</p>
          )}
        </div>
        <span className={`service-status ${statusClass}`}>{label}</span>
      </div>
      {isEditMode && (
        <div className="service-card-actions" onClick={e => e.stopPropagation()}>
          <button className="card-edit-btn" onClick={onEdit}>수정</button>
          <button className="card-delete-btn" onClick={onDelete}>삭제</button>
        </div>
      )}
    </div>
  )
}

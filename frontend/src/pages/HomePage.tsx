import { useState } from 'react'
import { useAuth } from '../hooks/useAuth'
import { useServices } from '../hooks/useServices'
import { useCreateService, useUpdateService, useDeleteService } from '../hooks/useServiceMutations'
import type { ServicePayload } from '../hooks/useServiceMutations'
import { ServiceCard } from '../components/service/ServiceCard'
import { ServiceEmptyState } from '../components/service/ServiceEmptyState'
import { ServiceFormModal } from '../components/service/ServiceFormModal'
import type { Service } from '../types/service'

export function HomePage() {
  const { user, logout } = useAuth()
  const isAdmin = user?.roles?.includes('admin') ?? false
  const { data: services, isLoading, isError } = useServices()

  const [isEditMode, setIsEditMode] = useState(false)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [editTarget, setEditTarget] = useState<Service | null>(null)

  const createMutation = useCreateService()
  const updateMutation = useUpdateService()
  const deleteMutation = useDeleteService()

  const handleCreate = (payload: ServicePayload) => {
    createMutation.mutate(payload, { onSuccess: () => setShowCreateModal(false) })
  }

  const handleUpdate = (payload: ServicePayload) => {
    if (!editTarget) return
    updateMutation.mutate({ id: editTarget.id, payload }, { onSuccess: () => setEditTarget(null) })
  }

  const handleDelete = (id: number) => {
    if (!window.confirm('서비스를 삭제하시겠습니까?')) return
    deleteMutation.mutate(id)
  }

  return (
    <div className="home-page">
      <header className="home-header">
        <div className="home-header-inner">
          <div className="home-header-left">
            <h1 className="home-title">Hubilon SSO</h1>
            {isAdmin && (
              <>
                <button className="edit-mode-btn" onClick={() => setIsEditMode(v => !v)}>
                  {isEditMode ? '완료' : '편집'}
                </button>
                {isEditMode && (
                  <button className="add-service-btn" onClick={() => setShowCreateModal(true)}>
                    + 추가
                  </button>
                )}
              </>
            )}
          </div>
          <div className="home-header-right">
            {user?.name && (
              <span className="home-username">
                {user.name}{user.email && ` (${user.email})`}
              </span>
            )}
            <button className="logout-btn" onClick={logout}>로그아웃</button>
          </div>
        </div>
      </header>

      <main className="home-main">
        <h2 className="service-list-title">서비스 목록</h2>

        {isLoading && (
          <div className="home-status">
            <div className="spinner" />
          </div>
        )}

        {isError && (
          <div className="home-status">
            <p className="home-error">서비스 목록을 불러오는 중 오류가 발생했습니다.</p>
          </div>
        )}

        {!isLoading && !isError && services && (
          services.length === 0
            ? <ServiceEmptyState />
            : (
              <div className="service-grid">
                {services.map((service) => (
                  <ServiceCard
                    key={service.id}
                    service={service}
                    isEditMode={isEditMode}
                    onEdit={() => setEditTarget(service)}
                    onDelete={() => handleDelete(service.id)}
                  />
                ))}
              </div>
            )
        )}
      </main>

      {showCreateModal && (
        <ServiceFormModal
          mode="create"
          onClose={() => setShowCreateModal(false)}
          onSubmit={handleCreate}
          isSubmitting={createMutation.isPending}
        />
      )}
      {editTarget && (
        <ServiceFormModal
          mode="edit"
          initialData={editTarget}
          onClose={() => setEditTarget(null)}
          onSubmit={handleUpdate}
          isSubmitting={updateMutation.isPending}
        />
      )}
    </div>
  )
}

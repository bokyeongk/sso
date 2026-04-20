import keycloak from '../lib/keycloak'
import { useServices } from '../hooks/useServices'
import { ServiceCard } from '../components/service/ServiceCard'
import { ServiceEmptyState } from '../components/service/ServiceEmptyState'

export function HomePage() {
  const { data: services, isLoading, isError } = useServices()
  const user = keycloak.tokenParsed as { name?: string; email?: string } | undefined

  return (
    <div className="home-page">
      <header className="home-header">
        <div className="home-header-inner">
          <div className="home-header-info">
            <h1 className="home-title">Hubilon SSO</h1>
            {user?.name && (
              <p className="home-user">{user.name}{user.email && ` (${user.email})`}</p>
            )}
          </div>
          <button className="logout-btn" onClick={() => keycloak.logout()}>
            로그아웃
          </button>
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
                  <ServiceCard key={service.id} service={service} />
                ))}
              </div>
            )
        )}
      </main>
    </div>
  )
}

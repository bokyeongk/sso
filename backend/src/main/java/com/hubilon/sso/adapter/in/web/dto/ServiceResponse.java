package com.hubilon.sso.adapter.in.web.dto;
import com.hubilon.sso.domain.model.Service;
import com.hubilon.sso.domain.model.ServiceStatus;

public record ServiceResponse(
    Long id,
    String name,
    String description,
    ServiceStatus status,
    String url,
    String iconUrl,
    Integer sortOrder
) {
    public static ServiceResponse from(Service service) {
        return new ServiceResponse(
            service.getId(), service.getName(), service.getDescription(),
            service.getStatus(), service.getUrl(), service.getIconUrl(),
            service.getSortOrder()
        );
    }
}

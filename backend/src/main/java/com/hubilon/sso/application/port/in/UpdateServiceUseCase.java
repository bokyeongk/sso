package com.hubilon.sso.application.port.in;

import com.hubilon.sso.domain.model.Service;
import com.hubilon.sso.domain.model.ServiceStatus;

public interface UpdateServiceUseCase {
    Service updateService(Long id, String name, String description, String url, ServiceStatus status);
}

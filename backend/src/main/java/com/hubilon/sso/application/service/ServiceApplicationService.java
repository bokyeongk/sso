package com.hubilon.sso.application.service;

import com.hubilon.sso.application.port.in.GetServicesUseCase;
import com.hubilon.sso.application.port.out.ServiceRepository;
import com.hubilon.sso.domain.model.Service;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

import java.util.List;

@Component
@RequiredArgsConstructor
public class ServiceApplicationService implements GetServicesUseCase {
    private final ServiceRepository serviceRepository;

    @Override
    public List<Service> getServices() {
        return serviceRepository.findAllOrderBySortOrder();
    }
}

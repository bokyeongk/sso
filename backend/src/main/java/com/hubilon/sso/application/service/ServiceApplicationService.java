package com.hubilon.sso.application.service;

import com.hubilon.sso.application.port.in.CreateServiceUseCase;
import com.hubilon.sso.application.port.in.DeleteServiceUseCase;
import com.hubilon.sso.application.port.in.GetServicesUseCase;
import com.hubilon.sso.application.port.in.UpdateServiceUseCase;
import com.hubilon.sso.application.port.out.ServiceRepository;
import com.hubilon.sso.domain.model.Service;
import com.hubilon.sso.domain.model.ServiceStatus;
import com.hubilon.sso.infrastructure.exception.ErrorCode;
import com.hubilon.sso.infrastructure.exception.ServiceException;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

import java.util.List;

@Component
@RequiredArgsConstructor
public class ServiceApplicationService implements GetServicesUseCase, CreateServiceUseCase, UpdateServiceUseCase, DeleteServiceUseCase {

    private final ServiceRepository serviceRepository;

    @Override
    public List<Service> getServices() {
        return serviceRepository.findAllOrderBySortOrder();
    }

    @Override
    public Service createService(String name, String description, String url, ServiceStatus status) {
        int nextOrder = serviceRepository.countAll() + 1;
        Service service = Service.builder()
            .name(name)
            .description(description)
            .url(url)
            .status(status)
            .sortOrder(nextOrder)
            .build();
        return serviceRepository.save(service);
    }

    @Override
    public Service updateService(Long id, String name, String description, String url, ServiceStatus status) {
        return serviceRepository.update(id, name, description, url, status);
    }

    @Override
    public void deleteService(Long id) {
        serviceRepository.findById(id)
            .orElseThrow(() -> new ServiceException(ErrorCode.SERVICE_NOT_FOUND));
        serviceRepository.deleteById(id);
    }
}

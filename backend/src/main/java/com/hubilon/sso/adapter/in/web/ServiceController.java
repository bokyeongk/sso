package com.hubilon.sso.adapter.in.web;

import com.hubilon.auth.*;
import com.hubilon.sso.adapter.in.web.dto.ServiceRequest;
import com.hubilon.sso.adapter.in.web.dto.ServiceResponse;
import com.hubilon.sso.application.port.in.CreateServiceUseCase;
import com.hubilon.sso.application.port.in.DeleteServiceUseCase;
import com.hubilon.sso.application.port.in.GetServicesUseCase;
import com.hubilon.sso.application.port.in.UpdateServiceUseCase;
import com.hubilon.sso.domain.model.Service;
import com.hubilon.sso.infrastructure.exception.ErrorCode;
import com.hubilon.sso.infrastructure.exception.ServiceException;
import com.hubilon.sso.infrastructure.response.ApiResponse;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequiredArgsConstructor
@RequestMapping("/api")
public class ServiceController {

    private final GetServicesUseCase getServicesUseCase;
    private final CreateServiceUseCase createServiceUseCase;
    private final UpdateServiceUseCase updateServiceUseCase;
    private final DeleteServiceUseCase deleteServiceUseCase;
    private final KeycloakClient keycloakClient;

    @GetMapping("/me")
    public Map<String, Object> me(HttpServletRequest request) {
        Map<String, Object> userInfo = new HashMap<>(keycloakClient.getUserInfo(request));
        userInfo.put("roles", UserContext.getRoles());
        return userInfo;
    }

    @GetMapping("/services")
    public ApiResponse<List<ServiceResponse>> getServices() {
        List<ServiceResponse> responses = getServicesUseCase.getServices()
            .stream().map(ServiceResponse::from).toList();
        return ApiResponse.ok(responses);
    }

    private void validateAdminAccess() {
        if (!UserContext.hasRole("admin")) {
            throw new ServiceException(ErrorCode.FORBIDDEN);
        }
    }

    @PostMapping("/services")
    public ApiResponse<ServiceResponse> createService(@Valid @RequestBody ServiceRequest request) {
        validateAdminAccess();
        Service service = createServiceUseCase.createService(
            request.name(), request.description(), request.url(), request.status());
        return ApiResponse.ok(ServiceResponse.from(service));
    }

    @PutMapping("/services/{id}")
    public ApiResponse<ServiceResponse> updateService(
            @PathVariable Long id, @Valid @RequestBody ServiceRequest request) {
        validateAdminAccess();
        Service service = updateServiceUseCase.updateService(
            id, request.name(), request.description(), request.url(), request.status());
        return ApiResponse.ok(ServiceResponse.from(service));
    }

    @DeleteMapping("/services/{id}")
    public ApiResponse<Void> deleteService(@PathVariable Long id) {
        validateAdminAccess();
        deleteServiceUseCase.deleteService(id);
        return ApiResponse.ok();
    }
}

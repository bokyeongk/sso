package com.hubilon.sso.adapter.in.web;

import com.hubilon.auth.*;
import com.hubilon.sso.adapter.in.web.dto.MeResponse;
import com.hubilon.sso.adapter.in.web.dto.ProfileResponse;
import com.hubilon.sso.adapter.in.web.dto.ProfileUpdateRequest;
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
import org.springframework.security.access.prepost.PreAuthorize;
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
    private final KeycloakAuthService keycloakAuthService;

    @GetMapping("/v1/profile")
    public ApiResponse<ProfileResponse> getProfile(HttpServletRequest request) {
        UserInfo userInfo = UserContext.get();
        if (userInfo == null) throw new ServiceException(ErrorCode.UNAUTHORIZED);
        Map<String, Object> info = keycloakClient.getUserInfo(request);
        return ApiResponse.ok(ProfileResponse.from(info));
    }

    @PutMapping("/v1/profile")
    public ApiResponse<Void> updateProfile(@RequestBody @Valid ProfileUpdateRequest dto) {
        UserInfo userInfo = UserContext.get();
        if (userInfo == null) throw new ServiceException(ErrorCode.UNAUTHORIZED);

        Map<String, Object> attributes = new HashMap<>();
        attributes.put("family_name", dto.lastName());
        attributes.put("given_name", dto.firstName());
        attributes.put("telNo", dto.telNo());
        attributes.put("teamId", dto.teamId());
        attributes.put("rank", dto.rank());

        keycloakAuthService.updateUserAttributes(userInfo.getUserId(), attributes);
        return ApiResponse.ok();
    }

    @GetMapping("/me")
    public ApiResponse<MeResponse> me() {
        UserInfo userInfo = UserContext.get();
        if (userInfo == null) {
            throw new ServiceException(ErrorCode.UNAUTHORIZED);
        }
        return ApiResponse.ok(MeResponse.from(userInfo));
    }

    @GetMapping("/services")
    public ApiResponse<List<ServiceResponse>> getServices() {
        List<ServiceResponse> responses = getServicesUseCase.getServices()
            .stream().map(ServiceResponse::from).toList();
        return ApiResponse.ok(responses);
    }

    @PreAuthorize("hasRole('ADMIN')")
    @PostMapping("/services")
    public ApiResponse<ServiceResponse> createService(@Valid @RequestBody ServiceRequest request) {
        Service service = createServiceUseCase.createService(
            request.name(), request.description(), request.url(), request.status());
        return ApiResponse.ok(ServiceResponse.from(service));
    }

    @PreAuthorize("hasRole('ADMIN')")
    @PutMapping("/services/{id}")
    public ApiResponse<ServiceResponse> updateService(
            @PathVariable Long id, @Valid @RequestBody ServiceRequest request) {
        Service service = updateServiceUseCase.updateService(
            id, request.name(), request.description(), request.url(), request.status());
        return ApiResponse.ok(ServiceResponse.from(service));
    }

    @PreAuthorize("hasRole('ADMIN')")
    @DeleteMapping("/services/{id}")
    public ApiResponse<Void> deleteService(@PathVariable Long id) {
        deleteServiceUseCase.deleteService(id);
        return ApiResponse.ok();
    }
}

package com.hubilon.sso.adapter.in.web;
import com.hubilon.auth.*;
import com.hubilon.sso.adapter.in.web.dto.ServiceResponse;
import com.hubilon.sso.application.port.in.GetServicesUseCase;
import com.hubilon.sso.infrastructure.response.ApiResponse;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController @RequiredArgsConstructor
@RequestMapping("/api")
public class ServiceController {
    private final GetServicesUseCase getServicesUseCase;
    private final KeycloakClient keycloakClient;

    @GetMapping("/me")
    public Map<String, Object> me(HttpServletRequest request) {
        return keycloakClient.getUserInfo(request);
    }

    @GetMapping("/services")
    public ApiResponse<List<ServiceResponse>> getServices() {
        List<ServiceResponse> responses = getServicesUseCase.getServices()
            .stream().map(ServiceResponse::from).toList();
        return ApiResponse.ok(responses);
    }
}

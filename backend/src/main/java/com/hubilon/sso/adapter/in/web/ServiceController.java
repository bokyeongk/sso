package com.hubilon.sso.adapter.in.web;
import com.hubilon.sso.adapter.in.web.dto.ServiceResponse;
import com.hubilon.sso.application.port.in.GetServicesUseCase;
import com.hubilon.sso.infrastructure.response.ApiResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;
import java.util.List;

@RestController @RequiredArgsConstructor
@RequestMapping("/api")
public class ServiceController {
    private final GetServicesUseCase getServicesUseCase;

    @GetMapping("/services")
    public ApiResponse<List<ServiceResponse>> getServices() {
        List<ServiceResponse> responses = getServicesUseCase.getServices()
            .stream().map(ServiceResponse::from).toList();
        return ApiResponse.ok(responses);
    }
}

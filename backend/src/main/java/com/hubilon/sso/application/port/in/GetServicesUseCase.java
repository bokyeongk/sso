package com.hubilon.sso.application.port.in;
import com.hubilon.sso.domain.model.Service;
import java.util.List;
public interface GetServicesUseCase {
    List<Service> getServices();
}

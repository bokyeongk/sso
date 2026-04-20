package com.hubilon.sso.domain.model;
import lombok.Builder; import lombok.Getter;
import java.time.LocalDateTime;

@Getter @Builder
public class Service {
    private Long id;
    private String name;
    private String description;
    private ServiceStatus status;
    private String url;
    private String iconUrl;
    private Integer sortOrder;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}

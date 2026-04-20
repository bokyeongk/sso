package com.hubilon.sso.domain.model;
public enum ServiceStatus {
    RUNNING("구동중"), STOPPED("중지됨"), MAINTENANCE("점검중");
    private final String label;
    ServiceStatus(String label) { this.label = label; }
    public String getLabel() { return label; }
}

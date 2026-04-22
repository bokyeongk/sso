<!DOCTYPE html>
<html lang="ko">
<head>
    <meta charset="UTF-8" />
    <meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
    <meta name="robots" content="noindex, nofollow" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>통합 로그인 | Hubilon</title>
    <link rel="stylesheet" href="${url.resourcesPath}/css/login.css" />
</head>
<body>

<div class="login-page">
    <div class="login-card">

        <div class="login-header">
            <h1 class="login-title">TEST 서비스 로그인</h1>
            <p class="login-desc">Hubilon SSO 서비스에 오신 것을 환영합니다</p>
        </div>

        <#if message?has_content>
            <div class="alert alert-${message.type}">
                ${kcSanitize(message.summary)?no_esc}
            </div>
        </#if>

        <form id="kc-form-login" action="${url.loginAction}" method="post">
            <input type="hidden" id="id-hidden-input" name="credentialId"
                <#if auth.selectedCredential?has_content>value="${auth.selectedCredential}"</#if> />

            <div class="form-group">
                <label for="username" class="form-label">아이디</label>
                <input
                    id="username"
                    name="username"
                    type="text"
                    class="form-input<#if messagesPerField.existsError('username','password')> input-error</#if>"
                    value="${(login.username!'')}"
                    placeholder="아이디를 입력하세요"
                    autocomplete="username"
                    autofocus
                />
                <#if messagesPerField.existsError('username')>
                    <span class="field-error">${kcSanitize(messagesPerField.get('username'))?no_esc}</span>
                </#if>
            </div>

            <div class="form-group">
                <label for="password" class="form-label">비밀번호</label>
                <input
                    id="password"
                    name="password"
                    type="password"
                    class="form-input<#if messagesPerField.existsError('username','password')> input-error</#if>"
                    placeholder="비밀번호를 입력하세요"
                    autocomplete="current-password"
                />
                <#if messagesPerField.existsError('password')>
                    <span class="field-error">${kcSanitize(messagesPerField.get('password'))?no_esc}</span>
                </#if>
            </div>

            <button type="submit" class="login-btn">
                로그인하기
            </button>
        </form>

        <#if social.providers?has_content>
            <div class="social-divider"><span>또는</span></div>
            <div class="social-buttons">
                <#list social.providers as p>
                    <#if p.alias == "naver">
                        <a href="${p.loginUrl}" class="social-btn social-naver">
                            <svg class="social-icon" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M16.273 12.845L7.376 0H0v24h7.727V11.155L16.624 24H24V0h-7.727z"/>
                            </svg>
                            네이버로 로그인
                        </a>
                    <#elseif p.alias == "kakao">
                        <a href="${p.loginUrl}" class="social-btn social-kakao">
                            <svg class="social-icon" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M12 3C6.477 3 2 6.477 2 10.8c0 2.7 1.636 5.08 4.1 6.48L5.1 21l4.24-2.78c.87.14 1.76.22 2.66.22 5.523 0 10-3.477 10-7.8S17.523 3 12 3z"/>
                            </svg>
                            카카오로 로그인
                        </a>
                    </#if>
                </#list>
            </div>
        </#if>

    </div>
</div>

</body>
</html>

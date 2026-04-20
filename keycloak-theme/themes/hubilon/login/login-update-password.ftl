<!DOCTYPE html>
<html lang="ko">
<head>
    <meta charset="UTF-8" />
    <meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
    <meta name="robots" content="noindex, nofollow" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>비밀번호 변경 | Hubilon</title>
    <link rel="stylesheet" href="${url.resourcesPath}/css/login.css" />
</head>
<body>

<div class="login-page">
    <div class="login-card">

        <div class="login-header">
            <h1 class="login-title">비밀번호 변경</h1>
            <p class="login-desc">새로운 비밀번호를 설정해 주세요</p>
        </div>

        <#if message?has_content>
            <div class="alert alert-${message.type}">
                ${kcSanitize(message.summary)?no_esc}
            </div>
        </#if>

        <form id="kc-passwd-update-form" action="${url.loginAction}" method="post">
            <input type="text" id="username" name="username" value="${username}" autocomplete="username"
                style="display:none;" readonly />

            <div class="form-group">
                <label for="password-new" class="form-label">비밀번호</label>
                <input
                    id="password-new"
                    name="password-new"
                    type="password"
                    class="form-input<#if messagesPerField.existsError('password-new','password-confirm')> input-error</#if>"
                    placeholder="비밀번호를 입력하세요"
                    autocomplete="new-password"
                    autofocus
                />
                <#if messagesPerField.existsError('password-new')>
                    <span class="field-error">${kcSanitize(messagesPerField.get('password-new'))?no_esc}</span>
                </#if>
            </div>

            <div class="form-group">
                <label for="password-confirm" class="form-label">새 비밀번호</label>
                <input
                    id="password-confirm"
                    name="password-confirm"
                    type="password"
                    class="form-input<#if messagesPerField.existsError('password-confirm')> input-error</#if>"
                    placeholder="새 비밀번호를 다시 입력하세요"
                    autocomplete="new-password"
                />
                <#if messagesPerField.existsError('password-confirm')>
                    <span class="field-error">${kcSanitize(messagesPerField.get('password-confirm'))?no_esc}</span>
                </#if>
            </div>

            <button type="submit" class="login-btn">
                변경하기
            </button>
        </form>

    </div>
</div>

</body>
</html>

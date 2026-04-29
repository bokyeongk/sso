import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import './index.css'
import App from './App.tsx'
import apiClient from './lib/apiClient.ts';

const queryClient = new QueryClient({
    defaultOptions: {
        queries: {
            retry: false,
            staleTime: 1000 * 60 * 5,  // 5분
        },
    },
});

// 401 응답 시 토큰 갱신 후 재요청 인터셉터
let isRefreshing = false;
let refreshQueue: Array<() => void> = [];

apiClient.interceptors.response.use(
    (response) => response,
    async (error) => {
        const originalRequest = error.config;

        if (error.response?.status === 401 && !originalRequest._retry) {
            originalRequest._retry = true;

            if (isRefreshing) {
                // 갱신 중이면 대기 후 재요청
                return new Promise((resolve) => {
                    refreshQueue.push(() => resolve(apiClient(originalRequest)));
                });
            }

            isRefreshing = true;
            try {
                await apiClient.post('/auth/refresh');
                refreshQueue.forEach((cb) => cb());
                refreshQueue = [];
                return apiClient(originalRequest);
            } catch {
                // refresh 실패 → 로그인 페이지로
                window.location.href = 'http://localhost:8080/auth/login'
                return Promise.reject(error);
            } finally {
                isRefreshing = false;
            }
        }

        return Promise.reject(error);
    }
);

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>
  </StrictMode>,
)

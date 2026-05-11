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
type QueueItem = { resolve: (value: unknown) => void; reject: (reason?: unknown) => void }
let refreshQueue: QueueItem[] = [];

apiClient.interceptors.response.use(
    (response) => response,
    async (error) => {
        const originalRequest = error.config;
        const requestUrl: string = originalRequest?.url ?? '';

        if (
            error.response?.status === 401 &&
            !originalRequest?._retry &&
            !requestUrl.includes('/auth/refresh')
        ) {
            originalRequest._retry = true;

            if (isRefreshing) {
                return new Promise((resolve, reject) => {
                    refreshQueue.push({
                        resolve: () => resolve(apiClient(originalRequest)),
                        reject,
                    });
                });
            }

            isRefreshing = true;
            try {
                await apiClient.post('/auth/refresh');
                refreshQueue.forEach(({ resolve }) => resolve(undefined));
                refreshQueue = [];
                return apiClient(originalRequest);
            } catch (refreshError) {
                // 대기 중인 요청 전부 실패 처리
                refreshQueue.forEach(({ reject }) => reject(refreshError));
                refreshQueue = [];
                if (window.location.pathname !== '/login') {
                    window.location.href = '/login';
                }
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

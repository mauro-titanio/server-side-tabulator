import axios from "axios";

const apiClient = axios.create({
    baseURL: "/api",
});

// Add Authorization header to each request
apiClient.interceptors.request.use((config) => {
    const token = sessionStorage.getItem("accessToken");
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

// Handle 401 errors and refresh tokens
apiClient.interceptors.response.use(
    (response) => response,
    async (error) => {
        const originalRequest = error.config;
        if (error.response?.status === 401 && !originalRequest._retry) {
            originalRequest._retry = true;

            try {
                const refreshToken = sessionStorage.getItem("refreshToken");
                const response = await axios.post("/api/auth/refresh-token", {
                    refreshToken,
                });

                const { accessToken } = response.data;
                sessionStorage.setItem("accessToken", accessToken);

                originalRequest.headers.Authorization = `Bearer ${accessToken}`;
                return apiClient(originalRequest);
            } catch (refreshError) {
                console.error("Token refresh failed:", refreshError);
                sessionStorage.clear();
                window.location.href = "/";
                throw refreshError;
            }
        }

        return Promise.reject(error);
    }
);

export default apiClient;

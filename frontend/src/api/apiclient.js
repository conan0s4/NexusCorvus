const API_BASE_URL = "http://localhost:8000/api";

function getCookie(name) {
    const cookies = document.cookie.split(";");

    for (const cookie of cookies) {
        const [key, ...valueParts] = cookie.trim().split("=");

        if (key === name) {
            return decodeURIComponent(valueParts.join("="));
        }
    }

    return null;
}

async function ensureCsrfToken() {
    let csrfToken = getCookie("csrftoken");

    // CSRF cookie already exists
    if (csrfToken) {
        return csrfToken;
    }

    // Ask Django to generate the CSRF cookie
    const response = await fetch(`${API_BASE_URL}/auth/csrf/`, {
        method: "GET",
        credentials: "include",
    });

    if (!response.ok) {
        throw new Error("Failed to initialize CSRF protection");
    }

    csrfToken = getCookie("csrftoken");

    if (!csrfToken) {
        throw new Error("CSRF cookie was not created");
    }

    return csrfToken;
}

async function apiRequest(endpoint, options = {}) {
    const method = (options.method || "GET").toUpperCase();

    const headers = {
        "Content-Type": "application/json",
        ...options.headers,
    };

    /*
     * Django CSRF protection is required for
     * state-changing requests.
     */
    if (!["GET", "HEAD", "OPTIONS"].includes(method)) {
        const csrfToken = await ensureCsrfToken();

        headers["X-CSRFToken"] = csrfToken;
    }

    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        ...options,
        headers,
        credentials: "include",
    });

    /*
     * Handle 204 No Content responses.
     * DELETE requests commonly return 204.
     */
    if (response.status === 204) {
        return null;
    }

    const data = await response.json();

    if (!response.ok) {
        throw new Error(
            data.detail || "API request failed"
        );
    }

    return data;
}

export default apiRequest;
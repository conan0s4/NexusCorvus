import apiRequest from "./apiClient";

// LOGIN
export async function login(username, password) {
    return apiRequest("/auth/login/", {
        method: "POST",
        body: JSON.stringify({
            username,
            password,
        }),
    });
}

// LOGOUT
export async function logout() {
    return apiRequest("/auth/logout/", {
        method: "POST",
    });
}

// GET CURRENT USER
export async function getCurrentUser() {
    return apiRequest("/auth/user/");
}

// UPDATE USER PROFILE
export async function updateProfile(profileData) {
    return apiRequest("/auth/user/", {
        method: "PATCH",
        body: JSON.stringify(profileData),
    });
}

// CHANGE PASSWORD
export async function changePassword(
    currentPassword,
    newPassword
) {
    return apiRequest("/auth/password/", {
        method: "POST",
        body: JSON.stringify({
            current_password: currentPassword,
            new_password: newPassword,
        }),
    });
}
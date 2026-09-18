import apiRequest from "./apiClient";

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

    if (csrfToken) {
        return csrfToken;
    }

    const response = await fetch(
        `${API_BASE_URL}/auth/csrf/`,
        {
            method: "GET",
            credentials: "include",
        }
    );

    if (!response.ok) {
        throw new Error(
            "Failed to initialize CSRF protection"
        );
    }

    csrfToken = getCookie("csrftoken");

    if (!csrfToken) {
        throw new Error(
            "CSRF cookie was not created"
        );
    }

    return csrfToken;
}


// ============================================================
// GET ALL EVIDENCE
// ============================================================

export async function getEvidenceFiles() {
    return apiRequest("/evidence/");
}


// ============================================================
// GET SINGLE EVIDENCE
// ============================================================

export async function getEvidenceFile(evidenceFileId) {
    return apiRequest(
        `/evidence/${evidenceFileId}/`
    );
}


// ============================================================
// CREATE / UPLOAD EVIDENCE
// ============================================================

export async function createEvidenceFile(
    caseId,
    file
) {
    if (!caseId) {
        throw new Error("Case is required.");
    }

    if (!file) {
        throw new Error("EVTX file is required.");
    }

    const formData = new FormData();

    formData.append(
        "case_id",
        caseId
    );

    formData.append(
        "file",
        file
    );

    const csrfToken = await ensureCsrfToken();

    const response = await fetch(
        `${API_BASE_URL}/evidence/`,
        {
            method: "POST",

            headers: {
                "X-CSRFToken": csrfToken,
            },

            credentials: "include",

            body: formData,
        }
    );

    if (response.status === 204) {
        return null;
    }

    let data;

    try {
        data = await response.json();
    } catch {
        throw new Error(
            "Invalid response from evidence API."
        );
    }

    if (!response.ok) {
        throw new Error(
            data.detail ||
            "Failed to upload evidence."
        );
    }

    return data;
}


// ============================================================
// DELETE EVIDENCE
// ============================================================

export async function deleteEvidenceFile(
    evidenceFileId
) {
    return apiRequest(
        `/evidence/${evidenceFileId}/`,
        {
            method: "DELETE",
        }
    );
}
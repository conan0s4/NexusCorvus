import apiRequest from "./apiClient";

export async function getCases() {
    return apiRequest("/cases/");
}

export async function getCase(caseId) {
    return apiRequest(`/cases/${caseId}/`);
}

export async function createCase(caseData) {
    return apiRequest("/cases/", {
        method: "POST",
        body: JSON.stringify(caseData),
    });
}

export async function updateCase(caseId, caseData) {
    return apiRequest(`/cases/${caseId}/`, {
        method: "PUT",
        body: JSON.stringify(caseData),
    });
}

export async function deleteCase(caseId) {
    return apiRequest(`/cases/${caseId}/`, {
        method: "DELETE",
    });
}
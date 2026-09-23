import apiRequest, { apiRawFetch } from "./apiClient";

export async function getCases() {
    return apiRequest("/cases/");
}

export async function getCase(caseId) {
    return apiRequest(`/cases/${caseId}/`);
}

export async function downloadCaseReport(caseId, reportFormat) {
    const response = await apiRawFetch(
        `/cases/${caseId}/report/?report_format=${encodeURIComponent(reportFormat)}`
    );

    if (response.status === 204) {
        return null;
    }

    const contentType =
        response.headers.get("content-type") || "";

    if (!response.ok) {
        let detail = `Server error (${response.status}). Please try again later.`;

        try {
            if (contentType.includes("application/json")) {
                const data = await response.json();
                detail = data.detail || detail;
            }
        } catch {
            // Leave the generic message intact.
        }

        throw new Error(detail);
    }

    const blob = await response.blob();
    const disposition =
        response.headers.get("content-disposition") || "";

    return {
        blob,
        contentType,
        disposition,
    };
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
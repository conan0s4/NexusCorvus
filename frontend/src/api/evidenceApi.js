import apiRequest from "./apiClient";

export async function getEvidenceFiles() {
    return apiRequest("/evidence/");
}

export async function getEvidenceFile(evidenceFileId) {
    return apiRequest(`/evidence/${evidenceFileId}/`);
}

export async function createEvidenceFile(evidenceData) {
    return apiRequest("/evidence/", {
        method: "POST",
        body: JSON.stringify(evidenceData),
    });
}

export async function deleteEvidenceFile(
    evidenceFileId
) {
    return apiRequest(`/evidence/${evidenceFileId}/`, {
        method: "DELETE",
    });
}
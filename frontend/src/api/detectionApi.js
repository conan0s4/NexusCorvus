import apiRequest from "./apiClient";

export async function getDetections() {
    return apiRequest("/detections/");
}

export async function getDetection(detectionId) {
    return apiRequest(`/detections/${detectionId}/`);
}

export async function createDetection(detectionData) {
    return apiRequest("/detections/", {
        method: "POST",
        body: JSON.stringify(detectionData),
    });
}

export async function updateDetection(
    detectionId,
    detectionData
) {
    return apiRequest(`/detections/${detectionId}/`, {
        method: "PUT",
        body: JSON.stringify(detectionData),
    });
}

export async function deleteDetection(detectionId) {
    return apiRequest(`/detections/${detectionId}/`, {
        method: "DELETE",
    });
}
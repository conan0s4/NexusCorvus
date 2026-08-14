import apiRequest from "./apiClient";

export async function getEvents() {
    return apiRequest("/events/");
}

export async function getEvent(eventId) {
    return apiRequest(`/events/${eventId}/`);
}

export async function createEvent(eventData) {
    return apiRequest("/events/", {
        method: "POST",
        body: JSON.stringify(eventData),
    });
}

export async function deleteEvent(eventId) {
    return apiRequest(`/events/${eventId}/`, {
        method: "DELETE",
    });
}
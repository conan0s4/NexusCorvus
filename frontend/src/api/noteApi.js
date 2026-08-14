import apiRequest from "./apiClient";

export async function getNotes() {
    return apiRequest("/notes/");
}

export async function getNote(noteId) {
    return apiRequest(`/notes/${noteId}/`);
}

export async function createNote(noteData) {
    return apiRequest("/notes/", {
        method: "POST",
        body: JSON.stringify(noteData),
    });
}

export async function updateNote(noteId, noteData) {
    return apiRequest(`/notes/${noteId}/`, {
        method: "PUT",
        body: JSON.stringify(noteData),
    });
}

export async function deleteNote(noteId) {
    return apiRequest(`/notes/${noteId}/`, {
        method: "DELETE",
    });
}
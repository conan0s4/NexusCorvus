import apiRequest from "./apiClient";

export async function analyzeLogs({
    evidence_file_id,
    pattern,
    event_id,
    host,
    user,
    timerange,
    ignore_case,
}) {
    return await apiRequest("/chainsaw/analyze/", {
        method: "POST",
        body: JSON.stringify({
            evidence_file_id,
            pattern: pattern || "all",
            event_id: event_id || "all",
            host: host || "all",
            user: user || "all",
            timerange: timerange || "all",
            ignore_case: Boolean(ignore_case),
        }),
    });
}
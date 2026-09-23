import apiRequest from "./apiClient";

export async function getSigmaMeta() {
    return apiRequest("/sigma/meta/");
}

export async function detectWithSigma({
    evidence_file_id,
    level,
    category,
    service,
    rule_files,
    max_events_per_rule,
    max_rules,
}) {
    return await apiRequest("/sigma/detect/", {
        method: "POST",
        body: JSON.stringify({
            evidence_file_id,
            level: level || null,
            category: category || null,
            service: service || null,
            rule_files: rule_files || null,
            max_events_per_rule: max_events_per_rule || null,
            max_rules: max_rules || 0,
        }),
    });
}

export async function stopSigmaDetection(evidence_file_id) {
    return await apiRequest("/sigma/stop/", {
        method: "POST",
        body: JSON.stringify({
            evidence_file_id,
        }),
    });
}
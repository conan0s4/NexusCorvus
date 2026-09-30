from django.db import models


class SigmaDetectionResult(models.Model):
    """Persist a completed Sigma scan run for an evidence file.

    Stores the full result produced by :class:`sigma_app.services.sigma_runner.SigmaRunner`
    as-is (scan summary plus actual matched rules and matched events), so the
    report can show real detection results instead of only database metadata.
    """
    case = models.ForeignKey(
        "core.Case",
        on_delete=models.CASCADE,
        related_name="sigma_detection_results",
    )
    evidence_file = models.ForeignKey(
        "core.EvidenceFile",
        on_delete=models.CASCADE,
        related_name="sigma_detection_results",
    )
    created_by = models.ForeignKey(
        "auth.User",
        on_delete=models.CASCADE,
        related_name="sigma_detection_results",
    )
    run_data = models.JSONField()
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return (
            f"Sigma result #{self.pk} for evidence "
            f"{self.evidence_file_id} (case {self.case_id})"
        )
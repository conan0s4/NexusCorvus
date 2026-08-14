from django.db import models

# Create your models here.
from django.db import models
from django.contrib.auth.models import User


class Case(models.Model):
    case_name = models.CharField(max_length=255)
    description = models.TextField(blank=True)
    status = models.CharField(max_length=50)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    created_by = models.ForeignKey(
        User,
        on_delete=models.CASCADE
    )

    def __str__(self):
        return self.case_name

class Event(models.Model):
    case = models.ForeignKey(
        Case,
        on_delete=models.CASCADE
    )
    file_name = models.CharField(max_length=255)
    file_type = models.CharField(max_length=50)
    file_path = models.CharField(max_length=500)
    file_size = models.BigIntegerField()
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.file_name

class Detection(models.Model):
    case = models.ForeignKey(
        Case,
        on_delete=models.CASCADE
    )
    time = models.DateTimeField()
    event_type = models.CharField(max_length=100)
    description = models.TextField()
    host = models.CharField(max_length=255)
    user = models.CharField(max_length=255)
    severity = models.CharField(max_length=50)
    detection_rule = models.CharField(max_length=255)
    rule_id = models.CharField(max_length=255)
    mitre_tactic = models.CharField(max_length=255)
    mitre_technique = models.CharField(max_length=255)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.detection_rule


class Note(models.Model):
    case = models.ForeignKey(
        Case,
        on_delete=models.CASCADE
    )
    created_by = models.ForeignKey(
        User,
        on_delete=models.CASCADE
    )
    content = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"Note {self.id}"

class EvidenceFile(models.Model):
    case = models.ForeignKey(
        Case,
        on_delete=models.CASCADE
    )
    uploaded_by = models.ForeignKey(
        User,
        on_delete=models.CASCADE
    )
    file_name = models.CharField(max_length=255)
    file_type = models.CharField(max_length=50)
    file_path = models.CharField(max_length=500)
    file_size = models.BigIntegerField()
    uploaded_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.file_name
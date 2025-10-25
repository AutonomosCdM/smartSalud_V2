"""
Database models for smartSalud.

Exports all models for easy import:
    from app.models import Appointment, Patient, ConversationHistory
"""

from app.models.appointment import Appointment
from app.models.patient import Patient
from app.models.conversation import ConversationHistory

__all__ = ["Appointment", "Patient", "ConversationHistory"]

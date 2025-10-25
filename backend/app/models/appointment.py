"""
Appointment model for medical appointments.

Tracks appointment scheduling, status, and related information.
"""

from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Enum
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import enum
from app.database import Base


class AppointmentStatus(str, enum.Enum):
    """
    Possible appointment statuses.

    PENDING: Appointment scheduled but not confirmed by patient
    CONFIRMED: Patient confirmed attendance
    CANCELLED: Appointment was cancelled
    COMPLETED: Appointment took place
    NO_SHOW: Patient did not show up
    """

    PENDING = "PENDING"
    CONFIRMED = "CONFIRMED"
    CANCELLED = "CANCELLED"
    COMPLETED = "COMPLETED"
    NO_SHOW = "NO_SHOW"


class Appointment(Base):
    """
    Appointment database model.

    Attributes:
        id: Unique identifier
        patient_id: Foreign key to patient
        doctor_id: ID of the doctor (future: FK to Doctor model)
        doctor_name: Name of the doctor
        appointment_date: Scheduled date and time for appointment
        duration_minutes: Length of appointment in minutes
        status: Current status (PENDING, CONFIRMED, CANCELLED, etc.)
        notes: Additional notes about the appointment
        created_at: Timestamp when record was created
        updated_at: Timestamp when record was last updated
        patient: Relationship to patient
        conversations: Relationship to conversation history
    """

    __tablename__ = "appointments"

    id = Column(Integer, primary_key=True, index=True)
    patient_id = Column(Integer, ForeignKey("patients.id"), nullable=False)
    doctor_id = Column(String(50), nullable=False)  # TODO: Convert to FK when Doctor model exists
    doctor_name = Column(String(255), nullable=False)
    appointment_date = Column(DateTime(timezone=True), nullable=False, index=True)
    duration_minutes = Column(Integer, default=30)
    status = Column(Enum(AppointmentStatus), default=AppointmentStatus.PENDING, index=True)
    notes = Column(String(1000), default="")
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    # Relationships
    patient = relationship("Patient", back_populates="appointments")
    conversations = relationship("ConversationHistory", back_populates="appointment")

    def __repr__(self):
        return (
            f"<Appointment(id={self.id}, patient_id={self.patient_id}, "
            f"date='{self.appointment_date}', status='{self.status}')>"
        )

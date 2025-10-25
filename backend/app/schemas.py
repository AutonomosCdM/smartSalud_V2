"""
Pydantic schemas for request/response validation.

Defines the API contract for all endpoints.
"""

from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime
from app.models.appointment import AppointmentStatus


# Patient Schemas
class PatientBase(BaseModel):
    """Base patient schema with common fields."""

    name: str = Field(..., min_length=1, max_length=255)
    phone: str = Field(..., pattern=r'^\+?[1-9]\d{1,14}$')  # E.164 format
    preferences: Optional[dict] = {}


class PatientCreate(PatientBase):
    """Schema for creating a new patient."""

    pass


class PatientResponse(PatientBase):
    """Schema for patient responses."""

    id: int
    created_at: datetime
    updated_at: Optional[datetime]

    class Config:
        from_attributes = True


# Appointment Schemas
class AppointmentBase(BaseModel):
    """Base appointment schema with common fields."""

    doctor_id: str
    doctor_name: str
    appointment_date: datetime
    duration_minutes: int = 30
    notes: Optional[str] = ""


class AppointmentCreate(AppointmentBase):
    """Schema for creating a new appointment."""

    patient_id: int


class AppointmentUpdate(BaseModel):
    """Schema for updating an appointment."""

    appointment_date: Optional[datetime] = None
    status: Optional[AppointmentStatus] = None
    notes: Optional[str] = None


class AppointmentResponse(AppointmentBase):
    """Schema for appointment responses."""

    id: int
    patient_id: int
    status: AppointmentStatus
    created_at: datetime
    updated_at: Optional[datetime]
    patient: Optional[PatientResponse] = None

    class Config:
        from_attributes = True


class AppointmentConfirmRequest(BaseModel):
    """Schema for confirming an appointment."""

    confirmed: bool = True


class AppointmentRescheduleRequest(BaseModel):
    """Schema for rescheduling an appointment."""

    new_date: datetime


class AlternativeSlot(BaseModel):
    """Schema for alternative appointment slots."""

    slot_date: datetime
    available: bool = True


class AlternativeSlotsResponse(BaseModel):
    """Schema for alternative slots response."""

    appointment_id: int
    current_date: datetime
    alternatives: List[AlternativeSlot]


# Conversation Schemas
class ConversationHistoryBase(BaseModel):
    """Base conversation history schema."""

    messages: List[dict] = []
    state: dict = {}
    context: str = ""


class ConversationHistoryCreate(ConversationHistoryBase):
    """Schema for creating conversation history."""

    appointment_id: Optional[int] = None
    patient_id: int


class ConversationHistoryResponse(ConversationHistoryBase):
    """Schema for conversation history responses."""

    id: int
    appointment_id: Optional[int]
    patient_id: int
    created_at: datetime
    updated_at: Optional[datetime]

    class Config:
        from_attributes = True

"""
Patient model for storing patient information.

Represents patients who interact with the appointment system via WhatsApp.
"""

from sqlalchemy import Column, Integer, String, JSON, DateTime
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database import Base


class Patient(Base):
    """
    Patient database model.

    Attributes:
        id: Unique identifier
        name: Full name of the patient
        phone: WhatsApp phone number (E.164 format, e.g., +1234567890)
        preferences: JSON field for storing patient preferences
            Example: {"language": "es", "preferred_time": "morning"}
        created_at: Timestamp when record was created
        updated_at: Timestamp when record was last updated
        appointments: Relationship to appointments
    """

    __tablename__ = "patients"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), nullable=False)
    phone = Column(String(20), unique=True, nullable=False, index=True)
    preferences = Column(JSON, default={})
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    # Relationships
    appointments = relationship("Appointment", back_populates="patient")
    conversations = relationship("ConversationHistory", back_populates="patient")

    def __repr__(self):
        return f"<Patient(id={self.id}, name='{self.name}', phone='{self.phone}')>"

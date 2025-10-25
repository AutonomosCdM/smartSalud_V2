"""
ConversationHistory model for tracking agent-patient interactions.

Stores conversation state and message history for agent continuity.
"""

from sqlalchemy import Column, Integer, String, JSON, DateTime, ForeignKey, Text
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database import Base


class ConversationHistory(Base):
    """
    ConversationHistory database model.

    Stores the conversation context between the agent and patient,
    enabling stateful interactions across multiple WhatsApp messages.

    Attributes:
        id: Unique identifier
        appointment_id: Foreign key to appointment
        patient_id: Foreign key to patient (for conversations without appointments)
        messages: JSON array of message objects
            Example: [
                {"role": "user", "content": "I need to reschedule", "timestamp": "2024-..."},
                {"role": "assistant", "content": "Sure, which date works?", "timestamp": "2024-..."}
            ]
        state: JSON object representing current agent state
            Example: {
                "intent": "reschedule",
                "proposed_dates": ["2024-10-26T10:00:00", "2024-10-27T14:00:00"],
                "awaiting_selection": true
            }
        context: Additional contextual information
        created_at: Timestamp when conversation started
        updated_at: Timestamp when conversation was last updated
        appointment: Relationship to appointment
        patient: Relationship to patient
    """

    __tablename__ = "conversation_history"

    id = Column(Integer, primary_key=True, index=True)
    appointment_id = Column(Integer, ForeignKey("appointments.id"), nullable=True)
    patient_id = Column(Integer, ForeignKey("patients.id"), nullable=False)
    messages = Column(JSON, default=[])
    state = Column(JSON, default={})
    context = Column(Text, default="")
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    # Relationships
    appointment = relationship("Appointment", back_populates="conversations")
    patient = relationship("Patient", back_populates="conversations")

    def __repr__(self):
        return (
            f"<ConversationHistory(id={self.id}, appointment_id={self.appointment_id}, "
            f"patient_id={self.patient_id})>"
        )

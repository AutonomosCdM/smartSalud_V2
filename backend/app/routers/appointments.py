"""
Appointment API endpoints.

Provides CRUD operations and specialized endpoints for appointment management.
"""

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from typing import List
from datetime import datetime, timedelta

from app.database import get_db
from app.models import Appointment, Patient
from app.models.appointment import AppointmentStatus
from app.schemas import (
    AppointmentResponse,
    AppointmentCreate,
    AppointmentUpdate,
    AppointmentConfirmRequest,
    AppointmentRescheduleRequest,
    AlternativeSlotsResponse,
    AlternativeSlot
)

router = APIRouter(
    prefix="/api/appointments",
    tags=["appointments"]
)


@router.get("/upcoming", response_model=List[AppointmentResponse])
async def get_upcoming_appointments(
    hours: int = Query(48, description="Look ahead window in hours"),
    status_filter: AppointmentStatus = Query(
        AppointmentStatus.PENDING,
        description="Filter by appointment status"
    ),
    db: Session = Depends(get_db)
):
    """
    Get upcoming appointments within specified time window.

    Used by Cloudflare Agent to identify appointments needing confirmation.

    Args:
        hours: Number of hours to look ahead (default: 48)
        status_filter: Filter by status (default: PENDING)
        db: Database session

    Returns:
        List of appointments within the time window
    """
    now = datetime.utcnow()
    future_cutoff = now + timedelta(hours=hours)

    appointments = db.query(Appointment).filter(
        Appointment.appointment_date >= now,
        Appointment.appointment_date <= future_cutoff,
        Appointment.status == status_filter
    ).order_by(Appointment.appointment_date).all()

    return appointments


@router.get("/{appointment_id}", response_model=AppointmentResponse)
async def get_appointment(
    appointment_id: int,
    db: Session = Depends(get_db)
):
    """
    Get a specific appointment by ID.

    Args:
        appointment_id: Appointment ID
        db: Database session

    Returns:
        Appointment details

    Raises:
        HTTPException: 404 if appointment not found
    """
    appointment = db.query(Appointment).filter(
        Appointment.id == appointment_id
    ).first()

    if not appointment:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Appointment {appointment_id} not found"
        )

    return appointment


@router.post("/{appointment_id}/confirm", response_model=AppointmentResponse)
async def confirm_appointment(
    appointment_id: int,
    request: AppointmentConfirmRequest,
    db: Session = Depends(get_db)
):
    """
    Confirm or unconfirm an appointment.

    Args:
        appointment_id: Appointment ID
        request: Confirmation request with confirmed boolean
        db: Database session

    Returns:
        Updated appointment

    Raises:
        HTTPException: 404 if appointment not found
    """
    appointment = db.query(Appointment).filter(
        Appointment.id == appointment_id
    ).first()

    if not appointment:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Appointment {appointment_id} not found"
        )

    appointment.status = (
        AppointmentStatus.CONFIRMED if request.confirmed
        else AppointmentStatus.PENDING
    )
    appointment.updated_at = datetime.utcnow()

    db.commit()
    db.refresh(appointment)

    return appointment


@router.post("/{appointment_id}/cancel", response_model=AppointmentResponse)
async def cancel_appointment(
    appointment_id: int,
    db: Session = Depends(get_db)
):
    """
    Cancel an appointment.

    Args:
        appointment_id: Appointment ID
        db: Database session

    Returns:
        Updated appointment with CANCELLED status

    Raises:
        HTTPException: 404 if appointment not found
    """
    appointment = db.query(Appointment).filter(
        Appointment.id == appointment_id
    ).first()

    if not appointment:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Appointment {appointment_id} not found"
        )

    appointment.status = AppointmentStatus.CANCELLED
    appointment.updated_at = datetime.utcnow()

    db.commit()
    db.refresh(appointment)

    return appointment


@router.get("/{appointment_id}/alternatives", response_model=AlternativeSlotsResponse)
async def get_alternative_slots(
    appointment_id: int,
    db: Session = Depends(get_db)
):
    """
    Get alternative appointment slots for rescheduling.

    Generates 2 alternative time slots based on the current appointment.

    Args:
        appointment_id: Appointment ID
        db: Database session

    Returns:
        List of alternative appointment slots

    Raises:
        HTTPException: 404 if appointment not found
    """
    appointment = db.query(Appointment).filter(
        Appointment.id == appointment_id
    ).first()

    if not appointment:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Appointment {appointment_id} not found"
        )

    # Generate 2 alternative slots (simple logic for demo)
    # In production, this would check actual availability
    current_date = appointment.appointment_date
    alternatives = [
        AlternativeSlot(
            slot_date=current_date + timedelta(days=1),
            available=True
        ),
        AlternativeSlot(
            slot_date=current_date + timedelta(days=2),
            available=True
        )
    ]

    return AlternativeSlotsResponse(
        appointment_id=appointment_id,
        current_date=current_date,
        alternatives=alternatives
    )


@router.post("/{appointment_id}/reschedule", response_model=AppointmentResponse)
async def reschedule_appointment(
    appointment_id: int,
    request: AppointmentRescheduleRequest,
    db: Session = Depends(get_db)
):
    """
    Reschedule an appointment to a new date/time.

    Args:
        appointment_id: Appointment ID
        request: Reschedule request with new_date
        db: Database session

    Returns:
        Updated appointment with new date

    Raises:
        HTTPException: 404 if appointment not found
        HTTPException: 400 if new date is in the past
    """
    appointment = db.query(Appointment).filter(
        Appointment.id == appointment_id
    ).first()

    if not appointment:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Appointment {appointment_id} not found"
        )

    if request.new_date < datetime.utcnow():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot reschedule to a past date"
        )

    appointment.appointment_date = request.new_date
    appointment.status = AppointmentStatus.PENDING  # Reset to pending after reschedule
    appointment.updated_at = datetime.utcnow()

    db.commit()
    db.refresh(appointment)

    return appointment


@router.post("/", response_model=AppointmentResponse, status_code=status.HTTP_201_CREATED)
async def create_appointment(
    appointment: AppointmentCreate,
    db: Session = Depends(get_db)
):
    """
    Create a new appointment.

    Args:
        appointment: Appointment creation data
        db: Database session

    Returns:
        Created appointment

    Raises:
        HTTPException: 404 if patient not found
    """
    # Verify patient exists
    patient = db.query(Patient).filter(Patient.id == appointment.patient_id).first()
    if not patient:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Patient {appointment.patient_id} not found"
        )

    new_appointment = Appointment(**appointment.model_dump())
    db.add(new_appointment)
    db.commit()
    db.refresh(new_appointment)

    return new_appointment

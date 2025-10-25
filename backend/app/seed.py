"""
Database seed script for development/testing.

Creates sample patients and appointments for testing the agent.
"""

from datetime import datetime, timedelta
from sqlalchemy.orm import Session

from app.database import SessionLocal, engine
from app.models import Patient, Appointment
from app.models.appointment import AppointmentStatus


def seed_database():
    """
    Seed the database with test data.

    Creates:
    - 5 test patients
    - 5 appointments (all PENDING, within next 48 hours)
    """
    db = SessionLocal()

    try:
        # Clear existing data (for development only)
        print("Clearing existing data...")
        db.query(Appointment).delete()
        db.query(Patient).delete()
        db.commit()

        # Create patients
        print("Creating patients...")
        patients = [
            Patient(
                name="Juan Pérez",
                phone="+525512345678",
                preferences={"language": "es", "preferred_time": "morning"}
            ),
            Patient(
                name="María García",
                phone="+525587654321",
                preferences={"language": "es", "preferred_time": "afternoon"}
            ),
            Patient(
                name="Carlos López",
                phone="+525598765432",
                preferences={"language": "es", "reminder_hours": 24}
            ),
            Patient(
                name="Ana Martínez",
                phone="+525523456789",
                preferences={"language": "es", "preferred_time": "evening"}
            ),
            Patient(
                name="Luis Rodríguez",
                phone="+525534567890",
                preferences={"language": "es", "sms_only": False}
            )
        ]

        for patient in patients:
            db.add(patient)

        db.commit()
        print(f"Created {len(patients)} patients")

        # Create appointments (all within next 48 hours)
        print("Creating appointments...")
        now = datetime.utcnow()
        appointments = [
            Appointment(
                patient_id=1,
                doctor_id="DOC001",
                doctor_name="Dr. Ramírez",
                appointment_date=now + timedelta(hours=12),
                duration_minutes=30,
                status=AppointmentStatus.PENDING,
                notes="Consulta general"
            ),
            Appointment(
                patient_id=2,
                doctor_id="DOC002",
                doctor_name="Dra. González",
                appointment_date=now + timedelta(hours=24),
                duration_minutes=45,
                status=AppointmentStatus.PENDING,
                notes="Seguimiento diabetes"
            ),
            Appointment(
                patient_id=3,
                doctor_id="DOC001",
                doctor_name="Dr. Ramírez",
                appointment_date=now + timedelta(hours=36),
                duration_minutes=30,
                status=AppointmentStatus.PENDING,
                notes="Control hipertensión"
            ),
            Appointment(
                patient_id=4,
                doctor_id="DOC003",
                doctor_name="Dr. Torres",
                appointment_date=now + timedelta(hours=40),
                duration_minutes=60,
                status=AppointmentStatus.PENDING,
                notes="Examen físico anual"
            ),
            Appointment(
                patient_id=5,
                doctor_id="DOC002",
                doctor_name="Dra. González",
                appointment_date=now + timedelta(hours=47),
                duration_minutes=30,
                status=AppointmentStatus.PENDING,
                notes="Revisión de resultados"
            )
        ]

        for appointment in appointments:
            db.add(appointment)

        db.commit()
        print(f"Created {len(appointments)} appointments")

        # Verify data
        total_patients = db.query(Patient).count()
        total_appointments = db.query(Appointment).count()
        pending_appointments = db.query(Appointment).filter(
            Appointment.status == AppointmentStatus.PENDING
        ).count()

        print("\n" + "="*50)
        print("Database seeding completed successfully!")
        print("="*50)
        print(f"Total patients: {total_patients}")
        print(f"Total appointments: {total_appointments}")
        print(f"Pending appointments: {pending_appointments}")
        print("="*50 + "\n")

    except Exception as e:
        print(f"Error seeding database: {e}")
        db.rollback()
        raise
    finally:
        db.close()


if __name__ == "__main__":
    print("Starting database seeding...")
    seed_database()

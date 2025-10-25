-- smartSalud D1 Database Schema

-- Patients table
CREATE TABLE IF NOT EXISTS patients (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  phone TEXT NOT NULL UNIQUE,
  created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now'))
);

-- Appointments table
CREATE TABLE IF NOT EXISTS appointments (
  id TEXT PRIMARY KEY,
  patient_id TEXT NOT NULL,
  patient_name TEXT NOT NULL,
  patient_phone TEXT NOT NULL,
  doctor_name TEXT NOT NULL,
  specialty TEXT NOT NULL,
  appointment_date TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'SCHEDULED',
  workflow_id TEXT,
  workflow_status TEXT,
  current_step TEXT,
  outcome TEXT,
  metadata TEXT,
  created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
  updated_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
  FOREIGN KEY (patient_id) REFERENCES patients(id)
);

-- Conversations table (for conversation history)
CREATE TABLE IF NOT EXISTS conversations (
  id TEXT PRIMARY KEY,
  patient_phone TEXT NOT NULL,
  appointment_id TEXT,
  message_sid TEXT,
  direction TEXT NOT NULL,
  message_body TEXT NOT NULL,
  intent TEXT,
  confidence REAL,
  timestamp INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
  FOREIGN KEY (appointment_id) REFERENCES appointments(id)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_appointments_patient_id ON appointments(patient_id);
CREATE INDEX IF NOT EXISTS idx_appointments_date ON appointments(appointment_date);
CREATE INDEX IF NOT EXISTS idx_appointments_status ON appointments(status);
CREATE INDEX IF NOT EXISTS idx_conversations_patient_phone ON conversations(patient_phone);
CREATE INDEX IF NOT EXISTS idx_conversations_appointment_id ON conversations(appointment_id);

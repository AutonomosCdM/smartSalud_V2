-- Seed data for smartSalud demo

-- Insert demo patients
INSERT INTO patients (id, name, phone) VALUES
  ('P001', 'María González', '+56912345678'),
  ('P002', 'Juan Pérez', '+56987654321'),
  ('P003', 'Ana Silva', '+56911223344');

-- Insert demo appointments (48 hours from now)
INSERT INTO appointments (
  id, patient_id, patient_name, patient_phone, doctor_name, specialty,
  appointment_date, status, workflow_id, workflow_status, current_step
) VALUES
  (
    'APT001',
    'P001',
    'María González',
    '+56912345678',
    'Dr. Carlos Ruiz',
    'Cardiología',
    datetime('now', '+48 hours'),
    'PENDING_CONFIRMATION',
    'WF001',
    'RUNNING',
    'SEND_INITIAL_REMINDER'
  ),
  (
    'APT002',
    'P002',
    'Juan Pérez',
    '+56987654321',
    'Dra. Patricia Mora',
    'Dermatología',
    datetime('now', '+47 hours'),
    'VOICE_CALL_ACTIVE',
    'WF002',
    'RUNNING',
    'VOICE_CALL'
  ),
  (
    'APT003',
    'P003',
    'Ana Silva',
    '+56911223344',
    'Dr. Roberto Lagos',
    'Pediatría',
    datetime('now', '+46 hours'),
    'NEEDS_HUMAN_INTERVENTION',
    'WF003',
    'PAUSED',
    'HUMAN_ESCALATION'
  );

-- Insert conversation history
INSERT INTO conversations (id, patient_phone, appointment_id, message_sid, direction, message_body, intent, confidence) VALUES
  ('MSG001', '+56912345678', 'APT001', 'SM123', 'outbound', 'Hola María, tienes cita mañana a las 10:00 AM con Dr. Carlos Ruiz. ¿Confirmas?', NULL, NULL),
  ('MSG002', '+56987654321', 'APT002', 'SM124', 'outbound', 'Hola Juan, tienes cita mañana a las 3:00 PM con Dra. Patricia Mora. ¿Confirmas?', NULL, NULL),
  ('MSG003', '+56987654321', 'APT002', 'SM125', 'inbound', 'No puedo', 'cancel', 0.85),
  ('MSG004', '+56911223344', 'APT003', 'SM126', 'outbound', 'Hola Ana, tienes cita mañana a las 11:30 AM con Dr. Roberto Lagos. ¿Confirmas?', NULL, NULL),
  ('MSG005', '+56911223344', 'APT003', 'SM127', 'inbound', 'No puedo', 'cancel', 0.92),
  ('MSG006', '+56911223344', 'APT003', 'SM128', 'inbound', 'Tampoco puedo con las nuevas opciones', 'cancel', 0.78);

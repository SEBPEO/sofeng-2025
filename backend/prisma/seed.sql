-- Step 1: Find your doctor's user_id
SELECT user_id, email, role, first_name, last_name 
FROM "User" 
WHERE role = 'doctor';

-- Step 2: Check if doctor has a profile
SELECT dp.doctor_id, dp.user_id, u.email 
FROM "DoctorProfile" dp
JOIN "User" u ON dp.user_id = u.user_id;

-- Step 3: Create a patient user (run this after you have doctor_id from step 2)
-- Replace the values below with your needs
INSERT INTO "User" (user_id, email, first_name, last_name, gender, role, "createdAt")
VALUES (
  'patient-demo-001',
  'john.doe@example.com',
  'John',
  'Doe',
  'male',
  'patient',
  NOW()
) ON CONFLICT (email) DO NOTHING;

-- Step 4: Create patient profile
INSERT INTO "PatientProfile" (
  patient_id, 
  user_id, 
  date_of_birth, 
  emergency_contact, 
  conditions, 
  medications, 
  allergy
)
VALUES (
  1,
  'patient-demo-001',
  '1985-05-15',
  '+1-555-0123',
  'Hypertension, Type 2 Diabetes',
  'Metformin 500mg, Lisinopril 10mg',
  'Penicillin'
) ON CONFLICT (user_id) DO NOTHING;

-- Step 5: Create appointment linking doctor to patient
-- IMPORTANT: Replace <YOUR_DOCTOR_ID> with the doctor_id from step 2
INSERT INTO "Appointment" (
  appointment_id,
  doctor_id,
  patient_id,
  appointment_datetime,
  duration_minutes,
  status,
  notes
)
VALUES (
  1,
  <YOUR_DOCTOR_ID>,  -- REPLACE THIS!
  1,
  '2025-01-15 10:00:00',
  30,
  'scheduled',
  'Initial consultation'
) ON CONFLICT (appointment_id) DO NOTHING;

-- Step 6: Verify the setup
SELECT 
  a.appointment_id,
  d.doctor_id,
  du.email as doctor_email,
  p.patient_id,
  pu.email as patient_email,
  pu.first_name,
  pu.last_name
FROM "Appointment" a
JOIN "DoctorProfile" d ON a.doctor_id = d.doctor_id
JOIN "User" du ON d.user_id = du.user_id
JOIN "PatientProfile" p ON a.patient_id = p.patient_id
JOIN "User" pu ON p.user_id = pu.user_id;

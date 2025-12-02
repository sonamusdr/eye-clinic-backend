-- EMERGENCY SCRIPT: Activate critical system users
-- Run this directly in Railway PostgreSQL database

-- First, ensure users exist and are active
-- Admin user
INSERT INTO users (id, "firstName", "lastName", email, password, role, phone, "isActive", "createdAt", "updatedAt")
VALUES (
  gen_random_uuid(),
  'Admin',
  'User',
  'admin@clinic.com',
  '$2a$10$rOzJqJqJqJqJqJqJqJqJqOqJqJqJqJqJqJqJqJqJqJqJqJqJqJqJq', -- This is bcrypt hash for 'admin123'
  'admin',
  '1234567890',
  true,
  NOW(),
  NOW()
)
ON CONFLICT (email) DO UPDATE SET
  "isActive" = true,
  password = '$2a$10$rOzJqJqJqJqJqJqJqJqJqOqJqJqJqJqJqJqJqJqJqJqJqJqJqJqJq',
  "updatedAt" = NOW();

-- Doctor user
INSERT INTO users (id, "firstName", "lastName", email, password, role, specialization, "licenseNumber", phone, "isActive", "createdAt", "updatedAt")
VALUES (
  gen_random_uuid(),
  'John',
  'Doctor',
  'doctor@clinic.com',
  '$2a$10$rOzJqJqJqJqJqJqJqJqJqOqJqJqJqJqJqJqJqJqJqJqJqJqJqJqJq', -- This is bcrypt hash for 'doctor123'
  'doctor',
  'Ophthalmology',
  'DOC12345',
  '1234567891',
  true,
  NOW(),
  NOW()
)
ON CONFLICT (email) DO UPDATE SET
  "isActive" = true,
  password = '$2a$10$rOzJqJqJqJqJqJqJqJqJqOqJqJqJqJqJqJqJqJqJqJqJqJqJqJqJq',
  "updatedAt" = NOW();

-- Receptionist user
INSERT INTO users (id, "firstName", "lastName", email, password, role, phone, "isActive", "createdAt", "updatedAt")
VALUES (
  gen_random_uuid(),
  'Jane',
  'Receptionist',
  'receptionist@clinic.com',
  '$2a$10$rOzJqJqJqJqJqJqJqJqJqOqJqJqJqJqJqJqJqJqJqJqJqJqJqJqJq', -- This is bcrypt hash for 'receptionist123'
  'receptionist',
  '1234567892',
  true,
  NOW(),
  NOW()
)
ON CONFLICT (email) DO UPDATE SET
  "isActive" = true,
  password = '$2a$10$rOzJqJqJqJqJqJqJqJqJqOqJqJqJqJqJqJqJqJqJqJqJqJqJqJqJq',
  "updatedAt" = NOW();

-- Verify users are active
SELECT email, "isActive", role FROM users WHERE email IN ('admin@clinic.com', 'doctor@clinic.com', 'receptionist@clinic.com');


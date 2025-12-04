-- Script SQL para crear las nuevas tablas de secciones adicionales
-- Ejecutar este script en Railway PostgreSQL o en la base de datos directamente

-- Tabla de Procedimientos
CREATE TABLE IF NOT EXISTS procedures (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "patientId" UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  "doctorId" UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  "procedureType" VARCHAR(20) NOT NULL DEFAULT 'other' CHECK ("procedureType" IN ('surgery', 'laser', 'injection', 'examination', 'other')),
  "procedureName" VARCHAR(255) NOT NULL,
  "procedureDate" DATE NOT NULL,
  "startTime" TIME,
  "endTime" TIME,
  status VARCHAR(20) DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'in_progress', 'completed', 'cancelled', 'postponed')),
  description TEXT,
  notes TEXT,
  cost DECIMAL(10, 2),
  "anesthesiaType" VARCHAR(255),
  complications TEXT,
  "followUpDate" DATE,
  "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Tabla de Horarios de Terapia
CREATE TABLE IF NOT EXISTS therapy_schedules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "patientId" UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  "doctorId" UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  "therapyType" VARCHAR(255) NOT NULL,
  "startDate" DATE NOT NULL,
  "endDate" DATE,
  frequency VARCHAR(20) NOT NULL DEFAULT 'weekly' CHECK (frequency IN ('daily', 'weekly', 'biweekly', 'monthly', 'custom')),
  "daysOfWeek" JSONB,
  "timeSlots" JSONB,
  duration INTEGER,
  status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'completed', 'cancelled', 'on_hold')),
  notes TEXT,
  instructions TEXT,
  "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Tabla de Resultados de Estudios
CREATE TABLE IF NOT EXISTS study_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "patientId" UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  "doctorId" UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  "studyType" VARCHAR(20) NOT NULL CHECK ("studyType" IN ('oct', 'topography', 'angiography', 'ultrasound', 'visual_field', 'biometry', 'pachymetry', 'other')),
  "studyName" VARCHAR(255) NOT NULL,
  "studyDate" DATE NOT NULL DEFAULT CURRENT_DATE,
  results JSONB,
  findings TEXT,
  interpretation TEXT,
  recommendations TEXT,
  "fileUrl" VARCHAR(500),
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'reviewed', 'archived')),
  notes TEXT,
  "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Tabla de Certificaciones Médicas
CREATE TABLE IF NOT EXISTS medical_certificates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "patientId" UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  "doctorId" UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  "certificateType" VARCHAR(20) NOT NULL CHECK ("certificateType" IN ('fitness', 'disability', 'sick_leave', 'vision_requirement', 'surgery_clearance', 'other')),
  "certificateNumber" VARCHAR(255) UNIQUE,
  "issueDate" DATE NOT NULL DEFAULT CURRENT_DATE,
  "expiryDate" DATE,
  purpose TEXT,
  diagnosis TEXT,
  recommendations TEXT,
  restrictions TEXT,
  status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'expired', 'revoked', 'cancelled')),
  "fileUrl" VARCHAR(500),
  notes TEXT,
  "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Tabla de Autorizaciones de Seguro
CREATE TABLE IF NOT EXISTS insurance_authorizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "patientId" UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  "doctorId" UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  "insuranceCompany" VARCHAR(255) NOT NULL,
  "policyNumber" VARCHAR(255),
  "authorizationNumber" VARCHAR(255) UNIQUE,
  "serviceType" VARCHAR(255) NOT NULL,
  "requestedDate" DATE NOT NULL DEFAULT CURRENT_DATE,
  "approvedDate" DATE,
  "expiryDate" DATE,
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'expired', 'cancelled')),
  "approvedAmount" DECIMAL(10, 2),
  "requestedAmount" DECIMAL(10, 2),
  "rejectionReason" TEXT,
  notes TEXT,
  "fileUrl" VARCHAR(500),
  "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Crear índices para mejorar el rendimiento
CREATE INDEX IF NOT EXISTS idx_procedures_patient ON procedures("patientId");
CREATE INDEX IF NOT EXISTS idx_procedures_doctor ON procedures("doctorId");
CREATE INDEX IF NOT EXISTS idx_procedures_date ON procedures("procedureDate");

CREATE INDEX IF NOT EXISTS idx_therapy_patient ON therapy_schedules("patientId");
CREATE INDEX IF NOT EXISTS idx_therapy_doctor ON therapy_schedules("doctorId");

CREATE INDEX IF NOT EXISTS idx_study_patient ON study_results("patientId");
CREATE INDEX IF NOT EXISTS idx_study_doctor ON study_results("doctorId");
CREATE INDEX IF NOT EXISTS idx_study_date ON study_results("studyDate");

CREATE INDEX IF NOT EXISTS idx_certificate_patient ON medical_certificates("patientId");
CREATE INDEX IF NOT EXISTS idx_certificate_doctor ON medical_certificates("doctorId");

CREATE INDEX IF NOT EXISTS idx_insurance_patient ON insurance_authorizations("patientId");
CREATE INDEX IF NOT EXISTS idx_insurance_doctor ON insurance_authorizations("doctorId");


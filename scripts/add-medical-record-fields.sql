-- Script SQL para agregar nuevos campos a la tabla medical_records
-- Ejecutar este script en la base de datos PostgreSQL

-- Agregar nuevas columnas a la tabla medical_records
ALTER TABLE "medical_records" 
ADD COLUMN IF NOT EXISTS "recordNumber" VARCHAR(255),
ADD COLUMN IF NOT EXISTS "recordCreationDate" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN IF NOT EXISTS "firstName" VARCHAR(255),
ADD COLUMN IF NOT EXISTS "lastName" VARCHAR(255),
ADD COLUMN IF NOT EXISTS "address" TEXT,
ADD COLUMN IF NOT EXISTS "city" VARCHAR(255),
ADD COLUMN IF NOT EXISTS "email" VARCHAR(255),
ADD COLUMN IF NOT EXISTS "maritalStatus" VARCHAR(255),
ADD COLUMN IF NOT EXISTS "age" INTEGER,
ADD COLUMN IF NOT EXISTS "idNumber" VARCHAR(255),
ADD COLUMN IF NOT EXISTS "origin" VARCHAR(255),
ADD COLUMN IF NOT EXISTS "homePhone" VARCHAR(255),
ADD COLUMN IF NOT EXISTS "officePhone" VARCHAR(255),
ADD COLUMN IF NOT EXISTS "cellPhone" VARCHAR(255),
ADD COLUMN IF NOT EXISTS "birthPlace" VARCHAR(255),
ADD COLUMN IF NOT EXISTS "occupation" VARCHAR(255),
ADD COLUMN IF NOT EXISTS "referredBy" VARCHAR(255),
ADD COLUMN IF NOT EXISTS "education" VARCHAR(255),
ADD COLUMN IF NOT EXISTS "fatherName" VARCHAR(255),
ADD COLUMN IF NOT EXISTS "motherName" VARCHAR(255),
ADD COLUMN IF NOT EXISTS "insuranceProviderName" VARCHAR(255),
ADD COLUMN IF NOT EXISTS "insuranceMemberNumber" VARCHAR(255),
ADD COLUMN IF NOT EXISTS "insurancePlanType" VARCHAR(255),
ADD COLUMN IF NOT EXISTS "insurancePolicyNumber" VARCHAR(255),
ADD COLUMN IF NOT EXISTS "personalHistory" TEXT,
ADD COLUMN IF NOT EXISTS "familyHistory" TEXT,
ADD COLUMN IF NOT EXISTS "observations" TEXT,
ADD COLUMN IF NOT EXISTS "country" VARCHAR(255);

-- Nota: Los campos firstName, lastName, address, city, email, dateOfBirth, gender
-- se pueden obtener del paciente relacionado, pero también se pueden almacenar
-- directamente en el registro médico si se desea mantener un historial completo.

COMMENT ON COLUMN "medical_records"."recordNumber" IS 'Número de expediente médico';
COMMENT ON COLUMN "medical_records"."recordCreationDate" IS 'Fecha de creación del expediente médico';
COMMENT ON COLUMN "medical_records"."maritalStatus" IS 'Estado civil del paciente';
COMMENT ON COLUMN "medical_records"."age" IS 'Edad del paciente';
COMMENT ON COLUMN "medical_records"."idNumber" IS 'Cédula o Pasaporte';
COMMENT ON COLUMN "medical_records"."origin" IS 'Procedencia del paciente';
COMMENT ON COLUMN "medical_records"."homePhone" IS 'Teléfono de casa';
COMMENT ON COLUMN "medical_records"."officePhone" IS 'Teléfono de oficina';
COMMENT ON COLUMN "medical_records"."cellPhone" IS 'Teléfono celular';
COMMENT ON COLUMN "medical_records"."birthPlace" IS 'Lugar de nacimiento';
COMMENT ON COLUMN "medical_records"."occupation" IS 'Ocupación del paciente';
COMMENT ON COLUMN "medical_records"."referredBy" IS 'Referido por';
COMMENT ON COLUMN "medical_records"."education" IS 'Escolaridad';
COMMENT ON COLUMN "medical_records"."fatherName" IS 'Nombre del padre';
COMMENT ON COLUMN "medical_records"."motherName" IS 'Nombre de la madre';
COMMENT ON COLUMN "medical_records"."insuranceProviderName" IS 'Nombre del seguro médico';
COMMENT ON COLUMN "medical_records"."insuranceMemberNumber" IS 'Número de afiliado';
COMMENT ON COLUMN "medical_records"."insurancePlanType" IS 'Tipo de plan de seguro';
COMMENT ON COLUMN "medical_records"."insurancePolicyNumber" IS 'Número de póliza';
COMMENT ON COLUMN "medical_records"."personalHistory" IS 'Antecedentes personales';
COMMENT ON COLUMN "medical_records"."familyHistory" IS 'Antecedentes familiares';
COMMENT ON COLUMN "medical_records"."observations" IS 'Observaciones adicionales';
COMMENT ON COLUMN "medical_records"."country" IS 'País del paciente';


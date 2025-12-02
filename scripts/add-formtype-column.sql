-- Script to add formType column to patient_forms table
-- Run this in Railway PostgreSQL if you get "notnull violation" error

-- Step 1: Add column if it doesn't exist (allowing null temporarily)
ALTER TABLE patient_forms 
ADD COLUMN IF NOT EXISTS formType VARCHAR(20);

-- Step 2: Set default value for existing rows
UPDATE patient_forms 
SET formType = 'appointment' 
WHERE formType IS NULL;

-- Step 3: Now make it NOT NULL with default (optional, but recommended)
-- ALTER TABLE patient_forms 
-- ALTER COLUMN formType SET DEFAULT 'appointment';
-- ALTER TABLE patient_forms 
-- ALTER COLUMN formType SET NOT NULL;

-- Step 4: Verify the column exists
SELECT column_name, data_type, is_nullable, column_default 
FROM information_schema.columns 
WHERE table_name = 'patient_forms' AND column_name = 'formType';


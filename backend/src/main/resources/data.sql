-- Fix class_id column to allow NULL values
ALTER TABLE students MODIFY COLUMN class_id BIGINT NULL;

-- Add ADMIN to users role enum if not already present
ALTER TABLE users MODIFY COLUMN role ENUM('ADMIN','TEACHER','ADVISER') NOT NULL;

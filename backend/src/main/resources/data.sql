-- Fix class_id column to allow NULL values
ALTER TABLE students MODIFY COLUMN class_id BIGINT NULL;

-- Older production databases used VARCHAR(255), while the original catalog
-- migration created CHAR(7). Normalize both to the exact CSS color width.
ALTER TABLE colors
    ALTER COLUMN hex_code TYPE VARCHAR(7)
    USING TRIM(hex_code);

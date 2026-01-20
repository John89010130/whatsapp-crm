-- ==============================================
-- FIX RLS POLICIES - MASTER DATABASE
-- ==============================================

-- Drop existing policies
DROP POLICY IF EXISTS "Masters can view all" ON master_users;
DROP POLICY IF EXISTS "Owners can view own data" ON owners;
DROP POLICY IF EXISTS "Owners can view own companies" ON companies;

-- Create new policies that allow API access with anon key
-- (for development - adjust for production)

-- Master Users: Allow read access
CREATE POLICY "Allow read master_users"
  ON master_users FOR SELECT
  USING (true);

-- Owners: Allow read access
CREATE POLICY "Allow read owners"
  ON owners FOR SELECT
  USING (true);

-- Companies: Allow read access
CREATE POLICY "Allow read companies"
  ON companies FOR SELECT
  USING (true);

-- Optional: Add insert/update policies as needed
CREATE POLICY "Allow insert owners"
  ON owners FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Allow update owners"
  ON owners FOR UPDATE
  USING (true);

CREATE POLICY "Allow insert companies"
  ON companies FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Allow update companies"
  ON companies FOR UPDATE
  USING (true);

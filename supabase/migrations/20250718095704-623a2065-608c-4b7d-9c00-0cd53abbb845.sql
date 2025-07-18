-- Fix infinite recursion in profiles RLS policies
-- Drop the existing recursive policies
DROP POLICY IF EXISTS "Admins can view all profiles" ON profiles;
DROP POLICY IF EXISTS "Admins can update all profiles" ON profiles;
DROP POLICY IF EXISTS "Admins can delete technician profiles" ON profiles;

-- Create a security definer function to check if user is admin
CREATE OR REPLACE FUNCTION is_admin(user_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.user_id = $1 
    AND profiles.user_type = 'admin'
  );
$$;

-- Create new non-recursive policies using the security definer function
CREATE POLICY "Admins can view all profiles" 
ON profiles 
FOR SELECT 
USING (is_admin(auth.uid()) OR auth.uid() = user_id);

CREATE POLICY "Admins can update all profiles" 
ON profiles 
FOR UPDATE 
USING (is_admin(auth.uid()) OR auth.uid() = user_id);

CREATE POLICY "Admins can delete technician profiles" 
ON profiles 
FOR DELETE 
USING (is_admin(auth.uid()) AND user_type = 'tecnico');

-- Also create policy for inserting technicians
CREATE POLICY "Admins can insert technician profiles" 
ON profiles 
FOR INSERT 
WITH CHECK (is_admin(auth.uid()) OR auth.uid() = user_id);
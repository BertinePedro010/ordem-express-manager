-- Add additional fields to profiles table for technician management
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS position TEXT,
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'ativo' CHECK (status IN ('ativo', 'inativo')),
ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES public.profiles(id);

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_profiles_user_type ON public.profiles(user_type);
CREATE INDEX IF NOT EXISTS idx_profiles_status ON public.profiles(status);

-- Update RLS policies to allow admin users to manage technicians
CREATE POLICY "Admins can view all profiles" 
ON public.profiles 
FOR SELECT 
TO authenticated
USING (
  auth.uid() IN (
    SELECT user_id FROM public.profiles WHERE user_type = 'admin'
  )
  OR auth.uid() = user_id
);

CREATE POLICY "Admins can update all profiles" 
ON public.profiles 
FOR UPDATE 
TO authenticated
USING (
  auth.uid() IN (
    SELECT user_id FROM public.profiles WHERE user_type = 'admin'
  )
  OR auth.uid() = user_id
);

CREATE POLICY "Admins can delete technician profiles" 
ON public.profiles 
FOR DELETE 
TO authenticated
USING (
  auth.uid() IN (
    SELECT user_id FROM public.profiles WHERE user_type = 'admin'
  )
  AND user_type = 'tecnico'
);
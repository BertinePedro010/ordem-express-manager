-- Create enum for user types
CREATE TYPE public.user_type AS ENUM ('admin', 'tecnico');

-- Create enum for OS status
CREATE TYPE public.os_status AS ENUM ('em_andamento', 'aguardando_peca', 'finalizado', 'entregue');

-- Create enum for payment status
CREATE TYPE public.payment_status AS ENUM ('pendente', 'pago');

-- Create profiles table for additional user information
CREATE TABLE public.profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  phone TEXT,
  user_type user_type NOT NULL DEFAULT 'tecnico',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create clients table
CREATE TABLE public.clients (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  phone TEXT,
  email TEXT,
  address TEXT,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create equipments table
CREATE TABLE public.equipments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  brand TEXT,
  model TEXT,
  serial_number TEXT,
  observations TEXT,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create service_orders table
CREATE TABLE public.service_orders (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  equipment_id UUID NOT NULL REFERENCES public.equipments(id) ON DELETE CASCADE,
  technician_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status os_status NOT NULL DEFAULT 'em_andamento',
  problem_description TEXT NOT NULL,
  solution_description TEXT,
  value DECIMAL(10,2),
  payment_status payment_status NOT NULL DEFAULT 'pendente',
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create media_files table
CREATE TABLE public.media_files (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  service_order_id UUID NOT NULL REFERENCES public.service_orders(id) ON DELETE CASCADE,
  file_type TEXT NOT NULL,
  file_url TEXT NOT NULL,
  file_name TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create signatures table
CREATE TABLE public.signatures (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  service_order_id UUID NOT NULL REFERENCES public.service_orders(id) ON DELETE CASCADE,
  signature_url TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.equipments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.service_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.media_files ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.signatures ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for profiles
CREATE POLICY "Users can view their own profile" ON public.profiles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can update their own profile" ON public.profiles FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Create RLS policies for clients
CREATE POLICY "Users can view their own clients" ON public.clients FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create their own clients" ON public.clients FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own clients" ON public.clients FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own clients" ON public.clients FOR DELETE USING (auth.uid() = user_id);

-- Create RLS policies for equipments
CREATE POLICY "Users can view their own equipments" ON public.equipments FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create their own equipments" ON public.equipments FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own equipments" ON public.equipments FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own equipments" ON public.equipments FOR DELETE USING (auth.uid() = user_id);

-- Create RLS policies for service_orders
CREATE POLICY "Users can view their own service orders" ON public.service_orders FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create their own service orders" ON public.service_orders FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own service orders" ON public.service_orders FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own service orders" ON public.service_orders FOR DELETE USING (auth.uid() = user_id);

-- Create RLS policies for media_files
CREATE POLICY "Users can view media files of their service orders" ON public.media_files FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.service_orders so 
    WHERE so.id = media_files.service_order_id AND so.user_id = auth.uid()
  )
);
CREATE POLICY "Users can create media files for their service orders" ON public.media_files FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.service_orders so 
    WHERE so.id = media_files.service_order_id AND so.user_id = auth.uid()
  )
);
CREATE POLICY "Users can delete media files of their service orders" ON public.media_files FOR DELETE USING (
  EXISTS (
    SELECT 1 FROM public.service_orders so 
    WHERE so.id = media_files.service_order_id AND so.user_id = auth.uid()
  )
);

-- Create RLS policies for signatures
CREATE POLICY "Users can view signatures of their service orders" ON public.signatures FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.service_orders so 
    WHERE so.id = signatures.service_order_id AND so.user_id = auth.uid()
  )
);
CREATE POLICY "Users can create signatures for their service orders" ON public.signatures FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.service_orders so 
    WHERE so.id = signatures.service_order_id AND so.user_id = auth.uid()
  )
);

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for automatic timestamp updates
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_clients_updated_at
  BEFORE UPDATE ON public.clients
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_equipments_updated_at
  BEFORE UPDATE ON public.equipments
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_service_orders_updated_at
  BEFORE UPDATE ON public.service_orders
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Enums
CREATE TYPE public.user_role AS ENUM ('admin', 'reception', 'instructor');
CREATE TYPE public.membership_status AS ENUM ('active', 'expired', 'frozen', 'cancelled');

-- 2. Users
-- Tabla renombrada a 'users'. Maneja Administradores (Supabase Auth) y Locales.
CREATE TABLE public.users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    auth_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL UNIQUE, 
    full_name TEXT NOT NULL,
    role user_role NOT NULL DEFAULT 'reception',
    
    -- Credenciales locales
    username TEXT UNIQUE, 
    password_hash TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 3. Clients
CREATE TABLE public.clients (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    full_name TEXT NOT NULL,
    phone_number TEXT,
    email TEXT, 
    registration_source TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 4. Classes
CREATE TABLE public.classes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE public.class_plans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    class_id UUID REFERENCES public.classes(id) ON DELETE CASCADE,
    plan_name TEXT NOT NULL, 
    duration_days INT NOT NULL, 
    price NUMERIC(10, 2) NOT NULL
);

-- 5. Payments
CREATE TABLE public.payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    client_id UUID REFERENCES public.clients(id) ON DELETE RESTRICT,
    user_id UUID REFERENCES public.users(id), 
    
    total_amount NUMERIC(10, 2) NOT NULL,
    payment_method TEXT NOT NULL, 
    transaction_date TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE public.memberships (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    payment_id UUID REFERENCES public.payments(id) ON DELETE CASCADE,
    client_id UUID REFERENCES public.clients(id) ON DELETE CASCADE,
    class_plan_id UUID REFERENCES public.class_plans(id),
    
    amount_paid NUMERIC(10, 2) NOT NULL,
    start_date DATE NOT NULL DEFAULT CURRENT_DATE,
    end_date DATE NOT NULL,
    
    status public.membership_status DEFAULT 'active',
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 6. Vistas
CREATE OR REPLACE VIEW public.vw_daily_revenue AS
SELECT 
    DATE(p.transaction_date) AS payment_date,
    p.payment_method,
    u.full_name AS user_name,
    COUNT(p.id) AS total_transactions,
    SUM(p.total_amount) AS total_revenue
FROM public.payments p
LEFT JOIN public.users u ON p.user_id = u.id
GROUP BY DATE(p.transaction_date), p.payment_method, u.full_name
ORDER BY payment_date DESC;

CREATE OR REPLACE VIEW public.vw_active_memberships AS
SELECT 
    m.id AS membership_id,
    c.full_name AS client_name,
    cl.name AS class_name,
    cp.plan_name,
    m.status,
    m.start_date,
    m.end_date,
    (m.end_date - CURRENT_DATE) AS days_remaining
FROM public.memberships m
JOIN public.clients c ON m.client_id = c.id
JOIN public.class_plans cp ON m.class_plan_id = cp.id
JOIN public.classes cl ON cp.class_id = cl.id
WHERE m.status = 'active' 
  AND m.end_date >= CURRENT_DATE;

CREATE OR REPLACE VIEW public.vw_class_headcounts AS
SELECT 
    cl.name AS class_name,
    COUNT(m.id) AS active_students
FROM public.classes cl
LEFT JOIN public.class_plans cp ON cl.id = cp.class_id
LEFT JOIN public.memberships m ON cp.id = m.class_plan_id 
    AND m.status = 'active'
    AND m.end_date >= CURRENT_DATE 
GROUP BY cl.name
ORDER BY active_students DESC;

-- 7. Alter 
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.classes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.class_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.memberships ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Acceso total a Terminales Conectadas" ON public.users FOR ALL TO authenticated USING (true);
CREATE POLICY "Acceso total a Terminales Conectadas" ON public.clients FOR ALL TO authenticated USING (true);
CREATE POLICY "Acceso total a Terminales Conectadas" ON public.classes FOR ALL TO authenticated USING (true);
CREATE POLICY "Acceso total a Terminales Conectadas" ON public.class_plans FOR ALL TO authenticated USING (true);
CREATE POLICY "Acceso total a Terminales Conectadas" ON public.payments FOR ALL TO authenticated USING (true);
CREATE POLICY "Acceso total a Terminales Conectadas" ON public.memberships FOR ALL TO authenticated USING (true);

-- Enums
CREATE TYPE public.app_role AS ENUM ('admin', 'teacher');
CREATE TYPE public.attendance_status AS ENUM ('present', 'absent', 'leave', 'late');
CREATE TYPE public.gender_type AS ENUM ('male', 'female', 'other');

-- Profiles
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL DEFAULT '',
  email TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "profiles readable by authenticated" ON public.profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "profiles self update" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

-- User roles
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role app_role NOT NULL,
  assigned_class_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public
AS $$ SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role) $$;

CREATE POLICY "users see own roles" ON public.user_roles FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "admins manage roles" ON public.user_roles FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Classes
CREATE TABLE public.classes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  display_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.classes TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.classes TO authenticated;
GRANT ALL ON public.classes TO service_role;
ALTER TABLE public.classes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "classes readable by authenticated" ON public.classes FOR SELECT TO authenticated USING (true);
CREATE POLICY "admins manage classes" ON public.classes FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Students
CREATE TABLE public.students (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admission_number TEXT NOT NULL UNIQUE,
  full_name TEXT NOT NULL,
  photo_url TEXT,
  date_of_birth DATE,
  gender gender_type,
  class_id UUID NOT NULL REFERENCES public.classes(id) ON DELETE RESTRICT,
  roll_number INT,
  parent_name TEXT,
  father_name TEXT,
  mother_name TEXT,
  mobile_number TEXT,
  address TEXT,
  emergency_contact TEXT,
  admission_date DATE DEFAULT CURRENT_DATE,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.students TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.students TO authenticated;
GRANT ALL ON public.students TO service_role;
ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;
CREATE POLICY "students readable by authenticated" ON public.students FOR SELECT TO authenticated USING (true);
CREATE POLICY "admins manage students" ON public.students FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Attendance
CREATE TABLE public.attendance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  class_id UUID NOT NULL REFERENCES public.classes(id) ON DELETE CASCADE,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  status attendance_status NOT NULL,
  marked_by UUID REFERENCES auth.users(id),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(student_id, date)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.attendance TO authenticated;
GRANT ALL ON public.attendance TO service_role;
ALTER TABLE public.attendance ENABLE ROW LEVEL SECURITY;
CREATE POLICY "attendance readable by authenticated" ON public.attendance FOR SELECT TO authenticated USING (true);
CREATE POLICY "teachers mark attendance for assigned class" ON public.attendance FOR INSERT TO authenticated
  WITH CHECK (
    public.has_role(auth.uid(), 'admin') OR
    class_id IN (SELECT assigned_class_id FROM public.user_roles WHERE user_id = auth.uid() AND role = 'teacher')
  );
CREATE POLICY "teachers edit today's attendance for assigned class" ON public.attendance FOR UPDATE TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin') OR
    (class_id IN (SELECT assigned_class_id FROM public.user_roles WHERE user_id = auth.uid() AND role = 'teacher') AND date = CURRENT_DATE)
  )
  WITH CHECK (
    public.has_role(auth.uid(), 'admin') OR
    (class_id IN (SELECT assigned_class_id FROM public.user_roles WHERE user_id = auth.uid() AND role = 'teacher') AND date = CURRENT_DATE)
  );
CREATE POLICY "admins delete attendance" ON public.attendance FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- updated_at trigger
CREATE OR REPLACE FUNCTION public.set_updated_at() RETURNS TRIGGER LANGUAGE plpgsql AS $$ BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;
CREATE TRIGGER attendance_updated_at BEFORE UPDATE ON public.attendance FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- New-user trigger: create profile; first user becomes admin, rest teachers
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE user_count INT;
BEGIN
  INSERT INTO public.profiles (id, full_name, email)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', ''), NEW.email);

  SELECT COUNT(*) INTO user_count FROM public.user_roles;
  IF user_count = 0 THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'admin');
  ELSE
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'teacher');
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Seed 4 classes
INSERT INTO public.classes (name, description, display_order) VALUES
  ('Developing Roots', 'Playgroup - our youngest learners', 1),
  ('Emerging Wings', 'Nursery - taking first steps in learning', 2),
  ('Ready To Fly 1', 'LKG - building foundations', 3),
  ('Ready To Fly 2', 'UKG - ready for big school', 4);

-- Seed 12 demo students (3 per class)
INSERT INTO public.students (admission_number, full_name, class_id, roll_number, gender, date_of_birth, parent_name, father_name, mother_name, mobile_number, address, admission_date)
SELECT * FROM (VALUES
  ('LM-2024-001', 'Aarav Sharma',    (SELECT id FROM public.classes WHERE name='Developing Roots'), 1, 'male'::gender_type,   '2022-03-14'::date, 'Rohit Sharma',  'Rohit Sharma',  'Priya Sharma',  '+919812345001', '12 Rose Ln, Bengaluru',   '2024-06-10'::date),
  ('LM-2024-002', 'Diya Patel',      (SELECT id FROM public.classes WHERE name='Developing Roots'), 2, 'female'::gender_type, '2022-01-22'::date, 'Amit Patel',    'Amit Patel',    'Neha Patel',    '+919812345002', '45 Lotus Rd, Bengaluru',  '2024-06-10'::date),
  ('LM-2024-003', 'Kabir Iyer',      (SELECT id FROM public.classes WHERE name='Developing Roots'), 3, 'male'::gender_type,   '2022-05-02'::date, 'Ravi Iyer',     'Ravi Iyer',     'Meera Iyer',    '+919812345003', '9 Jasmine St, Bengaluru', '2024-06-10'::date),
  ('LM-2024-004', 'Anaya Reddy',     (SELECT id FROM public.classes WHERE name='Emerging Wings'),   1, 'female'::gender_type, '2021-08-19'::date, 'Suresh Reddy',  'Suresh Reddy',  'Kavita Reddy',  '+919812345004', '22 Tulip Ave, Bengaluru', '2024-06-10'::date),
  ('LM-2024-005', 'Vihaan Nair',     (SELECT id FROM public.classes WHERE name='Emerging Wings'),   2, 'male'::gender_type,   '2021-11-05'::date, 'Deepak Nair',   'Deepak Nair',   'Anjali Nair',   '+919812345005', '7 Marigold Blvd, Bengaluru','2024-06-10'::date),
  ('LM-2024-006', 'Myra Kapoor',     (SELECT id FROM public.classes WHERE name='Emerging Wings'),   3, 'female'::gender_type, '2021-07-30'::date, 'Vikram Kapoor', 'Vikram Kapoor', 'Sonia Kapoor',  '+919812345006', '18 Daisy Ct, Bengaluru',  '2024-06-10'::date),
  ('LM-2024-007', 'Arjun Menon',     (SELECT id FROM public.classes WHERE name='Ready To Fly 1'),   1, 'male'::gender_type,   '2020-04-12'::date, 'Prakash Menon', 'Prakash Menon', 'Lakshmi Menon', '+919812345007', '3 Orchid Way, Bengaluru', '2024-06-10'::date),
  ('LM-2024-008', 'Ishani Gupta',    (SELECT id FROM public.classes WHERE name='Ready To Fly 1'),   2, 'female'::gender_type, '2020-09-25'::date, 'Manish Gupta',  'Manish Gupta',  'Ritu Gupta',    '+919812345008', '11 Lily St, Bengaluru',   '2024-06-10'::date),
  ('LM-2024-009', 'Reyansh Verma',   (SELECT id FROM public.classes WHERE name='Ready To Fly 1'),   3, 'male'::gender_type,   '2020-12-08'::date, 'Sandeep Verma', 'Sandeep Verma', 'Pooja Verma',   '+919812345009', '27 Poppy Rd, Bengaluru',  '2024-06-10'::date),
  ('LM-2024-010', 'Saanvi Rao',      (SELECT id FROM public.classes WHERE name='Ready To Fly 2'),   1, 'female'::gender_type, '2019-06-17'::date, 'Rajesh Rao',    'Rajesh Rao',    'Sneha Rao',     '+919812345010', '5 Sunflower Ln, Bengaluru','2024-06-10'::date),
  ('LM-2024-011', 'Aditya Joshi',    (SELECT id FROM public.classes WHERE name='Ready To Fly 2'),   2, 'male'::gender_type,   '2019-02-28'::date, 'Nikhil Joshi',  'Nikhil Joshi',  'Aarti Joshi',   '+919812345011', '14 Iris Ave, Bengaluru',  '2024-06-10'::date),
  ('LM-2024-012', 'Kiara Malhotra',  (SELECT id FROM public.classes WHERE name='Ready To Fly 2'),   3, 'female'::gender_type, '2019-10-14'::date, 'Arun Malhotra', 'Arun Malhotra', 'Simran Malhotra','+919812345012', '30 Camellia Rd, Bengaluru','2024-06-10'::date)
) AS s;

-- Seed some attendance for the last 14 days (roughly 90% present)
INSERT INTO public.attendance (student_id, class_id, date, status)
SELECT s.id, s.class_id, d::date,
  CASE
    WHEN random() < 0.85 THEN 'present'::attendance_status
    WHEN random() < 0.55 THEN 'absent'::attendance_status
    WHEN random() < 0.55 THEN 'late'::attendance_status
    ELSE 'leave'::attendance_status
  END
FROM public.students s
CROSS JOIN generate_series(CURRENT_DATE - INTERVAL '13 days', CURRENT_DATE - INTERVAL '1 day', INTERVAL '1 day') d
WHERE EXTRACT(DOW FROM d) NOT IN (0)  -- skip sundays
ON CONFLICT (student_id, date) DO NOTHING;

-- Create app_role enum for admin roles
CREATE TYPE public.app_role AS ENUM ('admin', 'candidate');

-- Create user_roles table
CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE (user_id, role)
);

-- Enable RLS on user_roles
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Create profiles table
CREATE TABLE public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  regno text UNIQUE NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Create questions table
CREATE TABLE public.questions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  question_text text NOT NULL,
  direction integer NOT NULL CHECK (direction IN (1, -1)),
  trait text NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.questions ENABLE ROW LEVEL SECURITY;

-- Create responses table
CREATE TABLE public.responses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  question_id uuid REFERENCES public.questions(id) ON DELETE CASCADE NOT NULL,
  raw_score integer NOT NULL CHECK (raw_score BETWEEN 1 AND 7),
  final_score integer NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE (user_id, question_id)
);

ALTER TABLE public.responses ENABLE ROW LEVEL SECURITY;

-- Create test_submissions table to track completion
CREATE TABLE public.test_submissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  submitted_at timestamptz DEFAULT now(),
  total_score integer
);

ALTER TABLE public.test_submissions ENABLE ROW LEVEL SECURITY;

-- Create security definer function to check roles
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- RLS Policies for profiles
CREATE POLICY "Users can view their own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Admins can view all profiles"
  ON public.profiles FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for questions
CREATE POLICY "Authenticated users can view questions"
  ON public.questions FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins can insert questions"
  ON public.questions FOR INSERT
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update questions"
  ON public.questions FOR UPDATE
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete questions"
  ON public.questions FOR DELETE
  USING (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for responses
CREATE POLICY "Users can view their own responses"
  ON public.responses FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all responses"
  ON public.responses FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Users can insert their own responses"
  ON public.responses FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own responses"
  ON public.responses FOR UPDATE
  USING (auth.uid() = user_id);

-- RLS Policies for test_submissions
CREATE POLICY "Users can view their own submission"
  ON public.test_submissions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all submissions"
  ON public.test_submissions FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Users can insert their own submission"
  ON public.test_submissions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- RLS Policies for user_roles
CREATE POLICY "Users can view their own roles"
  ON public.user_roles FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all roles"
  ON public.user_roles FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can insert roles"
  ON public.user_roles FOR INSERT
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update roles"
  ON public.user_roles FOR UPDATE
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete roles"
  ON public.user_roles FOR DELETE
  USING (public.has_role(auth.uid(), 'admin'));

-- Create trigger function for updated_at
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add updated_at triggers
CREATE TRIGGER set_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER set_questions_updated_at
  BEFORE UPDATE ON public.questions
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- Create function to handle new user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, name, regno)
  VALUES (
    NEW.id,
    NEW.raw_user_meta_data->>'name',
    NEW.raw_user_meta_data->>'regno'
  );
  
  -- Assign candidate role by default
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'candidate');
  
  RETURN NEW;
END;
$$;

-- Trigger to create profile on user signup
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();
-- Fusion de 2 ficheros que compartian la version 20260315.
-- La CLI de Supabase identifica cada migracion por los digitos previos al
-- primer '_', asi que varios ficheros con la misma version chocan contra la
-- clave primaria de schema_migrations al aplicarlos desde cero. Produccion
-- tiene una sola fila para esta version, de modo que un unico fichero es
-- justo lo que ya hay aplicado alli.

-- ===== 20260315_create_admin_tasks.sql =====
-- Internal AFA task management for admin users

CREATE TABLE IF NOT EXISTS public.admin_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'blocked', 'done')),
  priority TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  due_date DATE,
  assigned_to UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL DEFAULT auth.uid(),
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_admin_tasks_status ON public.admin_tasks(status);
CREATE INDEX IF NOT EXISTS idx_admin_tasks_priority ON public.admin_tasks(priority);
CREATE INDEX IF NOT EXISTS idx_admin_tasks_due_date ON public.admin_tasks(due_date);
CREATE INDEX IF NOT EXISTS idx_admin_tasks_assigned_to ON public.admin_tasks(assigned_to);

ALTER TABLE public.admin_tasks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can read admin tasks" ON public.admin_tasks;
CREATE POLICY "Admins can read admin tasks"
  ON public.admin_tasks
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

DROP POLICY IF EXISTS "Admins can insert admin tasks" ON public.admin_tasks;
CREATE POLICY "Admins can insert admin tasks"
  ON public.admin_tasks
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

DROP POLICY IF EXISTS "Admins can update admin tasks" ON public.admin_tasks;
CREATE POLICY "Admins can update admin tasks"
  ON public.admin_tasks
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

DROP POLICY IF EXISTS "Admins can delete admin tasks" ON public.admin_tasks;
CREATE POLICY "Admins can delete admin tasks"
  ON public.admin_tasks
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

DROP TRIGGER IF EXISTS update_admin_tasks_updated_at ON public.admin_tasks;
CREATE TRIGGER update_admin_tasks_updated_at
  BEFORE UPDATE ON public.admin_tasks
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

-- ===== 20260315_add_admin_tasks_subtasks_tags_assignee_name.sql =====
-- Add free-text assignee, tags, and subtasks support for admin_tasks

ALTER TABLE public.admin_tasks
  ADD COLUMN IF NOT EXISTS assignee_name TEXT,
  ADD COLUMN IF NOT EXISTS tags TEXT[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS subtasks JSONB NOT NULL DEFAULT '[]'::jsonb;

CREATE INDEX IF NOT EXISTS idx_admin_tasks_assignee_name
  ON public.admin_tasks(assignee_name);

CREATE INDEX IF NOT EXISTS idx_admin_tasks_tags
  ON public.admin_tasks
  USING GIN(tags);

CREATE INDEX IF NOT EXISTS idx_admin_tasks_subtasks
  ON public.admin_tasks
  USING GIN(subtasks);

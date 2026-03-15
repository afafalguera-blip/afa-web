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

CREATE TABLE IF NOT EXISTS lists (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL
);

CREATE TABLE IF NOT EXISTS tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  list_id uuid NOT NULL REFERENCES lists (id) ON DELETE CASCADE,
  title text NOT NULL,
  due_date date,
  done boolean NOT NULL DEFAULT false
);

CREATE INDEX IF NOT EXISTS tasks_list_id_idx ON tasks (list_id);

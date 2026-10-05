CREATE TABLE public.notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
  title text NOT NULL CHECK (char_length(btrim(title)) BETWEEN 1 AND 10000),
  color text NOT NULL DEFAULT 'primary'
    CHECK (color IN ('primary', 'warning', 'error', 'success', 'secondary')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX notes_owner_created_at_idx
  ON public.notes (owner_id, created_at DESC);

ALTER TABLE public.notes ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.notes TO authenticated;

CREATE POLICY notes_owner_all
  ON public.notes FOR ALL TO authenticated
  USING (owner_id = auth.uid())
  WITH CHECK (owner_id = auth.uid());

CREATE TABLE public.tickets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
  ticket_title text NOT NULL CHECK (char_length(btrim(ticket_title)) BETWEEN 1 AND 200),
  ticket_description text NOT NULL CHECK (char_length(btrim(ticket_description)) BETWEEN 1 AND 5000),
  status text NOT NULL DEFAULT 'Open' CHECK (status IN ('Open', 'Pending', 'Closed')),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX tickets_owner_created_at_idx
  ON public.tickets (owner_id, created_at DESC);

ALTER TABLE public.tickets ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT, DELETE ON public.tickets TO authenticated;

CREATE POLICY tickets_owner_select
  ON public.tickets FOR SELECT TO authenticated
  USING (owner_id = auth.uid());

CREATE POLICY tickets_owner_insert
  ON public.tickets FOR INSERT TO authenticated
  WITH CHECK (owner_id = auth.uid());

CREATE POLICY tickets_owner_delete
  ON public.tickets FOR DELETE TO authenticated
  USING (owner_id = auth.uid());

CREATE TABLE public.blog_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_slug text NOT NULL CHECK (char_length(btrim(post_slug)) BETWEEN 1 AND 180),
  user_id uuid NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
  content text NOT NULL CHECK (char_length(btrim(content)) BETWEEN 1 AND 2000),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX blog_comments_post_created_at_idx
  ON public.blog_comments (post_slug, created_at DESC);

ALTER TABLE public.blog_comments ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT ON public.blog_comments TO authenticated;

CREATE POLICY blog_comments_read_authenticated
  ON public.blog_comments FOR SELECT TO authenticated
  USING (true);

CREATE POLICY blog_comments_insert_self
  ON public.blog_comments FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

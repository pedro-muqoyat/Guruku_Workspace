CREATE TABLE public.blog_posts (
  slug text PRIMARY KEY CHECK (char_length(btrim(slug)) BETWEEN 1 AND 180),
  title text NOT NULL CHECK (char_length(btrim(title)) BETWEEN 1 AND 240),
  content text NOT NULL CHECK (char_length(btrim(content)) BETWEEN 1 AND 30000),
  cover_image text,
  category text NOT NULL CHECK (char_length(btrim(category)) BETWEEN 1 AND 80),
  is_featured boolean NOT NULL DEFAULT false,
  published_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX blog_posts_published_at_idx
  ON public.blog_posts (published_at DESC)
  WHERE published_at IS NOT NULL;

ALTER TABLE public.blog_posts ENABLE ROW LEVEL SECURITY;

GRANT SELECT ON public.blog_posts TO authenticated;

CREATE POLICY blog_posts_read_published
  ON public.blog_posts FOR SELECT TO authenticated
  USING (published_at IS NOT NULL);

ALTER TABLE public.blog_comments
  ADD CONSTRAINT blog_comments_post_slug_fkey
  FOREIGN KEY (post_slug) REFERENCES public.blog_posts(slug) ON DELETE CASCADE;

ALTER TABLE public.blog_comments
  ADD COLUMN author_name text NOT NULL DEFAULT 'User'
  CHECK (char_length(btrim(author_name)) BETWEEN 1 AND 160);

DROP POLICY blog_comments_insert_self ON public.blog_comments;

CREATE POLICY blog_comments_insert_self
  ON public.blog_comments FOR INSERT TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    AND EXISTS (
      SELECT 1
      FROM public.blog_posts AS post
      WHERE post.slug = blog_comments.post_slug
        AND post.published_at IS NOT NULL
    )
  );

ALTER TABLE public.tickets
  ADD COLUMN ticket_date date NOT NULL DEFAULT CURRENT_DATE;

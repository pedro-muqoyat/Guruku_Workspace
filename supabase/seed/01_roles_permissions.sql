INSERT INTO public.roles (key)
VALUES
    ('ADMIN'),
    ('WAKA'),
    ('WALI'),
    ('WALIKELAS'),
    ('GURU'),
    ('TU'),
    ('MURID')
ON CONFLICT (key) DO NOTHING;
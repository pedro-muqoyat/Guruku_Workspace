INSERT INTO public.user_profiles (id, full_name, role)
SELECT
    auth_user.id,
    COALESCE(
        NULLIF(auth_user.raw_user_meta_data ->> 'full_name', ''),
        CASE lower(split_part(auth_user.email, '@', 1))
            WHEN 'admin' THEN 'Super Administrator'
            WHEN 'waka' THEN 'Wakil Kepala Sekolah Kurikulum'
            WHEN 'guru1' THEN 'Guru Mata Pelajaran'
        END
    ),
    CASE lower(split_part(auth_user.email, '@', 1))
        WHEN 'admin' THEN 'ADMIN'
        WHEN 'waka' THEN 'WAKA'
        WHEN 'guru1' THEN 'GURU'
    END
FROM auth.users AS auth_user
WHERE lower(auth_user.email) IN (
    'admin@sekolah.id',
    'waka@sekolah.id',
    'guru1@sekolah.id'
)
ON CONFLICT (id) DO UPDATE
SET full_name = EXCLUDED.full_name,
        role = EXCLUDED.role;

INSERT INTO public.classes (id, name)
VALUES ('00000000-0000-4000-8000-000000000001', 'Kelas 9A Seed')
ON CONFLICT (id) DO UPDATE
SET name = EXCLUDED.name;

INSERT INTO public.subjects (id, name)
VALUES ('00000000-0000-4000-8000-000000000002', 'Informatika Seed')
ON CONFLICT (id) DO UPDATE
SET name = EXCLUDED.name;
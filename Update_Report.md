Saya akan menyusun laporan dari dokumentasi proyek, konfigurasi, skema/migrasi database, dan implementasi fitur yang relevan. Saya tidak akan mengubah file apa pun; saya mulai dengan memeriksa panduan repo dan sumber-sumber utama agar laporan membedakan fakta yang terdokumentasi dari hal yang perlu disimpulkan.

Read 

Read skill `antislop`, lines 1 to 220

Read 

Read 

Read memory

Dari pemeriksaan awal, `README` masih menjelaskan template admin generik, sementara konfigurasi menunjukkan aplikasi Next.js yang memakai Supabase dan domain akademik. Saya akan memakai spesifikasi fitur serta kode aksi/database sebagai sumber utama; setelah itu saya bisa memberi gambaran arsitektur dan menandai klaim performa yang belum punya bukti pengukuran.

Searched for files matching `**/src/app/actions/**`, 6 matches

Searched for files matching `**/supabase/migrations/*.sql`, 7 matches

Read 

Read 

Read 

Read 

Spesifikasi menguraikan ruang lingkup cukup jelas: operasi akademik harian dan dasbor yang berbeda per lima peran. Keduanya berstatus *Draft*, jadi saya sedang mencocokkannya dengan tabel, kebijakan RLS, RPC, dan alur server yang benar-benar ada sebelum menyebut fitur sebagai sudah diimplementasikan.

Read , lines 1 to 300

Read 

Read 

Read 

Read 

Read 

Read , lines 300 to 407

Searched for files matching `**/src/app/(DashboardLayout)/**/page.tsx`, 20 matches

Read 

Read 

Read , lines 1 to 320

Read 

Pola teknisnya mulai tampak: server actions memvalidasi input dan memakai sesi Supabase pengguna, sementara PostgreSQL RLS serta RPC membatasi akses; ada juga materialized view untuk ringkasan dashboard. Saya sedang memeriksa sisi impor/ekspor, rute yang aktif, dan test yang tersedia agar bagian fitur dan performa tidak hanya mengulang spesifikasi.

Read 

Read 

Read 

Read 

Read , lines 1 to 260

Read 

Searched for regex `Papa|XLSX|export|download|parseCsv|csv` (`**/src/app/components/features/**`), 24 results

Searched for regex `getTeacherAttendanceData|getClassProgressData|getTopStudentsData|calculateFinalGrades|submitAttendance|submitTeachingJournal` (`**/src/app/**`), 33 results

Searched for files matching `**/src/app/api/**`, 5 matches

Searched for files matching `**/src/app/components/features/**`, 5 matches

Read 

Read 

Read 

Read 

Read 

Read 

Read 

Read 

Searched for regex `export|audit_logs|grading_policies|academic_periods|athlete_statuses|import_batches|schedule_change_requests` (`**/src/**`), 201 results

Read , lines 300 to 560

Read 

Read 

Read 

Read 

# Laporan Guruku Workspace

**Ringkasan:** Guruku Workspace adalah aplikasi web untuk membantu sekolah mengelola kegiatan akademik dan operasional dalam satu tempat. Sasaran utamanya adalah mengurangi pencatatan berulang dan memberi tiap peran sekolah akses sesuai tugasnya. Laporan ini berdasarkan spesifikasi dan kode di workspace, bukan pengujian terhadap lingkungan produksi. Tidak ada file yang diubah.

## Tujuan dan pengguna

Spesifikasi akademik menetapkan lima peran: Administrator, Waka Kurikulum, Walikelas, Guru Mata Pelajaran, dan Operator Tata Usaha (TU). Siswa juga ada sebagai entitas data, tetapi spesifikasi saat ini tidak menetapkan dashboard siswa. Cakupan yang direncanakan meliputi master data, jadwal, presensi, jurnal mengajar, nilai, pemantauan kelas, notifikasi anomali, serta impor dan ekspor data. Rincian sasaran ada di spesifikasi operasi akademik dan spesifikasi dasbor berbasis peran.

## Arsitektur dan teknologi

Aplikasi dibangun sebagai satu proyek **Next.js App Router** dengan **React** dan **TypeScript**. Halaman dan komponennya berada di `app`; operasi data yang memerlukan autentikasi umumnya dilakukan melalui **Server Actions**, sedangkan beberapa endpoint menggunakan **Route Handlers**. Konfigurasi dependensi tercatat di `package.json`.

Backend menggunakan **Supabase**: Supabase Auth untuk identitas, PostgreSQL untuk data, dan pustaka `@supabase/ssr` untuk sesi berbasis cookie di server. Pemeriksaan sesi juga dilakukan di `proxy.ts`. Antarmuka memakai Tailwind CSS 4 serta komponen Radix/shadcn dan pustaka ikon, tabel, grafik, tanggal, CSV, dan Excel. Ada pendaftaran service worker melalui `ServiceWorkerRegister.tsx`.

## Database dan keamanan

Skema inti PostgreSQL mencakup peran dan profil pengguna, kelas, mata pelajaran, siswa, jadwal, sesi kelas, presensi, nilai, jurnal mengajar, dan notifikasi. Relasi serta batasan seperti nilai 0–100 dan keunikan catatan presensi ditetapkan dalam migrasi skema inti.

Pembatasan akses menggunakan **Row-Level Security (RLS)**. Kebijakan mengaitkan akses guru dengan jadwalnya dan akses Walikelas dengan kelas yang ditugaskan. RPC dasbor juga memeriksa identitas dan peran pemanggil di database; implementasinya terlihat pada migrasi RPC dasbor. Migrasi pembatasan akses TU mempersempit akses langsung TU ke data siswa dan akademik.

Ada beberapa ketidaksesuaian penting antara rancangan dan skema saat ini:

- Spesifikasi menghendaki audit perubahan, periode akademik, kebijakan nilai yang berversi, serta status atlet yang berlaku per periode. Model lebih lengkapnya dijabarkan dalam data model akademik, tetapi tabel-tabel tersebut belum tampak pada migrasi inti yang ditinjau.
- Peran di database menggunakan `WAKA`, sementara spesifikasi dasbor menetapkan `WAKA_KURIKULUM`. Hal ini terlihat juga pada implementasi dasbor: Waka Kurikulum belum mendapat tampilan analitik.
- Formula nilai atlet pada kode saat ini mengatur bobot kehadiran menjadi 0% dan membagi bobot lain menjadi 40% formatif serta 60% sumatif. Spesifikasi menyatakan komponen kehadiran tetap berbobot 25% untuk atlet. Perilaku ini perlu diselaraskan sebelum dianggap memenuhi kebijakan nilai.

## Fitur yang terlihat di kode

Alur akademik yang sudah memiliki implementasi mencakup:

- **Presensi kelas:** guru dapat mengirim presensi per sesi; server memvalidasi sesi, penugasan guru, dan keanggotaan siswa. Lihat attendance action.
- **Jurnal mengajar:** catatan materi dikaitkan ke sesi dan hanya dapat dikirim oleh guru yang ditugaskan. Lihat teaching journal action.
- **Input dan perhitungan nilai:** nilai dapat disimpan per siswa dan komponen; tersedia perhitungan ringkasan nilai melalui grading action dan halaman rapor.
- **Ringkasan dasbor:** tersedia RPC untuk agregasi aktivitas guru dan peringkat nilai harian, ditampilkan melalui komponen dasbor. Dashboard actions
- **Impor nilai:** halaman impor menerima CSV dan Excel, memvalidasi baris, lalu mengirim data dalam kelompok 100 baris. `DataIngestion.tsx`

Dasbor berbasis peran belum lengkap. Tampilan operasional untuk Admin/TU dan beberapa komponen untuk guru serta Walikelas sudah dirangkai, tetapi tampilan eksekutif Waka masih menyatakan belum tersedia. Dasbor guru dan Walikelas juga mengambil penugasan terbatas, bukan keseluruhan itinerary, tren periode, dan metrik lengkap seperti yang diminta spesifikasi. Ekspor e-Rapor dan rekap penggajian belum terlihat pada alur fitur yang ditinjau.

## Performa dan kesiapan

Ada beberapa fondasi untuk menangani query dasbor: materialized view, indeks, batas rentang tanggal pada RPC, dan pemanggilan paralel untuk sebagian query. Materialized view dirancang diperbarui oleh `pg_cron` setiap hari; definisinya ada di migrasi materialized view.

Namun, agregat tersebut memakai tanggal `created_at` UTC dan dapat tertinggal sampai jadwal refresh berikutnya. Karena itu, data ringkasan harian belum tentu mewakili `session_date` atau status terkini. Fitur impor juga belum membuktikan target 1.000 matriks berjalan tanpa timeout: pengiriman dilakukan berurutan per kelompok 100, sementara file dibaca di browser. Ada file worker CSV di repo, tetapi komponen impor yang ditinjau tidak menggunakannya.

Konfigurasi Next.js menetapkan `images.unoptimized: true`, sehingga optimasi gambar bawaan Next.js dinonaktifkan. Di sisi branding, metadata utama masih memakai judul template “TailwindAdmin - Nextjs” dan bahasa dokumen `en`; README juga masih menjelaskan template admin generik.

Repo menyediakan beberapa skrip E2E, termasuk `test-dashboard-rpc.js`, yang dapat mencatat waktu respons dengan konfigurasi lingkungan yang sesuai. Tetapi `package.json` belum mendefinisikan test runner khusus, dan tidak ada hasil benchmark yang dapat dijadikan bukti performa dalam pemeriksaan ini. Target seperti impor 1.000 baris, akses lintas peran, dan respons dasbor dua detik masih perlu dibuktikan lewat pengujian.

## Kesimpulan

Fondasi teknis Guruku sudah mencakup autentikasi Supabase, pembatasan data di database, operasi akademik inti, dan agregasi untuk dasbor. Fokus berikutnya yang paling menentukan adalah menyelaraskan skema dan peran dengan spesifikasi, melengkapi dasbor Waka serta alur ekspor, memastikan formula nilai atlet sesuai kebijakan, dan mengukur target performa dengan data uji.
# Feature Specification: Guruku Academic Operations

**Feature Branch**: `001-academic-operations`

**Created**: 2026-09-29

**Status**: Draft

**Input**: User description: Rancang ruang kerja akademik sekolah yang mengurangi entri ganda dan meningkatkan konsistensi serta auditabilitas melalui pengelolaan master data, jadwal, presensi, jurnal mengajar, penilaian, notifikasi anomali, dan impor/ekspor massal untuk lima peran sekolah.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Siapkan Data dan Akses Akademik (Priority: P1)

Administrator mengelola data siswa, guru, kelas, jadwal, dan kewenangan pengguna sebagai dasar operasi akademik. Administrator juga menjadi pemegang otoritas untuk pemulihan sistem.

**Why this priority**: Data induk dan akses yang benar merupakan prasyarat agar jadwal, presensi, nilai, dan laporan dapat dikaitkan dengan orang serta kelas yang tepat.

**Independent Test**: Buat dan ubah satu data untuk setiap jenis master, tetapkan pengguna ke peran dan penugasan, lalu pastikan pengguna hanya dapat melihat atau mengubah data sesuai kewenangannya. Verifikasi tindakan istimewa dapat ditelusuri ke pelakunya.

**Acceptance Scenarios**:

1. **Given** administrator yang berwenang dan data siswa yang valid, **When** administrator menambahkan siswa ke kelas, **Then** siswa muncul sebagai anggota kelas tersebut dan perubahan tercatat.
2. **Given** guru dengan jadwal dan kelas yang ditugaskan, **When** guru membuka pekerjaan harian, **Then** guru hanya dapat mengakses kelas dan sesi yang ditugaskan kepadanya.
3. **Given** pengguna tanpa hak administrasi, **When** pengguna mencoba mengubah master data atau menjalankan pemulihan sistem, **Then** tindakan ditolak dan penolakan dapat diaudit.

---

### User Story 2 - Jalankan Kegiatan Mengajar dan Penilaian (Priority: P1)

Guru Mata Pelajaran menggunakan jadwal yang mengikat penugasannya untuk mencatat presensi fisik siswa, jurnal materi kelas, dan matriks penilaian Formatif, Sumatif, STS, serta SAS. Sistem menghitung agregat menggunakan kebijakan bobot aktif.

**Why this priority**: Siklus kerja guru merupakan sumber utama catatan akademik harian dan menggantikan pencatatan berulang untuk pelaporan.

**Independent Test**: Dengan satu kelas dan sesi yang ditugaskan, catat presensi, jurnal, dan nilai beberapa siswa; verifikasi catatan terhubung ke sesi yang benar, agregat mengikuti kebijakan aktif, dan guru di luar penugasan tidak dapat mengubahnya.

**Acceptance Scenarios**:

1. **Given** guru yang ditugaskan pada sesi kelas yang sedang berlangsung, **When** guru menyimpan presensi fisik dan jurnal materi, **Then** kedua catatan terkait ke sesi, kelas, mata pelajaran, dan guru tersebut.
2. **Given** kebijakan nilai aktif dan matriks siswa yang lengkap, **When** guru menyimpan nilai, **Then** sistem menghitung dan menampilkan agregat serta masukan pembentuknya.
3. **Given** guru yang tidak ditugaskan pada sesi tersebut, **When** guru mencoba mencatat presensi, jurnal, atau nilai, **Then** sistem menolak perubahan.
4. **Given** data penilaian yang diimpor berisi baris tidak valid, **When** guru meninjau hasil impor, **Then** baris yang ditolak dan alasannya dapat diketahui tanpa menghilangkan keberhasilan baris valid.
5. **Given** siswa dengan status Siswa Atlet resmi yang berlaku pada periode akademik, **When** siswa absen secara fisik, **Then** presensi tetap dicatat tetapi nilai komponen Kehadiran tetap mendapat bobot penuh 25% tanpa pengurangan karena absensi tersebut.

---

### User Story 3 - Cegah Konflik dan Pantau Kegiatan Mengajar (Priority: P1)

Waka Kurikulum mengatur dan memantau jadwal. Sistem memperingatkan bentrok jadwal guru sebelum jadwal diberlakukan dan menampilkan status mengajar guru untuk membantu menemukan kelas tanpa pengajar tervalidasi.

**Why this priority**: Deteksi konflik sebelum semester dimulai dan visibilitas kelas kosong mencegah masalah operasional sebelum berdampak pada kegiatan belajar.

**Independent Test**: Masukkan dua sesi yang waktunya bertumpang tindih untuk guru yang sama dan pastikan konflik ditampilkan sebelum jadwal dipublikasikan. Pada sesi berjalan, verifikasi status mengajar berubah berdasarkan validasi kegiatan mengajar.

**Acceptance Scenarios**:

1. **Given** jadwal yang belum dipublikasikan, **When** Waka Kurikulum membuat sesi yang bertumpang tindih dengan sesi guru yang sama, **Then** sistem menunjukkan konflik pada alur penyusunan jadwal sebelum jadwal dapat diberlakukan.
2. **Given** sesi kelas yang sedang berjalan, **When** belum ada kegiatan mengajar yang tervalidasi, **Then** sesi ditampilkan sebagai belum memiliki pengajar tervalidasi.
3. **Given** kegiatan mengajar telah divalidasi untuk sesi tersebut, **When** Waka Kurikulum melihat status operasional, **Then** sesi ditampilkan dengan status mengajar yang sesuai.

---

### User Story 4 - Pantau dan Rekap Kelas (Priority: P2)

Walikelas memantau kelas yang menjadi tanggung jawabnya, menerima peringatan ketika siswa absen pada tiga sesi kelas berturut-turut, melihat agregat nilai per mata pelajaran, dan mencetak rekap sebagai fondasi e-Rapor.

**Why this priority**: Walikelas memerlukan sinyal dini dan ringkasan lintas mata pelajaran tanpa mengulang entri nilai yang sudah dibuat guru.

**Independent Test**: Masukkan presensi untuk tiga sesi berurutan pada satu siswa di kelas binaan, verifikasi satu peringatan diterima, lalu cocokkan agregat nilai dan hasil cetak dengan catatan sumber.

**Acceptance Scenarios**:

1. **Given** siswa pada kelas binaan Walikelas absen pada dua sesi kelas berturut-turut, **When** presensi sesi ketiga juga mencatat ketidakhadiran, **Then** Walikelas menerima peringatan dini yang merujuk siswa dan sesi pemicunya.
2. **Given** catatan nilai yang telah disimpan oleh guru, **When** Walikelas membuka rekap kelas, **Then** agregat tampil per mata pelajaran tanpa meminta Walikelas memasukkan ulang nilai.
3. **Given** rekap kelas binaan, **When** Walikelas mencetak atau mengekspor rekap, **Then** hasilnya mencakup catatan yang berhak dilihat Walikelas dan dapat digunakan sebagai fondasi e-Rapor.
4. **Given** Walikelas yang tidak ditugaskan pada suatu kelas, **When** Walikelas mencoba membuka atau mencetak rekap kelas tersebut, **Then** akses ditolak.

---

### User Story 5 - Validasi Rekap Presensi Guru (Priority: P2)

Operator Tata Usaha melihat agregasi presensi guru yang didasarkan pada kegiatan mengajar tervalidasi dan mengekspor rekap sebagai dasar validasi penggajian.

**Why this priority**: Rekapitulasi yang bersumber dari bukti mengajar mengurangi penghitungan manual dan mencegah presensi gerbang dianggap sebagai bukti mengajar.

**Independent Test**: Bandingkan rekap TU dengan beberapa sesi mengajar tervalidasi dan tidak tervalidasi; pastikan hanya aktivitas yang memenuhi aturan validasi yang dihitung dan data ekspor cocok dengan rekap.

**Acceptance Scenarios**:

1. **Given** sesi guru yang telah dan belum divalidasi, **When** Operator TU membuka rekap presensi, **Then** agregat membedakan aktivitas tervalidasi dan tidak tervalidasi dan tidak memakai presensi gerbang sebagai pengganti validasi mengajar.
2. **Given** rekap periode yang dipilih, **When** Operator TU mengekspor data, **Then** setiap catatan tervalidasi muncul satu kali dalam format yang disepakati untuk validasi penggajian.
3. **Given** Operator TU tanpa kewenangan master data, **When** operator mencoba mengubah jadwal atau nilai siswa, **Then** perubahan ditolak.

### Edge Cases

- Dua sesi guru dimulai atau berakhir tepat pada batas waktu yang sama; sistem harus memakai aturan interval yang konsisten dan menjelaskan apakah sesi tersebut bertabrakan.
- Sesi jadwal dibatalkan, dipindah, atau belum memiliki guru; status mengajar dan pemeriksaan konflik harus diperbarui tanpa meninggalkan alert usang.
- Siswa pindah kelas atau periode akademik berubah; urutan sesi untuk ambang tiga absensi harus mengikuti kelas dan periode yang berlaku.
- Presensi dikoreksi setelah memicu peringatan; sistem harus memperbarui status peringatan dan mempertahankan jejak koreksi.
- Impor berisi berkas kosong, kolom wajib hilang, identitas tidak dikenal, baris duplikat, atau campuran baris valid dan tidak valid; hasil harus menjelaskan penolakan tanpa menggandakan catatan yang sudah diterima.
- Ekspor diminta tanpa data atau dengan filter periode yang tidak memiliki catatan; sistem harus memberi hasil kosong yang jelas, bukan data periode lain.
- Kebijakan bobot berubah setelah nilai tersimpan; sistem tidak boleh mengubah hasil historis secara diam-diam.
- Siswa Atlet tetap memerlukan catatan presensi fisik meskipun aturan penalti kehadirannya berbeda.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: Sistem MUST menyediakan lima peran terpisah: Administrator, Waka Kurikulum, Walikelas, Guru Mata Pelajaran, dan Operator Tata Usaha.
- **FR-002**: Sistem MUST membatasi setiap pengguna pada tindakan dan catatan yang diizinkan oleh peran serta penugasannya, dan MUST menolak akses di luar batas tersebut.
- **FR-003**: Sistem MUST mengizinkan Administrator mengelola master data siswa, guru, kelas, dan jadwal serta menjalankan pemulihan sistem yang tercatat.
- **FR-004**: Sistem MUST mengikat pencatatan presensi, jurnal materi, dan nilai Guru Mata Pelajaran ke jadwal, kelas, dan mata pelajaran yang ditugaskan.
- **FR-005**: Sistem MUST menyimpan presensi fisik siswa dan jurnal materi per sesi mengajar serta mempertahankan identitas pencatat dan waktu perubahan.
- **FR-006**: Sistem MUST menyediakan matriks penilaian yang membedakan Formatif, Sumatif, STS, dan SAS.
- **FR-007**: Sistem MUST menghitung agregat nilai dari bobot kebijakan yang dapat dikonfigurasi; bobot awal adalah Formatif 35%, Kehadiran 25%, dan keranjang Sumatif 40%. Keranjang Sumatif MUST mencakup Sumatif rutin, STS, dan SAS dengan porsi internal yang dapat dikonfigurasi dan totalnya MUST tepat 40%.
- **FR-008**: Sistem MUST menampilkan masukan, bobot, aturan pengecualian, dan hasil yang membentuk agregat serta MUST menjaga hasil historis dari perubahan kebijakan yang tidak disengaja.
- **FR-009**: Sistem MUST mengizinkan Administrator mencatat status Siswa Atlet resmi untuk periode akademik yang berlaku. Untuk siswa dengan status tersebut, sistem MUST tetap menyimpan presensi fisik dan memberikan bobot penuh komponen Kehadiran 25% tanpa pengurangan karena absensi fisik.
- **FR-010**: Sistem MUST mendeteksi bentrok waktu untuk jadwal guru yang sama dan memperlihatkan konflik sebelum jadwal terkait diberlakukan.
- **FR-011**: Sistem MUST menampilkan status kegiatan mengajar berdasarkan validasi sesi, sehingga kelas tanpa pengajar tervalidasi dapat dikenali Waka Kurikulum.
- **FR-012**: Sistem MUST memberi Walikelas peringatan ketika siswa pada kelas binaannya absen dalam tiga sesi kelas berturut-turut.
- **FR-013**: Sistem MUST membatasi Walikelas pada kelas binaannya dan menampilkan agregat nilai per mata pelajaran serta rekap yang dapat dicetak.
- **FR-014**: Sistem MUST menghitung rekap presensi guru untuk Operator TU dari kegiatan mengajar tervalidasi, bukan dari presensi gerbang saja.
- **FR-015**: Sistem MUST memungkinkan impor massal nilai dan presensi serta MUST melaporkan baris yang diterima, ditolak, dan alasan penolakannya.
- **FR-016**: Sistem MUST memungkinkan ekspor standar rekap nilai e-Rapor dan presensi guru untuk validasi penggajian tanpa entri ulang data sumber.
- **FR-017**: Sistem MUST menjaga identitas akademik, periode, dan hubungan antarcatatan tetap konsisten pada presensi, jurnal, nilai, peringatan, dan ekspor.
- **FR-018**: Sistem MUST mempertahankan jejak audit yang mengidentifikasi aktor dan waktu perubahan data akademik serta tindakan istimewa.
- **FR-019**: Sistem MUST memproses impor 1.000 matriks nilai siswa tanpa timeout atau menghalangi pengguna lain menyelesaikan alur kerja.
- **FR-020**: Sistem MUST memastikan setiap catatan valid yang diterima dalam impor atau ekspor hanya direkam atau diekspor satu kali untuk kombinasi identitas dan periode yang sama.

### Key Entities *(include if feature involves data)*

- **Pengguna dan Penugasan Peran**: Identitas orang yang mengakses sistem, peran, kelas atau jadwal yang ditugaskan, serta cakupan kewenangannya.
- **Siswa**: Identitas akademik siswa, kelas, periode keanggotaan, dan status khusus yang memengaruhi aturan penilaian.
- **Guru**: Identitas guru dan penugasan mata pelajaran, kelas, serta sesi jadwal.
- **Kelas dan Periode Akademik**: Kelompok siswa serta rentang waktu tempat jadwal dan catatan akademik berlaku.
- **Jadwal dan Sesi Mengajar**: Guru, kelas, mata pelajaran, waktu, status publikasi, serta status validasi kegiatan mengajar.
- **Catatan Presensi**: Siswa, sesi, status kehadiran, pencatat, waktu, dan riwayat koreksi.
- **Jurnal Materi**: Sesi mengajar dan materi yang disampaikan oleh guru penugas.
- **Matriks Penilaian dan Kebijakan Nilai**: Nilai Formatif, Sumatif, STS, SAS, kehadiran, bobot aktif, pengecualian, serta agregat per siswa dan mata pelajaran.
- **Peringatan**: Anomali pemicu, siswa atau jadwal terkait, penerima, waktu, dan status tindak lanjut.
- **Rekap dan Ekspor**: Kumpulan catatan akademik dalam periode dan format standar yang dapat ditelusuri ke sumbernya.
- **Jejak Audit**: Aktor, waktu, objek, perubahan, dan tindakan yang relevan untuk akuntabilitas.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Impor satu batch berisi 1.000 matriks nilai siswa selesai tanpa timeout, kehilangan baris valid, duplikasi catatan, atau membuat alur kerja pengguna lain terblokir.
- **SC-002**: 100% catatan nilai yang telah diterima dapat digunakan dalam ekspor e-Rapor standar tanpa guru memasukkan ulang nilai yang sama; setiap catatan muncul tepat satu kali untuk periode terkait.
- **SC-003**: 100% jadwal guru yang bertabrakan teridentifikasi dan terlihat oleh Waka Kurikulum dalam interaksi penyuntingan jadwal; tidak ada jadwal bertabrakan yang dapat dipublikasikan tanpa konflik ditampilkan terlebih dahulu.
- **SC-004**: Setiap siswa yang absen pada tiga sesi kelas berturut-turut di kelas binaan menghasilkan peringatan yang dapat dilihat Walikelas dengan identitas siswa dan sesi pemicu yang benar.
- **SC-005**: 100% catatan dalam rekap presensi TU dapat ditelusuri ke sesi mengajar tervalidasi; presensi gerbang yang tidak tervalidasi tidak dihitung sebagai kegiatan mengajar.
- **SC-006**: Pada pengujian izin, 100% tindakan yang diizinkan berfungsi dan 100% tindakan lintas peran atau di luar penugasan yang dilarang ditolak.
- **SC-007**: Untuk 100% siswa berstatus Siswa Atlet yang berlaku, perubahan presensi fisik tidak mengurangi bobot Kehadiran 25%, dan setiap presensi tetap tercatat.

## Assumptions

- Sekolah menyediakan identitas pengguna dan penugasan peran; pengadaan identitas, autentikasi eksternal, dan proses pembayaran gaji bukan bagian dari ruang lingkup fitur ini.
- Satu sesi kelas terjadwal menjadi unit untuk menghitung tiga ketidakhadiran berturut-turut; hari libur dan sesi yang dibatalkan bukan sesi ketidakhadiran.
- Bentrok jadwal yang wajib dideteksi setidaknya mencakup tumpang tindih waktu untuk guru yang sama. Bentrok ruang atau sumber daya lain memerlukan aturan sekolah tersendiri.
- Format ekspor e-Rapor dan validasi penggajian disepakati dengan sekolah sebelum implementasi; sistem menyediakan keluaran standar, bukan mengirim data langsung ke sistem eksternal.
- Jadwal dianggap diberlakukan ketika dipublikasikan untuk semester; konflik harus ditampilkan sebelum tindakan publikasi berhasil.
- Administrator mencatat status Siswa Atlet berdasarkan penetapan resmi sekolah dan menetapkan periode berlakunya; status tidak disimpulkan dari presensi.
- Porsi Sumatif rutin, STS, dan SAS di dalam keranjang 40% ditetapkan oleh Administrator sebelum nilai periode tersebut dihitung; belum ada rasio baku di luar total 40% yang diberikan.
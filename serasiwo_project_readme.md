Berikut adalah rincian hak akses (*permissions*) spesifik untuk setiap fitur di dalam sistem, memetakan apa saja yang bisa dilihat (Read), ditambah (Create), diubah (Update), dan dihapus (Delete) oleh masing-masing *role*.

**1. Super Admin (Pemilik WO)**

* **Dashboard Eksklusif:** Akses *Read-Only* untuk melihat semua metrik keuangan dan grafik performa bisnis secara keseluruhan.
* **Kalender Master:** Akses *Full Control*. Bisa melihat seluruh jadwal, dan memiliki tombol khusus "Override" untuk menggeser jadwal acara atau vendor secara paksa (mengabaikan peringatan bentrok).
* **Manajemen Klien & Proyek:** Akses *Full Control*. Bisa menambah, melihat, mengedit, dan menghapus data klien beserta arsip portofolio masa lalu.
* **Manajemen Vendor & Mitra:** Akses *Full Control*. Bisa menambah vendor baru, mengedit kontrak dasar, dan menghapus atau memblokir vendor yang bermasalah.
* **Keuangan & Laba Rugi:** Akses *Read & Export*. Bisa melihat mutasi arus kas, margin laba bersih per proyek, dan mengekspor laporan ke format Excel/PDF.
* **Pengaturan Sistem:** Akses *Full Control*. Bisa membuat akun baru untuk admin/vendor, menetapkan batasan hak akses, mengubah harga dasar paket, dan melihat log aktivitas (siapa yang mengubah data jam berapa).

**2. Admin Operasional (Koordinator Lapangan)**

* **Dashboard Operasional:** Akses *Read & Update*. Bisa melihat daftar tugas harian dan mencentang tugas yang sudah selesai (*mark as done*).
* **Kalender Acara:** Akses *Read-Only*. Hanya bisa melihat jadwal keseluruhan acara dan kegiatan (*fitting*, survei), tetapi tidak bisa menggeser tanggal jika kalender sudah terkunci.
* **Manajemen Klien:** Akses *Create, Read, Update*. Bisa mendaftarkan klien baru, melengkapi dokumen, dan mengedit *request* klien. Hak Hapus (*Delete*) ditutup untuk mencegah data hilang secara tidak sengaja.
* **Manajemen Proyek (Per Event):** Akses *Create, Read, Update*. Bisa menyusun *rundown* acara, membagi tugas kru lapangan, dan memperbarui *checklist* persiapan barang.
* **Booking & Ketersediaan Vendor:** Akses *Create, Read, Update*. Bisa mengirim *request booking* ke vendor dan membatalkan *request* jika vendor belum merespons. Tidak bisa mengubah harga *booking* yang sudah disetujui tanpa izin Super Admin.
* **Penagihan (Invoicing Klien):** Akses *Create, Read, Update*. Bisa membuat draf *invoice* DP/Pelunasan, mengirimkannya ke klien, dan memperbarui status tagihan menjadi "Lunas" setelah mengecek mutasi bank. Tidak ada akses untuk melihat total keuntungan WO.

**3. Vendor Mitra (Katering, MUA, Dekorasi)**

* **Dashboard Vendor:** Akses *Read-Only*. Hanya untuk melihat notifikasi *booking* baru dan ringkasan acara mereka minggu ini.
* **Kalender Ketersediaan:** Akses *Read & Update*. Bisa melihat jadwal acara dari WO ini, dan menekan tombol "Blokir Tanggal" untuk memberi tahu WO bahwa mereka sedang penuh (*full booked*) oleh pesanan di luar WO tersebut.
* **Manajemen Pekerjaan (Jobs):** Akses *Read & Update*. Bisa melihat detail *request booking* (jam, lokasi, jumlah porsi), dan wajib menekan tombol aksi: "Terima" atau "Tolak" pesanan.
* **Update Status Kesiapan:** Akses *Update*. Hanya bisa mencentang status progres mereka sendiri (misal: "Bahan Mentah Siap" -> "Loading" -> "Selesai").
* **Penagihan Vendor (Payout):** Akses *Create & Read*. Bisa mengunggah *invoice* atau struk tagihan layanan mereka ke sistem WO, dan melihat status apakah pembayaran sudah dicairkan oleh WO atau masih tertunda.


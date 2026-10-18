# Barbershop Management App

Aplikasi pengelolaan barbershop untuk admin dan staff, dilengkapi
website customer untuk booking dan pembayaran online.

## Teknologi

- Backend: Express, TypeScript, Prisma ORM, PostgreSQL
- Web: React, TypeScript, Vite, Tailwind CSS, Axios
- Autentikasi: JWT dan bcrypt
- Pembayaran: Midtrans Sandbox
- Pembaruan realtime: Socket.IO
- Mobile: React Native dan Expo

## Struktur Proyek

- `backend`: API, database, autentikasi, pembayaran, dan realtime.
- `frontend`: website admin dan staff.
- `customer-web`: website customer.

Aplikasi mobile menggunakan backend yang sama. Fitur booking dan
realtime terbaru pada dokumentasi ini berfokus pada aplikasi web.

## Fitur

### Admin dan Staff

- Mengelola layanan, customer, membership, dan kapster.
- Membuat order langsung.
- Memperbarui status layanan.
- Mencatat pembayaran order.
- Melihat booking online dan mencatat kedatangan customer.
- Memeriksa status pembayaran online.
- Melihat jadwal kapster, waktu layanan, dan buffer.
- Menandai customer tidak datang beserta alasan dan waktu pencatatan.
- Melihat ringkasan dashboard dan riwayat order.
- Mengunduh invoice.
- Menerima pembaruan data secara realtime.

Persetujuan pembayaran yang membutuhkan pemeriksaan hanya dapat
dilakukan oleh ADMIN.

### Customer

- Registrasi dan login.
- Melihat serta memilih layanan.
- Menambah dan mengurangi jumlah setiap layanan melalui tombol + dan −.
- Memilih kapster dan jadwal tersedia.
- Satu booking menggunakan satu kapster dengan pengerjaan layanan berurutan.
- Subtotal dan total durasi dihitung berdasarkan jumlah masing-masing layanan.
- Buffer ditambahkan sekali setelah seluruh layanan selesai.
- Membuat booking dengan batas waktu pembayaran.
- Membayar melalui Midtrans Sandbox.
- Jumlah layanan tetap dipertahankan saat booking diubah menjadi order melalui check-in oleh admin atau staff.
- Melihat booking aktif dan riwayat booking.
- Menerima pembaruan status booking secara realtime.

## Persiapan

Siapkan:

- Node.js dan npm yang kompatibel dengan dependensi proyek.
- PostgreSQL yang sedang berjalan.
- Akun Midtrans Sandbox.
- ngrok untuk meneruskan notifikasi Midtrans ke backend lokal.

Konfigurasi lingkungan perlu disiapkan sebelum menjalankan backend.
Jangan memasukkan file `.env`, token ngrok, atau Server Key Midtrans
ke GitHub.

## Instalasi Dependensi

Jalankan dari folder utama proyek:

```bash
cd backend
npm install
```

```bash
cd ../frontend
npm install
```

```bash
cd ../customer-web
npm install
```

## Konfigurasi Lingkungan

Untuk instalasi baru, salin file contoh menjadi `.env`.

Dari folder utama proyek, jalankan melalui PowerShell:

```powershell
Copy-Item backend/.env.example backend/.env
Copy-Item frontend/.env.example frontend/.env
```

Jangan jalankan perintah tersebut jika file `.env` sudah ada,
agar konfigurasi lokal tidak tertimpa.

Sesuaikan `backend/.env` dengan koneksi PostgreSQL, JWT secret,
akun admin untuk seed, dan Server Key Midtrans Sandbox.

Pada `frontend/.env`, gunakan:

```dotenv
VITE_API_URL=http://localhost:3000/api
```

Customer-web saat ini menggunakan alamat API langsung di kode
sehingga belum membutuhkan file `.env`.

File `.env.example` boleh disimpan di GitHub.
File `.env` yang berisi konfigurasi asli tidak boleh di-commit.

## Persiapan Database Lokal

Setelah koneksi PostgreSQL dan konfigurasi lingkungan tersedia,
jalankan dari folder `backend`:

```bash
npx prisma generate
npx prisma migrate dev
npm run seed
```

Seed digunakan untuk menyiapkan akun admin berdasarkan konfigurasi
lingkungan proyek.

Perintah `prisma migrate dev` digunakan untuk pengembangan lokal.

## Menjalankan Aplikasi

Gunakan terminal terpisah untuk masing-masing aplikasi.

### Backend

Dari folder `backend`:

```bash
npm run dev
```

Alamat lokal:

```text
http://localhost:3000
```

API menggunakan awalan `/api`.

### Website Admin dan Staff

Dari folder `frontend`:

```bash
npm run dev
```

Alamat lokal yang digunakan proyek:

```text
http://localhost:5173
```

### Website Customer

Dari folder `customer-web`:

```bash
npm run dev
```

Alamat lokal yang digunakan proyek:

```text
http://localhost:5174
```

Pastikan port yang tampil di terminal sesuai dengan konfigurasi CORS,
Socket.IO, dan alamat kembali pembayaran.

## Pengujian Midtrans Sandbox

Jalankan backend, kemudian buka tunnel ngrok menuju port backend:

```bash
ngrok http 3000
```

Gunakan alamat HTTPS yang ditampilkan ngrok.

### Payment Notification URL

```text
https://ALAMAT-NGROK/api/midtrans/notification
```

### URL Kembali Pembayaran

```text
https://ALAMAT-NGROK/api/midtrans/return
```

Route kembali pembayaran diarahkan ke halaman pesanan customer:

```text
http://localhost:5174/orders
```

Jika alamat tunnel berubah, perbarui pengaturan URL di Midtrans.

Backend dan ngrok harus tetap berjalan agar notifikasi dapat diterima.
Kembalinya browser ke halaman pesanan bukan bukti pembayaran berhasil;
status pembayaran ditentukan melalui verifikasi backend.

Gunakan fasilitas pengujian Sandbox, bukan pembayaran uang sungguhan.

## Alur Booking Online

1. Customer login dan memilih layanan.
2. Customer memilih kapster serta waktu tersedia.
3. Booking dibuat dengan status `HELD`.
4. Customer menyelesaikan pembayaran sebelum batas waktu.
5. Backend memverifikasi pembayaran.
6. Booking yang memenuhi pemeriksaan menjadi `CONFIRMED`.
7. Admin atau staff mencatat kedatangan customer.
8. Sistem membuat order dari booking tanpa menagih ulang.
9. Status layanan berubah dari `WAITING` ke `IN_SERVICE`,
   kemudian `COMPLETED`.

Pembayaran yang membutuhkan pemeriksaan tidak otomatis
mengonfirmasi booking dan perlu ditangani pengelola.

## Status Jadwal

| Status      | Arti                                                |
| ----------- | --------------------------------------------------- |
| `HELD`      | Jadwal ditahan sementara selama menunggu pembayaran |
| `CONFIRMED` | Jadwal terkonfirmasi                                |
| `COMPLETED` | Layanan selesai                                     |
| `CANCELLED` | Jadwal dibatalkan                                   |
| `EXPIRED`   | Batas penahanan jadwal sudah habis                  |
| `NO_SHOW`   | Customer ditandai tidak datang oleh pengelola       |

Penandaan `NO_SHOW` hanya tersedia untuk booking online terkonfirmasi
yang belum check-in, waktu layanannya sudah berakhir, dan pembayaran
memenuhi pemeriksaan.

Alasan, waktu, dan petugas yang melakukan penandaan disimpan.
Tindakan ini tidak melakukan refund otomatis.

## Konfigurasi Jadwal Pengujian

Konfigurasi demo saat ini:

- Zona waktu: Asia/Jakarta.
- Jam operasional: 24 jam.
- Buffer setelah layanan: 5 menit.

Durasi layanan beserta buffer tetap harus berada dalam batas
hari operasional yang diterapkan backend.

Sesuaikan `SCHEDULE_CONFIG` dengan jam operasional barbershop
sebelum penggunaan nyata.

## Pembaruan Data

Socket.IO memberi tahu aplikasi ketika data terkait berubah.
Halaman kemudian mengambil data terbaru dari API.

Beberapa halaman juga memperbarui data secara berkala dan ketika
tab browser kembali aktif. Tombol perbarui manual tetap tersedia.

## Pemeriksaan Build dan Lint

Dari folder `backend`:

```bash
npm run build
```

Dari folder `frontend` dan `customer-web`, jalankan masing-masing:

```bash
npm run build
npm run lint
```

## Pengujian Manual yang Telah Dilakukan

- Booking dan pemeriksaan bentrokan jadwal.
- Pembayaran Midtrans Sandbox.
- Check-in booking menjadi order.
- Pembaruan status layanan dan buffer.
- Penandaan customer tidak datang.
- Pembaruan realtime dan penyambungan kembali setelah backend restart.
- Pembatasan akses customer ke endpoint pengelola.
- Penolakan pembayaran booking milik customer lain.
- Penolakan persetujuan pemeriksaan pembayaran oleh STAFF.
- Pemeriksaan pendapatan agar pembayaran booking tidak dihitung
  dua kali saat check-in.

## Batasan

- Integrasi pembayaran masih menggunakan Midtrans Sandbox.
- Refund otomatis belum tersedia.
- Konfigurasi localhost dan ngrok ditujukan untuk pengembangan.
- Deployment produksi memerlukan konfigurasi lingkungan,
  domain, dan pembayaran yang sesuai.

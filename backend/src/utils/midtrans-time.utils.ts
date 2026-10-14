export function parseMidtransTime(value: string): Date {
  const pattern = /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/;

  if (!pattern.test(value)) {
    throw new Error("Format waktu Midtrans tidak valid");
  }

  // Waktu dari Midtrans menggunakan WIB, bukan zona waktu server.
  const date = new Date(`${value.replace(" ", "T")}+07:00`);

  if (Number.isNaN(date.getTime())) {
    throw new Error("Waktu Midtrans tidak dapat dibaca");
  }

  // Pastikan tanggal tidak dinormalisasi menjadi tanggal lain,
  // misalnya tanggal 30 Februari.
  const normalizedWib = new Date(date.getTime() + 7 * 60 * 60 * 1000)
    .toISOString()
    .slice(0, 19)
    .replace("T", " ");

  if (normalizedWib !== value) {
    throw new Error("Tanggal atau jam Midtrans tidak valid");
  }

  return date;
}

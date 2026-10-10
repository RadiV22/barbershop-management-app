export const SCHEDULE_CONFIG = {
  timezone: "Asia/Jakarta",

  // WIB adalah UTC+7.
  utcOffsetMinutes: 7 * 60,

  // Jam operasional dalam menit sejak pukul 00.00.
  openingMinutes: 10 * 60,
  closingMinutes: 21 * 60,

  // Pilihan jam mulai: 10.00, 10.15, 10.30, dan seterusnya.
  slotIntervalMinutes: 15,

  // Jeda setelah layanan selesai.
  bufferMinutes: 15,

  // Tanggal yang dapat dipilih: hari ini sampai H+7.
  maxAdvanceDays: 7,

  holdMinutes: 15,
} as const;

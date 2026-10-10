import { SCHEDULE_CONFIG } from "../config/schedule.config.js";

const MINUTE_MS = 60 * 1000;

/**
 * Mengubah tanggal YYYY-MM-DD menjadi awal hari WIB.
 * Mengembalikan null jika tanggal tidak valid.
 */
export function parseWibDate(value: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return null;
  }

  const calendarDate = new Date(`${value}T00:00:00.000Z`);

  if (
    Number.isNaN(calendarDate.getTime()) ||
    calendarDate.toISOString().slice(0, 10) !== value
  ) {
    return null;
  }

  return new Date(
    calendarDate.getTime() - SCHEDULE_CONFIG.utcOffsetMinutes * MINUTE_MS,
  );
}

/**
 * Mengambil tanggal hari ini menurut WIB.
 * Parameter now dapat diberikan untuk pengujian.
 */
export function getTodayWib(now: Date = new Date()): string {
  const shifted = new Date(
    now.getTime() + SCHEDULE_CONFIG.utcOffsetMinutes * MINUTE_MS,
  );

  return shifted.toISOString().slice(0, 10);
}

/**
 * Menambahkan sejumlah menit pada waktu tertentu.
 */
export function addMinutes(date: Date, minutes: number): Date {
  return new Date(date.getTime() + minutes * MINUTE_MS);
}

/**
 * Memeriksa benturan dua rentang waktu.
 * Waktu akhir tidak termasuk dalam rentang.
 */
export function isTimeOverlapping(
  firstStart: Date,
  firstEnd: Date,
  secondStart: Date,
  secondEnd: Date,
): boolean {
  return (
    firstStart.getTime() < secondEnd.getTime() &&
    firstEnd.getTime() > secondStart.getTime()
  );
}

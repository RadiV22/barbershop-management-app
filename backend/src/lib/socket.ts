import type { Server as HttpServer } from "node:http";
import { Server } from "socket.io";
import { socketAuthentication } from "../middlewares/socket-auth.middleware.js";

let io: Server | null = null;

export function initializeSocket(httpServer: HttpServer) {
  if (io) {
    return io;
  }

  io = new Server(httpServer, {
    cors: {
      origin: ["http://localhost:5173", "http://localhost:5174"],
      methods: ["GET", "POST"],
    },
  });

  io.use(socketAuthentication);

  io.on("connection", (socket) => {
    const user = socket.data.user;
    const expiresAt: number = socket.data.tokenExpiresAt;

    if (!user || !Number.isFinite(expiresAt) || expiresAt <= Date.now()) {
      socket.disconnect(true);
      return;
    }

    if (user.role === "ADMIN" || user.role === "STAFF") {
      void socket.join("management");
    } else if (
      user.role === "CUSTOMER" &&
      Number.isSafeInteger(user.customerId) &&
      user.customerId > 0
    ) {
      void socket.join(`customer:${user.customerId}`);
    } else {
      socket.disconnect(true);
      return;
    }

    // Token login kita berlaku satu jam.
    // Batasi nilai timer agar tidak melewati batas timer Node.js.
    const remainingTime = Math.min(expiresAt - Date.now(), 2_147_483_647);

    const expirationTimer = setTimeout(
      () => {
        socket.emit("session:expired");
        socket.disconnect(true);
      },
      Math.max(0, remainingTime),
    );

    socket.on("disconnect", () => {
      clearTimeout(expirationTimer);
    });
  });

  return io;
}

export function notifyBookingChanged(customerId: number) {
  if (!Number.isSafeInteger(customerId) || customerId <= 0) {
    console.error("Event booking tidak dikirim: customerId tidak valid.");
    return;
  }

  if (!io) {
    console.error("Event booking tidak dikirim: Socket.IO belum siap.");
    return;
  }

  io.to(`customer:${customerId}`).to("management").emit("booking:changed");
}

export function notifyAvailabilityChanged() {
  if (!io) {
    console.error("Event ketersediaan tidak dikirim: Socket.IO belum siap.");
    return;
  }

  // Hanya pemberitahuan untuk mengambil ulang jadwal.
  // Tidak mengirim identitas customer atau rincian booking.
  io.emit("availability:changed");
}

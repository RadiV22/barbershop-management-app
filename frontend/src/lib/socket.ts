import { io } from "socket.io-client";

export const socket = io("http://localhost:3000", {
  autoConnect: false,

  auth: (callback) => {
    callback({
      token: sessionStorage.getItem("barbershop_token") ?? "",
    });
  },
});

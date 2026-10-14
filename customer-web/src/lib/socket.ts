import { io } from "socket.io-client";
import { getToken } from "./tokenStorage";

export const socket = io("http://localhost:3000", {
  autoConnect: false,

  auth: (callback) => {
    callback({
      token: getToken() ?? "",
    });
  },
});

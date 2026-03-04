import { io } from "socket.io-client";

const URL = process.env.REACT_APP_SOCKET_URL;

export const socket = io(URL, { autoConnect: false, withCredentials: true });

export function connectSocket() {
  if (!socket.connected) socket.connect();
}

export function disconnectSocket() {
  if (socket.disconnect) socket.disconnect();
}

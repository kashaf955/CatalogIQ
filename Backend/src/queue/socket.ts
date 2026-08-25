import { Server as HttpServer } from "http";
import { Server as SocketIOServer } from "socket.io";

let io: SocketIOServer | undefined;

export function initSocket(httpServer: HttpServer): SocketIOServer {
  io = new SocketIOServer(httpServer, {
    cors: { origin: "*" },
  });
  return io;
}

export function emitProcessingRunUpdate(processingRunId: string, payload: unknown): void {
  io?.emit(`processing-run:${processingRunId}`, payload);
  io?.emit("processing-run:update", { processingRunId, ...Object(payload) });
}

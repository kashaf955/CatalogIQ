import IORedis from "ioredis";

let connection: IORedis | undefined;

/**
 * Shared Redis connection for BullMQ (spec section 23/24). Lazily created so
 * the app can boot without Redis running; queue operations simply won't
 * complete until Redis is reachable. The error listener is required —
 * without one, ioredis's connection-refused errors would crash the process.
 */
export function getRedisConnection(): IORedis {
  if (!connection) {
    connection = new IORedis(process.env.REDIS_URL || "redis://127.0.0.1:6379", {
      maxRetriesPerRequest: null,
      lazyConnect: true,
    });
    connection.on("error", (err) => {
      console.warn("[redis] connection issue:", err.message);
    });
  }
  return connection;
}

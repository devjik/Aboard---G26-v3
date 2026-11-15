import { createServer } from "http";
import { Server as IoServer } from "socket.io";
import { TRACKING_SERVICE_PORT } from "../../src/lib/config/app";

const port = Number(process.env.TRACKING_SERVICE_PORT) || TRACKING_SERVICE_PORT;
const httpServer = createServer((req, res) => {
  const url = req.url ?? "/";
  if (url === "/health" || url === "/") {
    res.writeHead(200, { "content-type": "application/json" });
    res.end(
      JSON.stringify({
        status: "ok",
        service: "aboard-tracking",
        ts: new Date().toISOString(),
      }),
    );
    return;
  }
  res.writeHead(404);
  res.end("Not Found");
});

const io = new IoServer(httpServer, {
  path: "/",
  cors: { origin: "*", methods: ["GET", "POST"] },
});

const rooms = new Map<string, Set<string>>();
// Latest known driver position per trip — so students joining late
// immediately see where the bus is.
const latestDriverPos = new Map<string, {
  lat: number; lng: number; speed?: number; heading?: number; accuracy?: number; ts: string;
}>();

io.on("connection", (socket) => {
  socket.on("subscribe:trip", (tripId: string) => {
    if (typeof tripId !== "string" || !tripId) return;
    socket.join(`trip:${tripId}`);
    if (!rooms.has(tripId)) rooms.set(tripId, new Set());
    rooms.get(tripId)!.add(socket.id);

    // Send the latest known driver position immediately (if any)
    const latest = latestDriverPos.get(tripId);
    if (latest) {
      socket.emit("trip:location", { tripId, ...latest, ingestedAt: new Date().toISOString() });
    }
  });

  socket.on("unsubscribe:trip", (tripId: string) => {
    if (typeof tripId !== "string" || !tripId) return;
    socket.leave(`trip:${tripId}`);
    const subs = rooms.get(tripId);
    if (subs) {
      subs.delete(socket.id);
      if (subs.size === 0) rooms.delete(tripId);
    }
  });

  socket.on("driver:location", (payload: {
    tripId: string;
    lat: number;
    lng: number;
    speed?: number;
    heading?: number;
    accuracy?: number;
    recordedAt?: string;
  }) => {
    if (
      !payload ||
      typeof payload.tripId !== "string" ||
      typeof payload.lat !== "number" ||
      typeof payload.lng !== "number"
    ) {
      return;
    }
    const ts = payload.recordedAt ?? new Date().toISOString();
    const pos = {
      lat: payload.lat,
      lng: payload.lng,
      speed: payload.speed,
      heading: payload.heading,
      accuracy: payload.accuracy,
      ts,
    };
    // Store the latest position for late joiners
    latestDriverPos.set(payload.tripId, pos);
    // Broadcast to all subscribers on that trip
    socket.to(`trip:${payload.tripId}`).emit("trip:location", {
      ...payload,
      ...pos,
      ingestedAt: new Date().toISOString(),
    });
  });

  // Driver can stop broadcasting (clear the stored position)
  socket.on("driver:stop", (tripId: string) => {
    if (typeof tripId !== "string") return;
    latestDriverPos.delete(tripId);
    socket.to(`trip:${tripId}`).emit("trip:stopped", { tripId });
  });

  socket.on("disconnect", () => {
    for (const subs of rooms.values()) subs.delete(socket.id);
  });
});

httpServer.listen(port, () => {
  console.log(`[aboard-tracking] listening on :${port}`);
});

function shutdown(signal: string) {
  console.log(`[aboard-tracking] ${signal} received, shutting down`);
  io.close();
  httpServer.close(() => process.exit(0));
  setTimeout(() => process.exit(1), 5000).unref();
}

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));

import express from "express";

const app = express();

app.get("/api/db/status", (_req: any, res: any) => {
  res.json({
    mongo: { status: "disconnected", uri: "not-configured", database: "billing_system", error: null },
    local: { type: "In-Memory Store", filePath: "memory-only" }
  });
});

app.get("/api/test", (_req: any, res: any) => {
  res.json({ status: "ok", message: "Vercel function is working!" });
});

export default app;

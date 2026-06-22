import express from "express";
import jwt from "jsonwebtoken";

const app = express();

let cryptoWorks = false;
try {
  cryptoWorks = typeof crypto !== "undefined" && typeof crypto.subtle?.digest === "function";
} catch (e) {
  cryptoWorks = false;
}

app.get("/api/db/status", async (_req: any, res: any) => {
  let hashTest = "not_tested";
  try {
    const msg = new TextEncoder().encode("test");
    const buf = await crypto.subtle.digest("SHA-256", msg);
    const arr = Array.from(new Uint8Array(buf));
    hashTest = arr.map(b => b.toString(16).padStart(2, "0")).join("").substring(0, 16) + "...";
  } catch (e: any) {
    hashTest = "error: " + (e?.message || String(e));
  }
  res.json({ status: "ok", cryptoWorks, hashTest, nodeVersion: process.version });
});

export default app;

import express from "express";
import jwt from "jsonwebtoken";

const app = express();

app.get("/api/db/status", (_req: any, res: any) => {
  res.json({ status: "ok", jwt_works: typeof jwt.sign === "function" });
});

export default app;

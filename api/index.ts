// Vercel serverless function entry point
// Import the Express app (with error handling for initialization)
let app: any;

try {
  // Dynamic import to catch any initialization errors from server.ts
  const serverModule = await import("../server");
  app = serverModule.default;
} catch (err: any) {
  console.error("Failed to initialize Express app:", err?.message || String(err));
  // Create a fallback app that returns errors gracefully
  const express = (await import("express")).default;
  app = express();
  app.get("*", (_req: any, res: any) => {
    res.status(500).json({
      error: "Server initialization failed",
      message: err?.message || String(err)
    });
  });
}

export default app;

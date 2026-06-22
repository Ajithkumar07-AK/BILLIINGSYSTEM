export default async function handler(req: any, res: any) {
  const { VERCEL, MONGODB_URI, JWT_SECRET } = process.env;
  return res.status(200).json({
    status: "ok",
    message: "Vercel function works!",
    env: {
      VERCEL: VERCEL || "not set",
      hasMongoUri: MONGODB_URI ? "yes" : "no",
      hasJwtSecret: JWT_SECRET ? "yes" : "no"
    },
    nodeVersion: process.version
  });
}

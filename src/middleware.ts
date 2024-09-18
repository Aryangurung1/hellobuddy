import { authMiddleware } from "@kinde-oss/kinde-auth-nextjs/server";
import { NextApiRequest, NextApiResponse } from "next";

export const config = {
  matcher: ["/dashboard/:path*", "/auth-callback"],
};

const handler = (
  req: NextApiRequest,
  res: NextApiResponse,
  next: () => void
) => {
  console.log("Middleware applied to:", req.url);
  authMiddleware(req);
};

export default handler;

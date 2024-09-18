import { handleAuth } from "@kinde-oss/kinde-auth-nextjs/server";
import { NextApiRequest, NextApiResponse } from "next";

export const GET = handleAuth({
  onLoginSuccess: (req: NextApiRequest, res: NextApiResponse) => {
    console.log("Login successful, redirecting to /dashboard");

    // Ensure the session and state are correctly handled before redirect
    res.redirect("/dashboard");
  },
  onLoginError: (req: NextApiRequest, res: NextApiResponse, error: Error) => {
    console.error("Login error:", error);
    res.status(401).send("Login failed");
  },
});

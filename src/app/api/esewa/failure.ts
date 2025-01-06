import { NextResponse } from "next/server";

export async function GET(req: Request) {
  return NextResponse.json({ message: "Payment failed", status: "failure" });
}

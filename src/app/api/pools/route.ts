import { NextRequest, NextResponse } from "next/server";
import { createPool, poolErrorStatus } from "@/lib/pools";
import type { CreatePoolInput } from "@/lib/types";

export async function POST(req: NextRequest) {
  let body: CreatePoolInput;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "INVALID_JSON" }, { status: 400 });
  }

  try {
    const pool = await createPool(body);
    return NextResponse.json(pool);
  } catch (err) {
    const code = err instanceof Error ? err.message : "POOL_CREATE_FAILED";
    return NextResponse.json({ error: code }, { status: poolErrorStatus(code) });
  }
}

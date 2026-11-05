
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "edge";

export async function POST(request) {
  try {
    const authHeader = request.headers.get("authorization");
    const token = authHeader?.replace(/^Bearer\s+/i, "");

    if (!token) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const publishableKey =
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !publishableKey || !serviceRoleKey) {
      return NextResponse.json(
        { error: "Server configuration is incomplete" },
        { status: 500 }
      );
    }

    // Verify the logged-in user
    const authClient = createClient(
      supabaseUrl,
      publishableKey,
      {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
        },
      }
    );

    const {
      data: { user },
      error: authError,
    } = await authClient.auth.getUser(token);

    if (authError || !user) {
      return NextResponse.json(
        { error: "Invalid session" },
        { status: 401 }
      );
    }

    // Admin client - server side only
    const admin = createClient(
      supabaseUrl,
      serviceRoleKey,
      {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
        },
      }
    );

    // Confirm the requester is CEO
    const { data: requester, error: requesterError } =
      await admin
        .from("user_roles")
        .select("role")
        .eq("id", user.id)
        .single();

    if (
      requesterError ||
      requester?.role !== "CEO"
    ) {
      return NextResponse.json(
        { error: "CEO access only" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const targetUserId = body.user_id;

    if (
      typeof targetUserId !== "string" ||
      !targetUserId.trim()
    ) {
      return NextResponse.json(
        { error: "User ID is required" },
        { status: 400 }
      );
    }

    // Prevent accidental deletion of the logged-in CEO
    if (targetUserId === user.id) {
      return NextResponse.json(
        { error: "You cannot delete your own account" },
        { status: 400 }
      );
    }

    // Protect other CEO accounts
    const { data: target, error: targetError } =
      await admin
        .from("user_roles")
        .select("role")
        .eq("id", targetUserId)
        .maybeSingle();

    if (targetError || !target) {
      return NextResponse.json(
        { error: "Account not found" },
        { status: 404 }
      );
    }

    if (target.role === "CEO") {
      return NextResponse.json(
        { error: "CEO accounts cannot be deleted here" },
        { status: 403 }
      );
    }

    // Delete auth account.
    // Candidates remain because created_by uses ON DELETE SET NULL.
    const { error: deleteError } =
      await admin.auth.admin.deleteUser(targetUserId);

    if (deleteError) {
      return NextResponse.json(
        { error: deleteError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Account deleted. Candidate records were preserved.",
    });

  } catch (error) {
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}

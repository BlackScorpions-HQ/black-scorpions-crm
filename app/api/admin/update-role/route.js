
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const ALLOWED_ROLES = [
  "Recruiter",
  "Assistant",
  "Team Leader",
  "Unit Manager",
];

export async function POST(request) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey =
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseKey || !serviceRoleKey) {
      return NextResponse.json(
        { error: "Server configuration is incomplete." },
        { status: 500 }
      );
    }

    // Authenticate the requesting user
    const authHeader = request.headers.get("authorization");
    const token = authHeader?.startsWith("Bearer ")
      ? authHeader.slice(7)
      : null;

    if (!token) {
      return NextResponse.json(
        { error: "Authentication required." },
        { status: 401 }
      );
    }

    const authClient = createClient(supabaseUrl, supabaseKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });

    const {
      data: { user },
      error: authError,
    } = await authClient.auth.getUser(token);

    if (authError || !user) {
      return NextResponse.json(
        { error: "Invalid or expired session." },
        { status: 401 }
      );
    }

    // Admin client
    const admin = createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });

    // Verify requester role directly from the database
    const { data: requester, error: requesterError } = await admin
      .from("user_roles")
      .select("id, role")
      .eq("id", user.id)
      .maybeSingle();

    if (requesterError) {
      console.error("Requester role error:", requesterError);

      return NextResponse.json(
        { error: "Could not verify account permissions." },
        { status: 500 }
      );
    }

    if (!requester || requester.role !== "CEO") {
      return NextResponse.json(
        { error: "Only the CEO can change user roles." },
        { status: 403 }
      );
    }

    // Read request body
    const body = await request.json();
    const { user_id, new_role } = body;

    if (
      typeof user_id !== "string" ||
      !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(user_id)
    ) {
      return NextResponse.json(
        { error: "A valid user ID is required." },
        { status: 400 }
      );
    }

    if (!ALLOWED_ROLES.includes(new_role)) {
      return NextResponse.json(
        { error: "Invalid role selected." },
        { status: 400 }
      );
    }

    // Prevent accidental self-demotion
    if (user_id === user.id) {
      return NextResponse.json(
        { error: "You cannot change your own role." },
        { status: 403 }
      );
    }

    // Verify target account
    const { data: target, error: targetError } = await admin
      .from("user_roles")
      .select("id, role")
      .eq("id", user_id)
      .maybeSingle();

    if (targetError) {
      console.error("Target lookup error:", targetError);

      return NextResponse.json(
        { error: "Could not find the selected account." },
        { status: 500 }
      );
    }

    if (!target) {
      return NextResponse.json(
        { error: "Selected account was not found." },
        { status: 404 }
      );
    }

    // CEO accounts are protected
    if (target.role === "CEO") {
      return NextResponse.json(
        { error: "CEO accounts cannot be modified." },
        { status: 403 }
      );
    }

    if (target.role === new_role) {
      return NextResponse.json(
        { error: "This user already has the selected role." },
        { status: 400 }
      );
    }

    // Update role only. Team assignments remain unchanged.
    const { data: updatedUser, error: updateError } = await admin
      .from("user_roles")
      .update({ role: new_role })
      .eq("id", user_id)
      .neq("role", "CEO")
      .select("id, role")
      .maybeSingle();

    if (updateError) {
      console.error("Role update error:", updateError);

      return NextResponse.json(
        { error: "Failed to update user role." },
        { status: 500 }
      );
    }

    if (!updatedUser) {
      return NextResponse.json(
        { error: "Role was not updated. Please refresh and try again." },
        { status: 409 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "User role updated successfully.",
      user: updatedUser,
    });
  } catch (error) {
    console.error("Update role API error:", error);

    return NextResponse.json(
      { error: "An unexpected server error occurred." },
      { status: 500 }
    );
  }
}


import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function POST(request) {
  let adminClient;
  let createdUserId = null;

  try {
    const authHeader = request.headers.get("authorization");

    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const token = authHeader.slice(7);

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !anonKey || !serviceKey) {
      return NextResponse.json(
        { error: "Server configuration missing" },
        { status: 500 }
      );
    }

    const authClient = createClient(supabaseUrl, anonKey);

    const { data: userData, error: authError } =
      await authClient.auth.getUser(token);

    if (authError || !userData?.user) {
      return NextResponse.json(
        { error: "Invalid session" },
        { status: 401 }
      );
    }

    adminClient = createClient(supabaseUrl, serviceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    // Verify that the account creating the Recruiter is CEO.
    const { data: roleData, error: roleError } = await adminClient
      .from("user_roles")
      .select("role")
      .eq("id", userData.user.id)
      .single();

    if (roleError || roleData?.role !== "CEO") {
      return NextResponse.json(
        { error: "CEO access only" },
        { status: 403 }
      );
    }

    const body = await request.json();

    const full_name = String(body.full_name || "").trim();
    const phone = String(body.phone || "").trim();
    const email = String(body.email || "").trim().toLowerCase();
    const password = String(body.password || "");
    const team_leader_id = String(body.team_leader_id || "").trim();

    if (!full_name || !phone || !email || !password || !team_leader_id) {
      return NextResponse.json(
        {
          error:
            "Full Name, Phone, Email, Password and Team Leader are required.",
        },
        { status: 400 }
      );
    }

    if (password.length < 8) {
      return NextResponse.json(
        { error: "Password must be at least 8 characters." },
        { status: 400 }
      );
    }

    // Allow assignment under either a real Team Leader or the CEO.
    const { data: leaderData, error: leaderError } = await adminClient
      .from("user_roles")
      .select("id, role")
      .eq("id", team_leader_id)
      .in("role", ["Team Leader", "CEO"])
      .maybeSingle();

    if (leaderError || !leaderData) {
      return NextResponse.json(
        {
          error:
            "The selected account is invalid. Select the CEO or a Team Leader.",
        },
        { status: 400 }
      );
    }

    // Create the Recruiter's Auth account.
    const { data: createdUser, error: createError } =
      await adminClient.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: {
          full_name,
          phone,
          role: "Recruiter",
        },
      });

    if (createError) {
      return NextResponse.json(
        { error: createError.message },
        { status: 400 }
      );
    }

    createdUserId = createdUser.user.id;

    // Save Recruiter role and selected reporting account.
    const { error: roleSaveError } = await adminClient
      .from("user_roles")
      .upsert(
        {
          id: createdUserId,
          role: "Recruiter",
          team_leader_id,
        },
        { onConflict: "id" }
      );

    if (roleSaveError) {
      await adminClient.auth.admin.deleteUser(createdUserId);
      createdUserId = null;

      return NextResponse.json(
        { error: roleSaveError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Recruiter account created successfully.",
      user: {
        id: createdUserId,
        email: createdUser.user.email,
        full_name,
        phone,
        role: "Recruiter",
        team_leader_id,
        team_leader_role: leaderData.role,
      },
    });
  } catch (error) {
    if (adminClient && createdUserId) {
      await adminClient.auth.admin.deleteUser(createdUserId);
    }

    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}

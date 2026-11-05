
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

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
    const serviceRoleKey =
      process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !publishableKey || !serviceRoleKey) {
      return NextResponse.json(
        { error: "Server configuration is incomplete" },
        { status: 500 }
      );
    }

    // Verify session
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

    // Admin client
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

    // CEO only
    const { data: requester, error: requesterError } =
      await admin
        .from("user_roles")
        .select("role")
        .eq("id", user.id)
        .single();

    if (requesterError || requester?.role !== "CEO") {
      return NextResponse.json(
        { error: "CEO access only" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const recruiterId = body.recruiter_id;
    const teamLeaderId = body.team_leader_id;

    if (
      typeof recruiterId !== "string" ||
      !recruiterId.trim()
    ) {
      return NextResponse.json(
        { error: "Recruiter ID is required" },
        { status: 400 }
      );
    }

    // Check recruiter
    const { data: recruiter, error: recruiterError } =
      await admin
        .from("user_roles")
        .select("id, role")
        .eq("id", recruiterId)
        .maybeSingle();

    if (recruiterError || !recruiter) {
      return NextResponse.json(
        { error: "Recruiter account not found" },
        { status: 404 }
      );
    }

    if (recruiter.role !== "Recruiter") {
      return NextResponse.json(
        { error: "Only Recruiter accounts can be reassigned" },
        { status: 400 }
      );
    }

    // Empty team leader ID means assign directly to CEO
    let newLeaderId = null;

    if (teamLeaderId !== null && teamLeaderId !== "") {
      if (typeof teamLeaderId !== "string") {
        return NextResponse.json(
          { error: "Invalid Team Leader ID" },
          { status: 400 }
        );
      }

      const { data: leader, error: leaderError } =
        await admin
          .from("user_roles")
          .select("id, role")
          .eq("id", teamLeaderId)
          .maybeSingle();

      if (
        leaderError ||
        !leader ||
        !["CEO", "Team Leader"].includes(leader.role)
      ) {
        return NextResponse.json(
          { error: "Selected Team Leader was not found" },
          { status: 400 }
        );
      }

      newLeaderId = leader.id;
    }

    // Update team assignment
    const { error: updateError } = await admin
      .from("user_roles")
      .update({ team_leader_id: newLeaderId })
      .eq("id", recruiterId);

    if (updateError) {
      return NextResponse.json(
        { error: updateError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Recruiter team updated successfully"
    });

  } catch (error) {
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}

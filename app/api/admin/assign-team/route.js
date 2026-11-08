
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function POST(request) {
  try {
    const token = request.headers
      .get("authorization")
      ?.replace(/^Bearer\s+/i, "");

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

    // VERIFY REQUESTER ROLE
    const { data: requester, error: requesterError } =
      await admin
        .from("user_roles")
        .select("id, role")
        .eq("id", user.id)
        .maybeSingle();

    if (requesterError || !requester) {
      return NextResponse.json(
        { error: "Unable to verify account role" },
        { status: 403 }
      );
    }

    const allowedRoles = ["CEO", "Assistant"];

    if (!allowedRoles.includes(requester.role)) {
      return NextResponse.json(
        { error: "CEO or Assistant access only" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const action = body.action || "assign_recruiter";

    // 1. ASSIGN RECRUITER TO CEO OR TEAM LEADER
    if (action === "assign_recruiter") {
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
            { error: "Selected CEO or Team Leader was not found" },
            { status: 400 }
          );
        }

        newLeaderId = leader.id;
      }

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
        message: "Recruiter team updated successfully",
      });
    }

    // 2. ASSIGN TEAM LEADER TO UNIT MANAGER
    if (action === "assign_team_leader") {
      const teamLeaderId = body.team_leader_id;
      const unitManagerId = body.unit_manager_id;

      if (
        typeof teamLeaderId !== "string" ||
        !teamLeaderId.trim()
      ) {
        return NextResponse.json(
          { error: "Team Leader ID is required" },
          { status: 400 }
        );
      }

      const { data: leader, error: leaderError } =
        await admin
          .from("user_roles")
          .select("id, role")
          .eq("id", teamLeaderId)
          .maybeSingle();

      if (leaderError || !leader) {
        return NextResponse.json(
          { error: "Team Leader account not found" },
          { status: 404 }
        );
      }

      if (leader.role !== "Team Leader") {
        return NextResponse.json(
          { error: "Selected account is not a Team Leader" },
          { status: 400 }
        );
      }

      let newUnitManagerId = null;

      if (unitManagerId !== null && unitManagerId !== "") {
        if (typeof unitManagerId !== "string") {
          return NextResponse.json(
            { error: "Invalid Unit Manager ID" },
            { status: 400 }
          );
        }

        const { data: manager, error: managerError } =
          await admin
            .from("user_roles")
            .select("id, role")
            .eq("id", unitManagerId)
            .maybeSingle();

        if (
          managerError ||
          !manager ||
          manager.role !== "Unit Manager"
        ) {
          return NextResponse.json(
            { error: "Selected Unit Manager was not found" },
            { status: 400 }
          );
        }

        newUnitManagerId = manager.id;
      }

      const { error: updateError } = await admin
        .from("user_roles")
        .update({
          unit_manager_id: newUnitManagerId,
        })
        .eq("id", teamLeaderId);

      if (updateError) {
        return NextResponse.json(
          { error: updateError.message },
          { status: 500 }
        );
      }

      return NextResponse.json({
        success: true,
        message: "Team Leader Unit Manager updated successfully",
      });
    }

    return NextResponse.json(
      { error: "Invalid assignment action" },
      { status: 400 }
    );

  } catch (error) {
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}

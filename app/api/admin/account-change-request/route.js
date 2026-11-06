
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function POST(request) {
  let admin;
  let requestId;

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

    admin = createClient(
      supabaseUrl,
      serviceRoleKey,
      {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
        },
      }
    );

    // Verify CEO permission
    const { data: profile, error: roleError } = await admin
      .from("user_roles")
      .select("role")
      .eq("id", user.id)
      .maybeSingle();

    if (roleError || !profile || profile.role !== "CEO") {
      return NextResponse.json(
        { error: "CEO access required" },
        { status: 403 }
      );
    }

    const body = await request.json();

    requestId = body.request_id;
    const action = body.action;

    if (
      typeof requestId !== "string" ||
      !requestId.trim() ||
      !["approve", "deny"].includes(action)
    ) {
      return NextResponse.json(
        { error: "Invalid request ID or action" },
        { status: 400 }
      );
    }

    const { data: changeRequest, error: fetchError } =
      await admin
        .from("account_change_requests")
        .select("*")
        .eq("id", requestId)
        .maybeSingle();

    if (fetchError || !changeRequest) {
      return NextResponse.json(
        { error: "Change request not found" },
        { status: 404 }
      );
    }

    if (changeRequest.status !== "Pending") {
      return NextResponse.json(
        { error: "This request has already been processed" },
        { status: 409 }
      );
    }

    // Deny request
    if (action === "deny") {
      const { data: deniedRequest, error: denyError } =
        await admin
          .from("account_change_requests")
          .update({
            status: "Denied",
            reviewed_by: user.id,
            reviewed_at: new Date().toISOString(),
          })
          .eq("id", requestId)
          .eq("status", "Pending")
          .select("id")
          .maybeSingle();

      if (denyError || !deniedRequest) {
        return NextResponse.json(
          { error: "Unable to deny this request. It may already be processed." },
          { status: 409 }
        );
      }

      return NextResponse.json({
        success: true,
        message: "Request denied successfully",
      });
    }

    // Claim request to prevent duplicate processing
    const { data: claimedRequest, error: claimError } =
      await admin
        .from("account_change_requests")
        .update({ status: "Processing" })
        .eq("id", requestId)
        .eq("status", "Pending")
        .select("id")
        .maybeSingle();

    if (claimError || !claimedRequest) {
      return NextResponse.json(
        { error: "This request is already being processed" },
        { status: 409 }
      );
    }

    // Get the actual account from Supabase Auth
    const { data: accountData, error: accountError } =
      await admin.auth.admin.getUserById(changeRequest.user_id);

    if (accountError || !accountData?.user) {
      await admin
        .from("account_change_requests")
        .update({ status: "Pending" })
        .eq("id", requestId)
        .eq("status", "Processing");

      return NextResponse.json(
        { error: "User account not found" },
        { status: 404 }
      );
    }

    const targetUser = accountData.user;

    // Approve name or phone change
    if (
      changeRequest.request_type === "full_name" ||
      changeRequest.request_type === "phone"
    ) {
      const newValue = changeRequest.requested_value;

      if (
        typeof newValue !== "string" ||
        !newValue.trim()
      ) {
        throw new Error("The requested value is empty or invalid.");
      }

      const metadata = {
        ...(targetUser.user_metadata || {}),
      };

      if (changeRequest.request_type === "full_name") {
        metadata.full_name = newValue.trim();
      }

      if (changeRequest.request_type === "phone") {
        metadata.phone = newValue.trim();
      }

      const { error: updateUserError } =
        await admin.auth.admin.updateUserById(
          changeRequest.user_id,
          { user_metadata: metadata }
        );

      if (updateUserError) {
        throw updateUserError;
      }
    }

    // Approve password change by sending a secure recovery email
    else if (changeRequest.request_type === "password") {
      const email = targetUser.email;

      if (!email) {
        throw new Error("User email address was not found.");
      }

      const { error: resetError } =
        await authClient.auth.resetPasswordForEmail(email);

      if (resetError) {
        throw resetError;
      }
    } else {
      throw new Error("Unsupported change request type.");
    }

    // Mark request as approved
    const { error: approveError } = await admin
      .from("account_change_requests")
      .update({
        status: "Approved",
        reviewed_by: user.id,
        reviewed_at: new Date().toISOString(),
      })
      .eq("id", requestId)
      .eq("status", "Processing");

    if (approveError) {
      throw approveError;
    }

    return NextResponse.json({
      success: true,
      message:
        changeRequest.request_type === "password"
          ? "Request approved. Password reset email sent."
          : "Account change approved successfully.",
    });

  } catch (error) {
    if (admin && requestId) {
      await admin
        .from("account_change_requests")
        .update({ status: "Pending" })
        .eq("id", requestId)
        .eq("status", "Processing");
    }

    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}

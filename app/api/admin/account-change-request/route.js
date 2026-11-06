
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

    if (roleError) {
      console.error("CEO role lookup error:", roleError);

      return NextResponse.json(
        {
          error: "Unable to verify CEO permissions",
          details: roleError.message,
          code: roleError.code,
        },
        { status: 500 }
      );
    }

    if (!profile || profile.role !== "CEO") {
      return NextResponse.json(
        { error: "CEO access required" },
        { status: 403 }
      );
    }

    const body = await request.json();

    requestId =
      typeof body.request_id === "string"
        ? body.request_id.trim()
        : "";

    const action = body.action;

    if (
      !requestId ||
      !["approve", "deny"].includes(action)
    ) {
      return NextResponse.json(
        { error: "Invalid request ID or action" },
        { status: 400 }
      );
    }

    // Find the requested account change
    const {
      data: changeRequest,
      error: fetchError,
    } = await admin
      .from("account_change_requests")
      .select("*")
      .eq("id", requestId)
      .maybeSingle();

    if (fetchError) {
      console.error("Change request database error:", fetchError);

      return NextResponse.json(
        {
          error: "Database error while finding the request",
          details: fetchError.message,
          code: fetchError.code,
          request_id: requestId,
        },
        { status: 500 }
      );
    }

    if (!changeRequest) {
      console.error(
        "Change request does not exist:",
        requestId
      );

      return NextResponse.json(
        {
          error: "Change request not found",
          request_id: requestId,
          details: "No matching row was returned from account_change_requests.",
        },
        { status: 404 }
      );
    }

    // Only name and phone requests are supported
    if (
      !["full_name", "phone"].includes(
        changeRequest.request_type
      )
    ) {
      return NextResponse.json(
        {
          error: "This request type is no longer supported.",
        },
        { status: 400 }
      );
    }

    if (changeRequest.status !== "Pending") {
      return NextResponse.json(
        {
          error: "This request has already been processed",
          current_status: changeRequest.status,
        },
        { status: 409 }
      );
    }

    // Deny request
    if (action === "deny") {
      const {
        data: deniedRequest,
        error: denyError,
      } = await admin
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
        console.error("Deny request error:", denyError);

        return NextResponse.json(
          {
            error: "Unable to deny this request",
            details:
              denyError?.message ||
              "Request may already be processed.",
            code: denyError?.code,
          },
          { status: 409 }
        );
      }

      return NextResponse.json({
        success: true,
        message: "Request denied successfully",
      });
    }

    // Claim request to prevent duplicate processing
    const {
      data: claimedRequest,
      error: claimError,
    } = await admin
      .from("account_change_requests")
      .update({ status: "Processing" })
      .eq("id", requestId)
      .eq("status", "Pending")
      .select("id")
      .maybeSingle();

    if (claimError || !claimedRequest) {
      console.error("Claim request error:", claimError);

      return NextResponse.json(
        {
          error: "This request is already being processed",
          details: claimError?.message,
        },
        { status: 409 }
      );
    }

    // Get the actual account from Supabase Auth
    const {
      data: accountData,
      error: accountError,
    } = await admin.auth.admin.getUserById(
      changeRequest.user_id
    );

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

    // Approve name or phone change only
    const newValue = changeRequest.requested_value;

    if (
      typeof newValue !== "string" ||
      !newValue.trim()
    ) {
      throw new Error(
        "The requested value is empty or invalid."
      );
    }

    const metadata = {
      ...(targetUser.user_metadata || {}),
    };

    if (changeRequest.request_type === "full_name") {
      metadata.full_name = newValue.trim();
    } else if (changeRequest.request_type === "phone") {
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

    // Mark request as approved
    const {
      data: approvedRequest,
      error: approveError,
    } = await admin
      .from("account_change_requests")
      .update({
        status: "Approved",
        reviewed_by: user.id,
        reviewed_at: new Date().toISOString(),
      })
      .eq("id", requestId)
      .eq("status", "Processing")
      .select("id")
      .maybeSingle();

    if (approveError || !approvedRequest) {
      throw approveError || new Error(
        "Could not update request status to Approved."
      );
    }

    return NextResponse.json({
      success: true,
      message: "Account change approved successfully.",
    });

  } catch (error) {
    console.error("Account change request API error:", error);

    if (admin && requestId) {
      await admin
        .from("account_change_requests")
        .update({ status: "Pending" })
        .eq("id", requestId)
        .eq("status", "Processing");
    }

    return NextResponse.json(
      {
        error: error.message || "Internal server error",
        code: error.code || null,
      },
      { status: 500 }
    );
  }
}


import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function POST(request) {
  try {
    const authHeader = request.headers.get("authorization");

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const token = authHeader.replace("Bearer ", "");

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !anonKey || !serviceKey) {
      return NextResponse.json(
        { error: "Server configuration missing" },
        { status: 500 }
      );
    }

    // Verify the requesting user
    const authClient = createClient(supabaseUrl, anonKey);

    const { data: userData, error: authError } =
      await authClient.auth.getUser(token);

    if (authError || !userData?.user) {
      return NextResponse.json(
        { error: "Invalid session" },
        { status: 401 }
      );
    }

    const currentUser = userData.user;

    // Admin client
    const adminClient = createClient(supabaseUrl, serviceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    // Check role
    const { data: roleData, error: roleError } = await adminClient
      .from("user_roles")
      .select("role")
      .eq("id", currentUser.id)
      .single();

    if (roleError || roleData?.role !== "CEO") {
      return NextResponse.json(
        { error: "CEO access only" },
        { status: 403 }
      );
    }

    // Read request
    const body = await request.json();

    const full_name = body.full_name?.trim();
    const email = body.email?.trim().toLowerCase();
    const password = body.password;

    if (!full_name || !email || !password) {
      return NextResponse.json(
        { error: "Name, email and password are required" },
        { status: 400 }
      );
    }

    if (password.length < 8) {
      return NextResponse.json(
        { error: "Password must be at least 8 characters" },
        { status: 400 }
      );
    }

    // Create Recruiter in Auth
    const { data: createdUser, error: createError } =
      await adminClient.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: {
          full_name,
          role: "Recruiter",
        },
      });

    if (createError) {
      return NextResponse.json(
        { error: createError.message },
        { status: 400 }
      );
    }

    // Assign Recruiter role
    const { error: insertRoleError } = await adminClient
      .from("user_roles")
      .insert({
        id: createdUser.user.id,
        role: "Recruiter",
      });

    if (insertRoleError) {
      // Roll back Auth account if role insertion fails
      await adminClient.auth.admin.deleteUser(createdUser.user.id);

      return NextResponse.json(
        { error: insertRoleError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Recruiter account created successfully",
      user: {
        id: createdUser.user.id,
        email: createdUser.user.email,
        full_name,
        role: "Recruiter",
      },
    });
  } catch (error) {
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}


"use client";

import { useEffect, useState } from "react";
import { createClient } from "../utils/supabase/client";

export default function Home() {
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);
  const [role, setRole] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadDashboard() {
      const supabase = createClient();

      const { data: { user }, error: authError } =
        await supabase.auth.getUser();

      if (authError || !user) {
        window.location.href = "/login";
        return;
      }

      const { data: profile, error: roleError } = await supabase
        .from("user_roles")
        .select("role")
        .eq("id", user.id)
        .single();

      if (roleError || !profile) {
        setError("Unable to load your account permissions.");
        setLoading(false);
        return;
      }

      setUser(user);
      setRole(profile.role);
      setLoading(false);
    }

    loadDashboard();
  }, []);

  async function logout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    window.location.href = "/login";
  }

  if (loading) {
    return (
      <main style={styles.page}>
        <h2 style={styles.gold}>🦂 BLACK SCORPIONS</h2>
        <p>Loading your dashboard...</p>
      </main>
    );
  }

  if (error) {
    return (
      <main style={styles.page}>
        <h2 style={styles.gold}>BLACK SCORPIONS</h2>
        <p>{error}</p>
        <button onClick={logout}>Logout</button>
      </main>
    );
  }

  const isCEO = role === "CEO";

  return (
    <main style={styles.page}>
      <header style={styles.header}>
        <h1 style={styles.gold}>🦂 BLACK SCORPIONS</h1>
        <p style={styles.muted}>Recruitment Management System</p>
      </header>

      <section style={styles.card}>
        <p style={styles.muted}>Welcome back</p>
        <h2>{user?.user_metadata?.full_name || user?.email}</h2>

        <div style={styles.role}>
          {isCEO ? "CEO / FOUNDER" : role.toUpperCase()}
        </div>
      </section>

      <h2 style={styles.gold}>
        {isCEO ? "CEO Dashboard" : "Recruiter Dashboard"}
      </h2>

      <section style={styles.grid}>
        {(isCEO
          ? [
              ["Dashboard", "Management overview"],
              ["Candidates", "Manage candidate database"],
              ["Job Offers", "Manage company vacancies"],
              ["Recruiters", "Manage recruitment team"],
              ["Successful Hires", "Track successful placements"],
              ["Commissions", "Track team commissions"],
              ["Settings", "System administration"]
            ]
          : [
              ["My Candidates", "Add and view candidates"],
              ["Job Offers", "Explore available vacancies"],
              ["My Hires", "Track successful placements"],
              ["My Commissions", "Track your earnings"]
            ]
        ).map(([title, description]) => (
          <div key={title} style={styles.item}>
            <h3 style={styles.gold}>{title}</h3>
            <p style={styles.muted}>{description}</p>
          </div>
        ))}
      </section>

      <button onClick={logout} style={styles.logout}>
        LOG OUT
      </button>
    </main>
  );
}

const styles = {
  page: {
    minHeight: "100vh",
    background: "#080808",
    color: "#fff",
    padding: "25px",
    fontFamily: "Arial, sans-serif"
  },
  header: {
    textAlign: "center",
    marginBottom: "35px"
  },
  gold: {
    color: "#d4af37"
  },
  muted: {
    color: "#999"
  },
  card: {
    background: "#171717",
    border: "1px solid #d4af37",
    borderRadius: "14px",
    padding: "22px",
    marginBottom: "30px"
  },
  role: {
    display: "inline-block",
    background: "#d4af37",
    color: "#000",
    padding: "8px 15px",
    borderRadius: "6px",
    fontWeight: "bold",
    marginTop: "10px"
  },
  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
    gap: "15px"
  },
  item: {
    background: "#171717",
    border: "1px solid #333",
    borderRadius: "12px",
    padding: "18px"
  },
  logout: {
    marginTop: "30px",
    padding: "13px 25px",
    background: "#d4af37",
    color: "#000",
    border: "none",
    borderRadius: "7px",
    fontWeight: "bold",
    cursor: "pointer"
  }
};

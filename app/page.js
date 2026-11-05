
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
      try {
        const supabase = createClient();
        const { data: authData, error: authError } =
          await supabase.auth.getUser();

        if (authError || !authData.user) {
          window.location.href = "/login";
          return;
        }

        const { data: profile, error: roleError } = await supabase
          .from("user_roles")
          .select("role")
          .eq("id", authData.user.id)
          .maybeSingle();

        if (roleError || !profile) {
          setError(roleError?.message || "No role found.");
          setLoading(false);
          return;
        }

        setUser(authData.user);
        setRole(profile.role);
        setLoading(false);
      } catch (err) {
        setError(err.message || "Something went wrong.");
        setLoading(false);
      }
    }

    loadDashboard();
  }, []);

  async function logout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    window.location.href = "/login";
  }

  if (loading) {
    return <main style={styles.page}>Loading dashboard...</main>;
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

  const sections = isCEO
    ? [
        ["Dashboard", "/", "Management overview"],
        ["Candidates", "/candidates", "Manage candidate database"],
        ["Job Offers", "/job-offers", "Manage company vacancies"],
        ["Recruiters", "/recruiters", "Manage recruitment team"],
        ["Successful Hires", "/successful-hires", "Track successful placements"],
        ["Commissions", "/commissions", "Track team commissions"],
        ["Settings", "/settings", "System administration"]
      ]
    : [
        ["My Candidates", "/candidates", "Add and view candidates"],
        ["Job Offers", "/job-offers", "Explore available vacancies"],
        ["My Hires", "/successful-hires", "Track successful placements"],
        ["My Commissions", "/commissions", "Track your earnings"]
      ];

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
        {sections.map(([title, href, description]) => (
          <a href={href} key={title} style={styles.item}>
            <h3 style={styles.gold}>{title} →</h3>
            <p style={styles.muted}>{description}</p>
          </a>
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
    padding: 25,
    fontFamily: "Arial, sans-serif"
  },
  header: {
    textAlign: "center",
    marginBottom: 35
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
    borderRadius: 14,
    padding: 22,
    marginBottom: 30
  },
  role: {
    display: "inline-block",
    background: "#d4af37",
    color: "#000",
    padding: "8px 15px",
    borderRadius: 6,
    fontWeight: "bold",
    marginTop: 10
  },
  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
    gap: 15
  },
  item: {
    display: "block",
    textDecoration: "none",
    background: "#171717",
    border: "1px solid #333",
    borderRadius: 12,
    padding: 18,
    color: "#fff"
  },
  logout: {
    marginTop: 30,
    padding: "13px 25px",
    background: "#d4af37",
    color: "#000",
    border: "none",
    borderRadius: 7,
    fontWeight: "bold",
    cursor: "pointer"
  }
};

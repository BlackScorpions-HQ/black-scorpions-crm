
"use client";

import { useEffect, useState } from "react";
import { createClient } from "../utils/supabase/client";

export default function Home() {
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);
  const [role, setRole] = useState("");
  const [error, setError] = useState("");
  const [team, setTeam] = useState([]);
  const [teamLoading, setTeamLoading] = useState(false);
  const [teamError, setTeamError] = useState("");

  const [supabase] = useState(() => createClient());

  useEffect(() => {
    async function loadDashboard() {
      try {
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

        if (profile.role === "CEO" || profile.role === "Team Leader") {
          loadTeam();
        }
      } catch (err) {
        setError(err.message || "Something went wrong.");
        setLoading(false);
      }
    }

    async function loadTeam() {
      setTeamLoading(true);
      setTeamError("");

      const { data, error } = await supabase.rpc("get_my_team");

      if (error) {
        setTeamError(error.message);
      } else {
        setTeam(data || []);
      }

      setTeamLoading(false);
    }

    loadDashboard();
  }, [supabase]);

  async function logout() {
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
  const isTeamLeader = role === "Team Leader";

  const sections = isCEO
    ? [
        ["Dashboard", "/", "Management overview"],
        ["Candidates", "/candidates", "Manage candidate database"],
        ["Job Offers", "/job-offers", "Manage company vacancies"],
        ["Recruiters", "/recruiters", "Manage recruitment team"],
        ["Account Management", "/account-management", "Manage accounts and team assignments"],
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
        {isCEO
          ? "CEO Dashboard"
          : isTeamLeader
          ? "Team Leader Dashboard"
          : "Recruiter Dashboard"}
      </h2>

      <section style={styles.grid}>
        {sections.map(([title, href, description]) => (
          <a
            href={href}
            key={title}
            style={{
              ...styles.item,
              ...(title === "Account Management" ? styles.adminItem : {})
            }}
          >
            <h3 style={styles.gold}>{title} →</h3>
            <p style={styles.muted}>{description}</p>
          </a>
        ))}
      </section>

      {(isCEO || isTeamLeader) && (
        <section style={styles.teamSection}>
          <h2 style={styles.gold}>
            {isCEO ? "🏆 Company Teams" : "👥 My Team"}
          </h2>

          <p style={styles.muted}>
            {isCEO
              ? "View all Team Leaders and Recruiters in your company."
              : "View the Recruiters assigned to your team."}
          </p>

          {teamLoading ? (
            <p style={styles.muted}>Loading team members...</p>
          ) : teamError ? (
            <p style={styles.error}>Team Error: {teamError}</p>
          ) : team.length === 0 ? (
            <p style={styles.muted}>No team members found yet.</p>
          ) : (
            <>
              <div style={styles.stats}>
                <div style={styles.statCard}>
                  <h2 style={styles.gold}>{team.length}</h2>
                  <p style={styles.muted}>Team Members</p>
                </div>

                <div style={styles.statCard}>
                  <h2 style={styles.gold}>
                    {team.reduce(
                      (total, member) =>
                        total + Number(member.candidate_count || 0),
                      0
                    )}
                  </h2>
                  <p style={styles.muted}>Total Candidates</p>
                </div>
              </div>

              <div style={{ overflowX: "auto" }}>
                <table style={styles.table}>
                  <thead>
                    <tr>
                      <th style={styles.cell}>Name</th>
                      <th style={styles.cell}>Role</th>
                      {isCEO && (
                        <th style={styles.cell}>Team Leader</th>
                      )}
                      <th style={styles.cell}>Candidates</th>
                    </tr>
                  </thead>

                  <tbody>
                    {team.map((member) => (
                      <tr key={member.member_id}>
                        <td style={styles.cell}>
                          <strong>{member.member_name}</strong>
                          <br />
                          <span style={styles.muted}>
                            {member.member_email}
                          </span>
                        </td>

                        <td style={styles.cell}>
                          {member.member_role}
                        </td>

                        {isCEO && (
                          <td style={styles.cell}>
                            {member.team_leader_name}
                          </td>
                        )}

                        <td style={styles.cell}>
                          {member.candidate_count}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </section>
      )}

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
  adminItem: {
    border: "1px solid #d4af37",
    background: "linear-gradient(135deg, #211b0d, #171717)",
    boxShadow: "0 0 12px rgba(212,175,55,0.12)"
  },
  teamSection: {
    marginTop: 35,
    padding: 20,
    background: "#171717",
    border: "1px solid #d4af37",
    borderRadius: 14
  },
  stats: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))",
    gap: 12,
    margin: "20px 0"
  },
  statCard: {
    background: "#222",
    borderRadius: 10,
    padding: 15,
    textAlign: "center"
  },
  table: {
    width: "100%",
    minWidth: 550,
    borderCollapse: "collapse",
    marginTop: 15,
    textAlign: "left"
  },
  cell: {
    padding: 13,
    borderBottom: "1px solid #333",
    verticalAlign: "top"
  },
  error: {
    color: "#ff5555"
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

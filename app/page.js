
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

  const [hires, setHires] = useState([]);
  const [commissions, setCommissions] = useState([]);
  const [analyticsError, setAnalyticsError] = useState("");

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

        if (
          profile.role === "CEO" ||
          profile.role === "Team Leader"
        ) {
          await loadTeam();
          await loadAnalytics();
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

    async function loadAnalytics() {
      setAnalyticsError("");

      const [hireResult, commissionResult] = await Promise.all([
        supabase
          .from("successful_hires")
          .select(
            "id, recruiter_id, recruiter_name, team_leader_id, team_leader_name, recruiter_commission, team_leader_commission, founder_commission, hiring_date"
          ),

        supabase
          .from("commissions")
          .select(
            "id, user_id, user_name, user_role, amount, status"
          ),
      ]);

      if (hireResult.error) {
        setAnalyticsError(
          "Hires Error: " + hireResult.error.message
        );
      } else {
        setHires(hireResult.data || []);
      }

      if (commissionResult.error) {
        setAnalyticsError((previous) =>
          previous
            ? previous + " | Commissions Error: " +
              commissionResult.error.message
            : "Commissions Error: " +
              commissionResult.error.message
        );
      } else {
        setCommissions(commissionResult.data || []);
      }
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
        ["Commission Structure", "/commission-structures", "Manage offer commission rates"],
        ["Settings", "/settings", "System administration"]
      ]
    : [
        ["My Candidates", "/candidates", "Add and view candidates"],
        ["Job Offers", "/job-offers", "Explore available vacancies"],
        ["My Hires", "/successful-hires", "Track successful placements"],
        ["Commission Structure", "/commission-structures", "View offer commission rates"]
      ];

  const recruiters = team.filter(
    (member) => member.member_role === "Recruiter"
  );

  const totalCandidates = team.reduce(
    (total, member) =>
      total + Number(member.candidate_count || 0),
    0
  );

  const totalTeamCommissions = commissions
    .filter((item) => item.user_role !== "CEO")
    .reduce(
      (total, item) => total + Number(item.amount || 0),
      0
    );

  const totalPendingCommissions = commissions
    .filter(
      (item) =>
        item.user_role !== "CEO" &&
        item.status === "Pending"
    )
    .reduce(
      (total, item) => total + Number(item.amount || 0),
      0
    );

  const totalPaidCommissions = commissions
    .filter(
      (item) =>
        item.user_role !== "CEO" &&
        item.status === "Paid"
    )
    .reduce(
      (total, item) => total + Number(item.amount || 0),
      0
    );

  const recruiterPerformance = recruiters.map((recruiter) => {
    const recruiterHires = hires.filter(
      (hire) => hire.recruiter_id === recruiter.member_id
    );

    const recruiterCommission = commissions
      .filter(
        (item) =>
          item.user_id === recruiter.member_id &&
          item.user_role === "Recruiter"
      )
      .reduce(
        (total, item) => total + Number(item.amount || 0),
        0
      );

    return {
      ...recruiter,
      hire_count: recruiterHires.length,
      commission_total: recruiterCommission,
    };
  });

  return (
    <main style={styles.page}>
      <header style={styles.header}>
        <h1 style={styles.gold}>🦂 BLACK SCORPIONS</h1>
        <p style={styles.muted}>Recruitment Management System</p>
      </header>

      <section style={styles.card}>
        <p style={styles.muted}>Welcome back</p>
        <h2>
          {user?.user_metadata?.full_name || user?.email}
        </h2>

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
              ...(title === "Account Management"
                ? styles.adminItem
                : {})
            }}
          >
            <h3 style={styles.gold}>{title} →</h3>
            <p style={styles.muted}>{description}</p>
          </a>
        ))}
      </section>

      {(isCEO || isTeamLeader) && (
        <>
          <section style={styles.teamSection}>
            <h2 style={styles.gold}>
              {isCEO ? "🏆 Company Overview" : "👥 My Team Overview"}
            </h2>

            <p style={styles.muted}>
              {isCEO
                ? "Complete company performance and recruitment statistics."
                : "Performance and statistics for your assigned team."}
            </p>

            {teamLoading ? (
              <p style={styles.muted}>Loading team members...</p>
            ) : teamError ? (
              <p style={styles.error}>
                Team Error: {teamError}
              </p>
            ) : (
              <>
                <div style={styles.stats}>
                  <div style={styles.statCard}>
                    <h2 style={styles.gold}>
                      {recruiters.length}
                    </h2>
                    <p style={styles.muted}>Total Recruiters</p>
                  </div>

                  <div style={styles.statCard}>
                    <h2 style={styles.gold}>
                      {totalCandidates}
                    </h2>
                    <p style={styles.muted}>Total Candidates</p>
                  </div>

                  <div style={styles.statCard}>
                    <h2 style={styles.gold}>
                      {hires.length}
                    </h2>
                    <p style={styles.muted}>Successful Hires</p>
                  </div>

                  <div style={styles.statCard}>
                    <h2 style={styles.gold}>
                      {totalTeamCommissions.toLocaleString()} EGP
                    </h2>
                    <p style={styles.muted}>Team Commissions</p>
                  </div>
                </div>

                <div style={styles.stats}>
                  <div style={styles.statCard}>
                    <h3 style={{ color: "#facc15" }}>
                      {totalPendingCommissions.toLocaleString()} EGP
                    </h3>
                    <p style={styles.muted}>Pending Commissions</p>
                  </div>

                  <div style={styles.statCard}>
                    <h3 style={{ color: "#4ade80" }}>
                      {totalPaidCommissions.toLocaleString()} EGP
                    </h3>
                    <p style={styles.muted}>Paid Commissions</p>
                  </div>
                </div>
              </>
            )}
          </section>

          {analyticsError && (
            <p style={styles.error}>
              Dashboard Data Error: {analyticsError}
            </p>
          )}

          {!analyticsError && !teamError && (
            <section style={styles.teamSection}>
              <h2 style={styles.gold}>
                📊 Recruiter Performance
              </h2>

              {recruiterPerformance.length === 0 ? (
                <p style={styles.muted}>
                  No Recruiters found in this team yet.
                </p>
              ) : (
                <div style={{ overflowX: "auto" }}>
                  <table style={styles.table}>
                    <thead>
                      <tr>
                        <th style={styles.cell}>Recruiter</th>
                        <th style={styles.cell}>Candidates</th>
                        <th style={styles.cell}>Successful Hires</th>
                        <th style={styles.cell}>Commissions</th>
                      </tr>
                    </thead>

                    <tbody>
                      {recruiterPerformance.map((recruiter) => (
                        <tr key={recruiter.member_id}>
                          <td style={styles.cell}>
                            <strong>{recruiter.member_name}</strong>
                            <br />
                            <span style={styles.muted}>
                              {recruiter.member_email}
                            </span>
                          </td>

                          <td style={styles.cell}>
                            {recruiter.candidate_count || 0}
                          </td>

                          <td style={styles.cell}>
                            {recruiter.hire_count}
                          </td>

                          <td style={styles.cell}>
                            {recruiter.commission_total.toLocaleString()} EGP
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          )}

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
              <p style={styles.error}>
                Team Error: {teamError}
              </p>
            ) : team.length === 0 ? (
              <p style={styles.muted}>
                No team members found yet.
              </p>
            ) : (
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
                          {member.candidate_count || 0}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </>
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
    gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
    gap: 12,
    margin: "20px 0"
  },

  statCard: {
    background: "#222",
    borderRadius: 10,
    padding: 15,
    textAlign: "center",
    overflowWrap: "anywhere"
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
    color: "#ff5555",
    marginTop: 15
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

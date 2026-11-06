
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "../../utils/supabase/client";

export default function AccountManagement() {
  const [supabase] = useState(() => createClient());
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [users, setUsers] = useState([]);
  const [leaders, setLeaders] = useState([]);
  const [selectedUser, setSelectedUser] = useState("");
  const [selectedLeader, setSelectedLeader] = useState("");
  const [message, setMessage] = useState("");

  async function loadData() {
    setLoading(true);
    setMessage("");

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      router.replace("/login");
      return;
    }

    const { data: roleData, error: roleError } = await supabase
      .from("user_roles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (roleError || roleData?.role !== "CEO") {
      router.replace("/");
      return;
    }

    const [teamResult, leadersResult] = await Promise.all([
      supabase.rpc("get_my_team"),
      supabase.rpc("get_team_leaders"),
    ]);

    if (teamResult.error) {
      setMessage("Team Error: " + teamResult.error.message);
      setLoading(false);
      return;
    }

    if (leadersResult.error) {
      setMessage("Leaders Error: " + leadersResult.error.message);
      setLoading(false);
      return;
    }

    setUsers(teamResult.data || []);
    setLeaders(leadersResult.data || []);
    setLoading(false);
  }

  useEffect(() => {
    loadData();
  }, []);

  async function getToken() {
    const {
      data: { session },
    } = await supabase.auth.getSession();

    return session?.access_token;
  }

  async function moveUser() {
    if (!selectedUser) {
      setMessage("Select a recruiter first.");
      return;
    }

    setSaving(true);
    setMessage("");

    try {
      const token = await getToken();

      if (!token) throw new Error("Please login again.");

      const response = await fetch("/api/admin/assign-team", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          recruiter_id: selectedUser,
          team_leader_id: selectedLeader || null,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Move failed.");
      }

      setMessage("Recruiter team updated successfully!");
      await loadData();
    } catch (error) {
      setMessage(error.message);
      setLoading(false);
    }

    setSaving(false);
  }

  async function deleteUser() {
    if (!selectedUser) {
      setMessage("Select a recruiter first.");
      return;
    }

    const selected = users.find(
      (item) => item.member_id === selectedUser
    );

    if (!selected) return;

    const confirmed = window.confirm(
      `Delete ${selected.member_name}'s account?\n\nTheir candidate records will be preserved.`
    );

    if (!confirmed) return;

    setSaving(true);
    setMessage("");

    try {
      const token = await getToken();

      if (!token) throw new Error("Please login again.");

      const response = await fetch("/api/admin/delete-user", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          user_id: selectedUser,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Delete failed.");
      }

      setMessage("Account deleted. Candidate records were preserved.");
      setSelectedUser("");
      setSelectedLeader("");
      await loadData();
    } catch (error) {
      setMessage(error.message);
      setLoading(false);
    }

    setSaving(false);
  }

  const selected = users.find(
    (item) => item.member_id === selectedUser
  );

  const recruiters = users.filter(
    (item) => item.member_role === "Recruiter"
  );

  const teamLeaders = users.filter(
    (item) => item.member_role === "Team Leader"
  );

  const totalCandidates = users.reduce(
    (sum, item) => sum + Number(item.candidate_count || 0),
    0
  );

  return (
    <main style={styles.page}>
      <div style={styles.glowOne} />
      <div style={styles.glowTwo} />

      <div style={styles.container}>
        <button
          onClick={() => router.push("/")}
          style={styles.backButton}
        >
          ← DASHBOARD
        </button>

        <header style={styles.header}>
          <div style={styles.logo}>♏</div>

          <p style={styles.eyebrow}>
            BLACK SCORPIONS • CEO CONTROL CENTER
          </p>

          <h1 style={styles.title}>
            ACCOUNT <span style={styles.goldText}>MANAGEMENT</span>
          </h1>

          <p style={styles.subtitle}>
            Manage your organization, recruiters and team assignments.
          </p>

          <div style={styles.line} />
        </header>

        {loading ? (
          <div style={styles.loading}>
            <div style={styles.spinner} />
            <p>LOADING ACCOUNTS...</p>
          </div>
        ) : (
          <>
            <div style={styles.statsGrid}>
              <div style={styles.statCard}>
                <p style={styles.statLabel}>TOTAL MEMBERS</p>
                <h2 style={styles.statNumber}>{users.length}</h2>
                <span style={styles.statDescription}>
                  Registered team members
                </span>
              </div>

              <div style={styles.statCard}>
                <p style={styles.statLabel}>RECRUITERS</p>
                <h2 style={styles.statNumber}>{recruiters.length}</h2>
                <span style={styles.statDescription}>
                  Active recruitment accounts
                </span>
              </div>

              <div style={styles.statCard}>
                <p style={styles.statLabel}>TEAM LEADERS</p>
                <h2 style={styles.statNumber}>{teamLeaders.length}</h2>
                <span style={styles.statDescription}>
                  Team management accounts
                </span>
              </div>

              <div style={styles.statCard}>
                <p style={styles.statLabel}>TOTAL CANDIDATES</p>
                <h2 style={styles.statNumber}>{totalCandidates}</h2>
                <span style={styles.statDescription}>
                  Candidates across the organization
                </span>
              </div>
            </div>

            <section style={styles.section}>
              <div style={styles.sectionHeader}>
                <div>
                  <p style={styles.sectionEyebrow}>ORGANIZATION</p>
                  <h2 style={styles.sectionTitle}>TEAM MEMBERS</h2>
                </div>

                <span style={styles.countBadge}>
                  {users.length} MEMBERS
                </span>
              </div>

              {users.length === 0 ? (
                <div style={styles.empty}>
                  No team members found.
                </div>
              ) : (
                <div style={styles.tableWrapper}>
                  <table style={styles.table}>
                    <thead>
                      <tr>
                        <th style={styles.th}>MEMBER NAME</th>
                        <th style={styles.th}>ROLE</th>
                        <th style={styles.th}>TEAM LEADER</th>
                        <th style={styles.th}>CANDIDATES</th>
                      </tr>
                    </thead>

                    <tbody>
                      {users.map((item) => (
                        <tr key={item.member_id}>
                          <td style={styles.td}>
                            <strong style={{ color: "#fff" }}>
                              {item.member_name}
                            </strong>
                          </td>

                          <td style={styles.td}>
                            <span
                              style={{
                                ...styles.roleBadge,
                                ...(item.member_role === "Team Leader"
                                  ? styles.leaderBadge
                                  : {}),
                              }}
                            >
                              {item.member_role}
                            </span>
                          </td>

                          <td style={styles.td}>
                            {item.team_leader_name || "Direct under CEO"}
                          </td>

                          <td style={styles.td}>
                            <span style={styles.candidateCount}>
                              {item.candidate_count || 0}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>

            <section style={styles.section}>
              <div style={styles.sectionHeader}>
                <div>
                  <p style={styles.sectionEyebrow}>CEO OPERATIONS</p>
                  <h2 style={styles.sectionTitle}>MANAGE RECRUITER</h2>
                </div>

                <span style={styles.adminBadge}>CEO ONLY</span>
              </div>

              <div style={styles.formContent}>
                <label style={styles.label}>
                  SELECT RECRUITER
                </label>

                <select
                  value={selectedUser}
                  onChange={(e) => {
                    setSelectedUser(e.target.value);
                    setSelectedLeader("");
                  }}
                  style={styles.select}
                >
                  <option value="">Choose a recruiter...</option>

                  {recruiters.map((item) => (
                    <option
                      key={item.member_id}
                      value={item.member_id}
                    >
                      {item.member_name}
                    </option>
                  ))}
                </select>

                {selected && (
                  <div style={styles.currentTeam}>
                    <span style={styles.currentTeamLabel}>
                      CURRENT TEAM
                    </span>
                    <strong>
                      {selected.team_leader_name || "Direct under CEO"}
                    </strong>
                  </div>
                )}

                <label style={styles.label}>
                  ASSIGN TO TEAM LEADER
                </label>

                <select
                  value={selectedLeader}
                  onChange={(e) => setSelectedLeader(e.target.value)}
                  style={styles.select}
                >
                  <option value="">Directly under CEO</option>

                  {leaders.map((leader) => (
                    <option key={leader.id} value={leader.id}>
                      {leader.full_name} ({leader.role})
                    </option>
                  ))}
                </select>

                <button
                  onClick={moveUser}
                  disabled={saving || !selectedUser}
                  style={{
                    ...styles.goldButton,
                    opacity: saving || !selectedUser ? 0.5 : 1,
                  }}
                >
                  {saving ? "PLEASE WAIT..." : "↗  UPDATE TEAM ASSIGNMENT"}
                </button>

                <button
                  onClick={deleteUser}
                  disabled={saving || !selectedUser}
                  style={{
                    ...styles.deleteButton,
                    opacity: saving || !selectedUser ? 0.5 : 1,
                  }}
                >
                  {saving ? "PLEASE WAIT..." : "✕  DELETE ACCOUNT"}
                </button>

                <p style={styles.warning}>
                  Deleting an account preserves its candidate records.
                </p>
              </div>
            </section>
          </>
        )}

        {message && (
          <div
            style={{
              ...styles.message,
              borderColor:
                message.toLowerCase().includes("error") ||
                message.toLowerCase().includes("failed")
                  ? "#a33"
                  : "#d4af37",
              color:
                message.toLowerCase().includes("error") ||
                message.toLowerCase().includes("failed")
                  ? "#ff8888"
                  : "#e8c75a",
            }}
          >
            {message}
          </div>
        )}

        <footer style={styles.footer}>
          BLACK SCORPIONS RECRUITMENT AGENCY
          <span> • </span>
          CONTROLLED BY CEO
        </footer>
      </div>
    </main>
  );
}

const styles = {
  page: {
    minHeight: "100vh",
    background:
      "radial-gradient(ellipse at 50% 0%, #30230b 0%, #111 35%, #050505 75%)",
    color: "#fff",
    padding: "28px 16px 45px",
    fontFamily: "Arial, sans-serif",
    position: "relative",
    overflow: "hidden",
  },

  glowOne: {
    position: "absolute",
    top: 250,
    left: "-180px",
    width: 350,
    height: 350,
    borderRadius: "50%",
    background: "rgba(212,175,55,0.07)",
    filter: "blur(100px)",
    pointerEvents: "none",
  },

  glowTwo: {
    position: "absolute",
    top: 850,
    right: "-180px",
    width: 350,
    height: 350,
    borderRadius: "50%",
    background: "rgba(212,175,55,0.06)",
    filter: "blur(100px)",
    pointerEvents: "none",
  },

  container: {
    maxWidth: 1050,
    margin: "0 auto",
    position: "relative",
    zIndex: 1,
  },

  backButton: {
    background: "rgba(212,175,55,0.06)",
    color: "#d4af37",
    border: "1px solid rgba(212,175,55,0.5)",
    padding: "11px 18px",
    borderRadius: 8,
    cursor: "pointer",
    fontWeight: "bold",
    letterSpacing: 1,
    marginBottom: 35,
  },

  header: {
    textAlign: "center",
    marginBottom: 38,
  },

  logo: {
    fontSize: 40,
    color: "#d4af37",
    marginBottom: 12,
    textShadow: "0 0 25px rgba(212,175,55,0.45)",
  },

  eyebrow: {
    color: "#a98b3b",
    fontSize: 11,
    letterSpacing: 4,
    fontWeight: "bold",
  },

  title: {
    fontSize: "clamp(27px, 5vw, 42px)",
    fontWeight: 900,
    letterSpacing: 2,
    margin: "14px 0",
  },

  goldText: {
    color: "#d4af37",
  },

  subtitle: {
    color: "#999",
    fontSize: 14,
    lineHeight: 1.7,
  },

  line: {
    width: 100,
    height: 2,
    background: "linear-gradient(90deg, transparent, #d4af37, transparent)",
    margin: "25px auto 0",
  },

  statsGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
    gap: 14,
    marginBottom: 25,
  },

  statCard: {
    background: "linear-gradient(145deg, #1d1a12, #101010)",
    border: "1px solid rgba(212,175,55,0.23)",
    borderRadius: 14,
    padding: 20,
    boxShadow: "0 8px 25px rgba(0,0,0,0.3)",
  },

  statLabel: {
    color: "#a98b3b",
    fontSize: 10,
    letterSpacing: 1.5,
    fontWeight: "bold",
  },

  statNumber: {
    color: "#e4c45b",
    fontSize: 34,
    margin: "12px 0 5px",
  },

  statDescription: {
    color: "#777",
    fontSize: 11,
  },

  section: {
    background: "linear-gradient(145deg, #181818, #101010)",
    border: "1px solid rgba(212,175,55,0.22)",
    borderRadius: 16,
    padding: "22px 20px",
    marginBottom: 22,
    boxShadow: "0 12px 35px rgba(0,0,0,0.25)",
  },

  sectionHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 12,
    marginBottom: 22,
  },

  sectionEyebrow: {
    color: "#a98b3b",
    fontSize: 10,
    letterSpacing: 2,
    fontWeight: "bold",
    margin: "0 0 7px",
  },

  sectionTitle: {
    color: "#e3c35a",
    fontSize: 19,
    letterSpacing: 1.5,
    margin: 0,
  },

  countBadge: {
    color: "#d4af37",
    background: "rgba(212,175,55,0.1)",
    border: "1px solid rgba(212,175,55,0.3)",
    borderRadius: 20,
    padding: "7px 12px",
    fontSize: 10,
    fontWeight: "bold",
  },

  adminBadge: {
    color: "#d4af37",
    border: "1px solid #8e722b",
    background: "rgba(212,175,55,0.08)",
    borderRadius: 20,
    padding: "7px 12px",
    fontSize: 10,
    fontWeight: "bold",
  },

  tableWrapper: {
    width: "100%",
    overflowX: "auto",
  },

  table: {
    width: "100%",
    minWidth: 600,
    borderCollapse: "collapse",
    textAlign: "left",
  },

  th: {
    color: "#c6a747",
    fontSize: 10,
    letterSpacing: 1,
    padding: "13px 12px",
    borderBottom: "1px solid #514321",
    whiteSpace: "nowrap",
  },

  td: {
    color: "#aaa",
    fontSize: 13,
    padding: "15px 12px",
    borderBottom: "1px solid #292929",
  },

  roleBadge: {
    display: "inline-block",
    color: "#d4af37",
    background: "rgba(212,175,55,0.09)",
    border: "1px solid rgba(212,175,55,0.2)",
    borderRadius: 20,
    padding: "5px 9px",
    fontSize: 10,
    fontWeight: "bold",
  },

  leaderBadge: {
    color: "#fff0b0",
    background: "rgba(212,175,55,0.2)",
  },

  candidateCount: {
    color: "#e3c35a",
    fontWeight: "bold",
  },

  empty: {
    color: "#888",
    textAlign: "center",
    padding: 25,
  },

  formContent: {
    maxWidth: 650,
  },

  label: {
    display: "block",
    color: "#c6a747",
    fontSize: 11,
    fontWeight: "bold",
    letterSpacing: 1,
    marginBottom: 10,
    marginTop: 17,
  },

  select: {
    width: "100%",
    padding: 14,
    borderRadius: 9,
    background: "#090909",
    color: "#fff",
    border: "1px solid #514321",
    outline: "none",
    fontSize: 13,
    marginBottom: 10,
  },

  currentTeam: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 8,
    background: "rgba(212,175,55,0.07)",
    border: "1px solid rgba(212,175,55,0.17)",
    borderRadius: 9,
    padding: 13,
    margin: "5px 0 15px",
    color: "#e3c35a",
    fontSize: 12,
  },

  currentTeamLabel: {
    color: "#999",
    fontSize: 10,
    letterSpacing: 1,
  },

  goldButton: {
    width: "100%",
    padding: 15,
    marginTop: 22,
    border: "none",
    borderRadius: 9,
    background: "linear-gradient(110deg, #a98524, #f0d36a, #b28b2d)",
    color: "#090909",
    fontWeight: 900,
    fontSize: 12,
    letterSpacing: 1,
    cursor: "pointer",
    boxShadow: "0 5px 20px rgba(212,175,55,0.15)",
  },

  deleteButton: {
    width: "100%",
    padding: 14,
    marginTop: 12,
    border: "1px solid #813737",
    borderRadius: 9,
    background: "linear-gradient(110deg, #260d0d, #391313)",
    color: "#ff8585",
    fontWeight: "bold",
    fontSize: 12,
    letterSpacing: 1,
    cursor: "pointer",
  },

  warning: {
    color: "#777",
    fontSize: 11,
    lineHeight: 1.6,
    marginTop: 17,
  },

  message: {
    marginTop: 20,
    padding: 15,
    borderRadius: 9,
    background: "#171717",
    border: "1px solid",
    fontSize: 13,
    lineHeight: 1.6,
  },

  loading: {
    textAlign: "center",
    padding: 60,
    color: "#d4af37",
    letterSpacing: 2,
    fontSize: 12,
  },

  spinner: {
    width: 30,
    height: 30,
    border: "3px solid #333",
    borderTop: "3px solid #d4af37",
    borderRadius: "50%",
    margin: "0 auto 15px",
  },

  footer: {
    textAlign: "center",
    color: "#68604c",
    fontSize: 9,
    letterSpacing: 1.5,
    marginTop: 45,
    lineHeight: 2,
  },
};

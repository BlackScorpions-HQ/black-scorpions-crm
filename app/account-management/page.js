
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "../../utils/supabase/client";

const UNIT_ROLE = "Unit manager";

export default function AccountManagement() {
  const [supabase] = useState(() => createClient());
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [users, setUsers] = useState([]);
  const [hires, setHires] = useState([]);
  const [commissions, setCommissions] = useState([]);

  const [selectedUser, setSelectedUser] = useState("");
  const [selectedLeader, setSelectedLeader] = useState("");

  const [selectedTeamLeader, setSelectedTeamLeader] = useState("");
  const [selectedUnitManager, setSelectedUnitManager] = useState("");

  const [message, setMessage] = useState("");

  async function loadData() {
    setLoading(true);
    setMessage("");

    try {
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError || !user) {
        router.replace("/login");
        return;
      }

      const { data: roleData, error: roleError } =
        await supabase
          .from("user_roles")
          .select("role")
          .eq("id", user.id)
          .single();

      if (roleError || roleData?.role !== "CEO") {
        router.replace("/");
        return;
      }

      const [membersResult, hiresResult, commissionsResult] =
        await Promise.all([
          supabase.rpc("get_account_management_members"),
          supabase.from("successful_hires").select("*"),
          supabase.from("commissions").select("*"),
        ]);

      if (membersResult.error) {
        throw new Error(membersResult.error.message);
      }

      if (hiresResult.error) {
        throw new Error(
          "Successful Hires: " + hiresResult.error.message
        );
      }

      if (commissionsResult.error) {
        throw new Error(
          "Commissions: " + commissionsResult.error.message
        );
      }

      setUsers(membersResult.data || []);
      setHires(hiresResult.data || []);
      setCommissions(commissionsResult.data || []);

    } catch (error) {
      setMessage(error.message || "Unable to load account data.");
    } finally {
      setLoading(false);
    }
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

  async function sendAssignment(body) {
    const token = await getToken();

    if (!token) {
      throw new Error("Please login again.");
    }

    const response = await fetch("/api/admin/assign-team", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(body),
    });

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.error || "Assignment failed.");
    }

    return result;
  }

  async function moveRecruiter() {
    if (!selectedUser) {
      setMessage("Select a Recruiter first.");
      return;
    }

    setSaving(true);
    setMessage("");

    try {
      await sendAssignment({
        action: "assign_recruiter",
        recruiter_id: selectedUser,
        team_leader_id: selectedLeader || null,
      });

      setMessage("Recruiter team updated successfully!");

      setSelectedUser("");
      setSelectedLeader("");

      await loadData();

    } catch (error) {
      setMessage(error.message);
    } finally {
      setSaving(false);
    }
  }

  async function moveTeamLeader() {
    if (!selectedTeamLeader) {
      setMessage("Select a Team Leader first.");
      return;
    }

    setSaving(true);
    setMessage("");

    try {
      await sendAssignment({
        action: "assign_team_leader",
        team_leader_id: selectedTeamLeader,
        unit_manager_id: selectedUnitManager || null,
      });

      setMessage(
        "Team Leader and team assignment updated successfully!"
      );

      setSelectedTeamLeader("");
      setSelectedUnitManager("");

      await loadData();

    } catch (error) {
      setMessage(error.message);
    } finally {
      setSaving(false);
    }
  }

  async function deleteUser() {
    if (!selectedUser) {
      setMessage("Select a Recruiter first.");
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

      setMessage(
        "Account deleted. Candidate records were preserved."
      );

      setSelectedUser("");
      setSelectedLeader("");

      await loadData();

    } catch (error) {
      setMessage(error.message);
    } finally {
      setSaving(false);
    }
  }

  const recruiters = users.filter(
    (u) => u.member_role === "Recruiter"
  );

  const leaders = users.filter(
    (u) => u.member_role === "Team Leader"
  );

  const managers = users.filter(
    (u) => u.member_role === UNIT_ROLE
  );

  const selectedRecruiter = recruiters.find(
    (u) => u.member_id === selectedUser
  );

  const selectedLeaderData = leaders.find(
    (u) => u.member_id === selectedTeamLeader
  );

  function getPerformance(userId) {
    const userHires = hires.filter(
      (h) =>
        h.recruiter_id === userId ||
        h.team_leader_id === userId
    );

    const userCommissions = commissions.filter(
      (c) => c.user_id === userId
    );

    const paid = userCommissions
      .filter((c) => String(c.status).toLowerCase() === "paid")
      .reduce((sum, c) => sum + Number(c.amount || 0), 0);

    const pending = userCommissions
      .filter((c) => String(c.status).toLowerCase() === "pending")
      .reduce((sum, c) => sum + Number(c.amount || 0), 0);

    const totalCommission = userCommissions.reduce(
      (sum, c) => sum + Number(c.amount || 0),
      0
    );

    return {
      hires: userHires.length,
      totalCommission,
      paid,
      pending,
    };
  }

  function getTeamRecruiters(leaderId) {
    return recruiters.filter(
      (r) => r.team_leader_id === leaderId
    );
  }

  function getManagerLeaders(managerId) {
    return leaders.filter(
      (l) => l.unit_manager_id === managerId
    );
  }

  function getManagerPerformance(managerId) {
    const managerLeaders = getManagerLeaders(managerId);

    const memberIds = [
      ...managerLeaders.map((l) => l.member_id),
      ...recruiters
        .filter((r) =>
          managerLeaders.some(
            (l) => l.member_id === r.team_leader_id
          )
        )
        .map((r) => r.member_id),
    ];

    const teamHires = hires.filter(
      (h) =>
        managerLeaders.some(
          (l) => l.member_id === h.team_leader_id
        )
    );

    const teamCommissions = commissions.filter(
      (c) => memberIds.includes(c.user_id)
    );

    return {
      leaders: managerLeaders.length,

      recruiters: recruiters.filter((r) =>
        managerLeaders.some(
          (l) => l.member_id === r.team_leader_id
        )
      ).length,

      hires: teamHires.length,

      commissions: teamCommissions.reduce(
        (sum, c) => sum + Number(c.amount || 0),
        0
      ),
    };
  }

  const totalCandidates = users.reduce(
    (sum, u) => sum + Number(u.candidate_count || 0),
    0
  );

  const unassignedLeaders = leaders.filter(
    (l) => !l.unit_manager_id
  );

  const unassignedRecruiters = recruiters.filter(
    (r) => !r.team_leader_id
  );

  return (
    <main style={s.page}>
      <div style={s.glow} />

      <div style={s.container}>
        <button
          style={s.back}
          onClick={() => router.push("/")}
        >
          ← DASHBOARD
        </button>

        <header style={s.header}>
          <div style={s.logo}>♏</div>
          <p style={s.eyebrow}>
            BLACK SCORPIONS • CEO CONTROL CENTER
          </p>

          <h1 style={s.title}>
            ACCOUNT <span>MANAGEMENT</span>
          </h1>

          <p style={s.subtitle}>
            Manage your organization, teams and performance.
          </p>

          <div style={s.line} />
        </header>

        {loading ? (
          <div style={s.loading}>LOADING ORGANIZATION...</div>
        ) : (
          <>
            <div style={s.stats}>
              {[
                ["TOTAL MEMBERS", users.length],
                ["UNIT MANAGERS", managers.length],
                ["TEAM LEADERS", leaders.length],
                ["RECRUITERS", recruiters.length],
                ["SUCCESSFUL HIRES", hires.length],
                ["TOTAL CANDIDATES", totalCandidates],
              ].map(([label, value]) => (
                <div style={s.stat} key={label}>
                  <small>{label}</small>
                  <strong>{value}</strong>
                </div>
              ))}
            </div>

            {/* RECRUITER MANAGEMENT */}

            <section style={s.section}>
              <SectionTitle
                eyebrow="CEO OPERATIONS"
                title="RECRUITER MANAGEMENT"
              />

              <label style={s.label}>
                SELECT RECRUITER
              </label>

              <select
                style={s.select}
                value={selectedUser}
                onChange={(e) => {
                  setSelectedUser(e.target.value);
                  setSelectedLeader("");
                }}
              >
                <option value="">Choose Recruiter...</option>
                {recruiters.map((r) => (
                  <option key={r.member_id} value={r.member_id}>
                    {r.member_name}
                  </option>
                ))}
              </select>

              {selectedRecruiter && (
                <div style={s.info}>
                  Current Team:{" "}
                  <strong>
                    {selectedRecruiter.team_leader_name}
                  </strong>
                </div>
              )}

              <label style={s.label}>
                ASSIGN TO TEAM LEADER
              </label>

              <select
                style={s.select}
                value={selectedLeader}
                onChange={(e) => setSelectedLeader(e.target.value)}
              >
                <option value="">Direct under CEO</option>
                {leaders.map((l) => (
                  <option key={l.member_id} value={l.member_id}>
                    {l.member_name}
                  </option>
                ))}
              </select>

              <button
                style={s.goldButton}
                disabled={saving || !selectedUser}
                onClick={moveRecruiter}
              >
                {saving ? "PLEASE WAIT..." : "UPDATE RECRUITER TEAM"}
              </button>

              <button
                style={s.deleteButton}
                disabled={saving || !selectedUser}
                onClick={deleteUser}
              >
                DELETE RECRUITER ACCOUNT
              </button>

              {unassignedRecruiters.length > 0 && (
                <p style={s.note}>
                  Unassigned Recruiters:{" "}
                  {unassignedRecruiters
                    .map((r) => r.member_name)
                    .join(", ")}
                </p>
              )}
            </section>

            {/* UNIT MANAGER MANAGEMENT */}

            <section style={s.section}>
              <SectionTitle
                eyebrow="ORGANIZATION STRUCTURE"
                title="UNIT MANAGER MANAGEMENT"
              />

              <label style={s.label}>
                SELECT TEAM LEADER
              </label>

              <select
                style={s.select}
                value={selectedTeamLeader}
                onChange={(e) => {
                  setSelectedTeamLeader(e.target.value);
                  setSelectedUnitManager("");
                }}
              >
                <option value="">Choose Team Leader...</option>
                {leaders.map((l) => (
                  <option key={l.member_id} value={l.member_id}>
                    {l.member_name}
                  </option>
                ))}
              </select>

              {selectedLeaderData && (
                <div style={s.info}>
                  Current Unit Manager:{" "}
                  <strong>
                    {selectedLeaderData.unit_manager_name || "Unassigned"}
                  </strong>
                  <br />
                  Team Recruiters:{" "}
                  <strong>
                    {getTeamRecruiters(selectedLeaderData.member_id).length}
                  </strong>
                </div>
              )}

              <label style={s.label}>
                ASSIGN TO UNIT MANAGER
              </label>

              <select
                style={s.select}
                value={selectedUnitManager}
                onChange={(e) =>
                  setSelectedUnitManager(e.target.value)
                }
              >
                <option value="">Unassigned</option>
                {managers.map((m) => (
                  <option key={m.member_id} value={m.member_id}>
                    {m.member_name}
                  </option>
                ))}
              </select>

              <button
                style={s.goldButton}
                disabled={saving || !selectedTeamLeader}
                onClick={moveTeamLeader}
              >
                {saving ? "PLEASE WAIT..." : "UPDATE UNIT ASSIGNMENT"}
              </button>

              {unassignedLeaders.length > 0 && (
                <p style={s.note}>
                  Unassigned Team Leaders:{" "}
                  {unassignedLeaders
                    .map((l) => l.member_name)
                    .join(", ")}
                </p>
              )}
            </section>

            {/* ORGANIZATION PERFORMANCE */}

            <section style={s.section}>
              <SectionTitle
                eyebrow="PERFORMANCE OVERVIEW"
                title="ORGANIZATION TEAMS"
              />

              {managers.length === 0 && (
                <p style={s.empty}>
                  No Unit Managers found.
                </p>
              )}

              {managers.map((manager) => {
                const managerLeaders = getManagerLeaders(
                  manager.member_id
                );

                const performance = getManagerPerformance(
                  manager.member_id
                );

                return (
                  <div style={s.managerCard} key={manager.member_id}>
                    <div style={s.managerHeader}>
                      <div>
                        <small>UNIT MANAGER</small>
                        <h3>{manager.member_name}</h3>
                      </div>

                      <span style={s.badge}>
                        {managerLeaders.length} TEAMS
                      </span>
                    </div>

                    <div style={s.performanceGrid}>
                      <Metric label="TEAM LEADERS" value={performance.leaders} />
                      <Metric label="RECRUITERS" value={performance.recruiters} />
                      <Metric label="HIRES" value={performance.hires} />
                      <Metric
                        label="COMMISSIONS"
                        value={`${performance.commissions.toLocaleString()} EGP`}
                      />
                    </div>

                    {managerLeaders.length === 0 ? (
                      <p style={s.empty}>
                        No Team Leaders assigned to this Unit Manager yet.
                      </p>
                    ) : (
                      managerLeaders
                        .sort(
                          (a, b) =>
                            getPerformance(b.member_id).hires -
                            getPerformance(a.member_id).hires
                        )
                        .map((leader) => {
                          const team = getTeamRecruiters(
                            leader.member_id
                          );

                          const leaderPerformance = getPerformance(
                            leader.member_id
                          );

                          return (
                            <div
                              style={s.teamCard}
                              key={leader.member_id}
                            >
                              <div style={s.teamHeader}>
                                <div>
                                  <small>TEAM LEADER</small>
                                  <h4>{leader.member_name}</h4>
                                </div>

                                <span style={s.badge}>
                                  {team.length} RECRUITERS
                                </span>
                              </div>

                              <div style={s.performanceGrid}>
                                <Metric
                                  label="HIRES"
                                  value={leaderPerformance.hires}
                                />
                                <Metric
                                  label="TOTAL COMMISSION"
                                  value={`${leaderPerformance.totalCommission.toLocaleString()} EGP`}
                                />
                                <Metric
                                  label="PAID"
                                  value={`${leaderPerformance.paid.toLocaleString()} EGP`}
                                />
                                <Metric
                                  label="PENDING"
                                  value={`${leaderPerformance.pending.toLocaleString()} EGP`}
                                />
                              </div>

                              <div style={s.tableWrap}>
                                <table style={s.table}>
                                  <thead>
                                    <tr>
                                      <th>RECRUITER</th>
                                      <th>HIRES</th>
                                      <th>COMMISSION</th>
                                      <th>PAID</th>
                                      <th>PENDING</th>
                                    </tr>
                                  </thead>

                                  <tbody>
                                    {team
                                      .sort(
                                        (a, b) =>
                                          getPerformance(b.member_id).hires -
                                          getPerformance(a.member_id).hires
                                      )
                                      .map((recruiter) => {
                                        const p = getPerformance(
                                          recruiter.member_id
                                        );

                                        return (
                                          <tr key={recruiter.member_id}>
                                            <td>{recruiter.member_name}</td>
                                            <td>{p.hires}</td>
                                            <td>
                                              {p.totalCommission.toLocaleString()} EGP
                                            </td>
                                            <td>
                                              {p.paid.toLocaleString()} EGP
                                            </td>
                                            <td>
                                              {p.pending.toLocaleString()} EGP
                                            </td>
                                          </tr>
                                        );
                                      })}

                                    {team.length === 0 && (
                                      <tr>
                                        <td colSpan="5">
                                          No Recruiters assigned.
                                        </td>
                                      </tr>
                                    )}
                                  </tbody>
                                </table>
                              </div>
                            </div>
                          );
                        })
                    )}
                  </div>
                );
              })}

              {unassignedLeaders.length > 0 && (
                <div style={s.managerCard}>
                  <div style={s.managerHeader}>
                    <div>
                      <small>UNASSIGNED</small>
                      <h3>TEAM LEADERS</h3>
                    </div>
                  </div>

                  {unassignedLeaders.map((leader) => (
                    <div style={s.teamCard} key={leader.member_id}>
                      <strong>{leader.member_name}</strong>
                      <p style={s.note}>
                        {getTeamRecruiters(leader.member_id).length} Recruiters
                        • {getPerformance(leader.member_id).hires} Hires
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </section>

            {/* ALL MEMBERS */}

            <section style={s.section}>
              <SectionTitle
                eyebrow="ORGANIZATION DIRECTORY"
                title="ALL TEAM MEMBERS"
              />

              <div style={s.tableWrap}>
                <table style={s.table}>
                  <thead>
                    <tr>
                      <th>NAME</th>
                      <th>ROLE</th>
                      <th>TEAM LEADER</th>
                      <th>UNIT MANAGER</th>
                      <th>CANDIDATES</th>
                    </tr>
                  </thead>

                  <tbody>
                    {users.map((u) => (
                      <tr key={u.member_id}>
                        <td>{u.member_name}</td>
                        <td>{u.member_role}</td>
                        <td>{u.team_leader_name || "—"}</td>
                        <td>{u.unit_manager_name || "—"}</td>
                        <td>{u.candidate_count || 0}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          </>
        )}

        {message && (
          <div style={s.message}>{message}</div>
        )}

        <footer style={s.footer}>
          BLACK SCORPIONS RECRUITMENT AGENCY • CONTROLLED BY CEO
        </footer>
      </div>
    </main>
  );
}

function SectionTitle({ eyebrow, title }) {
  return (
    <div style={s.sectionTitle}>
      <small>{eyebrow}</small>
      <h2>{title}</h2>
    </div>
  );
}

function Metric({ label, value }) {
  return (
    <div style={s.metric}>
      <small>{label}</small>
      <strong>{value}</strong>
    </div>
  );
}

const s = {
  page: {
    minHeight: "100vh",
    background: "radial-gradient(ellipse at top, #30230b, #111 40%, #050505 85%)",
    color: "#fff",
    padding: "25px 14px 45px",
    fontFamily: "Arial, sans-serif",
    position: "relative",
  },
  glow: {
    position: "absolute",
    top: 250,
    left: "-150px",
    width: 300,
    height: 300,
    borderRadius: "50%",
    background: "rgba(212,175,55,0.07)",
    filter: "blur(100px)",
    pointerEvents: "none",
  },
  container: {
    maxWidth: 1150,
    margin: "auto",
    position: "relative",
    zIndex: 1,
  },
  back: {
    background: "rgba(212,175,55,0.06)",
    color: "#d4af37",
    border: "1px solid #8e722b",
    padding: "11px 17px",
    borderRadius: 8,
    cursor: "pointer",
    fontWeight: "bold",
    marginBottom: 25,
  },
  header: {
    textAlign: "center",
    marginBottom: 35,
  },
  logo: {
    fontSize: 40,
    color: "#d4af37",
    marginBottom: 10,
  },
  eyebrow: {
    color: "#a98b3b",
    fontSize: 11,
    letterSpacing: 3,
  },
  title: {
    fontSize: "clamp(26px, 5vw, 42px)",
    fontWeight: 900,
    letterSpacing: 2,
  },
  subtitle: {
    color: "#999",
    fontSize: 13,
  },
  line: {
    width: 100,
    height: 2,
    background: "#d4af37",
    margin: "22px auto",
  },
  stats: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit,minmax(145px,1fr))",
    gap: 12,
    marginBottom: 22,
  },
  stat: {
    background: "#17150f",
    border: "1px solid rgba(212,175,55,.25)",
    borderRadius: 12,
    padding: 17,
  },
  section: {
    background: "linear-gradient(145deg,#191919,#101010)",
    border: "1px solid rgba(212,175,55,.23)",
    borderRadius: 15,
    padding: "22px 17px",
    marginBottom: 22,
    overflow: "hidden",
  },
  sectionTitle: {
    marginBottom: 22,
  },
  label: {
    display: "block",
    color: "#c6a747",
    fontSize: 11,
    fontWeight: "bold",
    letterSpacing: 1,
    margin: "17px 0 9px",
  },
  select: {
    width: "100%",
    padding: 14,
    borderRadius: 8,
    background: "#090909",
    color: "#fff",
    border: "1px solid #514321",
    marginBottom: 10,
    fontSize: 13,
  },
  info: {
    padding: 13,
    background: "rgba(212,175,55,.07)",
    color: "#d4af37",
    borderRadius: 8,
    fontSize: 12,
    lineHeight: 2,
  },
  goldButton: {
    width: "100%",
    padding: 15,
    marginTop: 17,
    border: "none",
    borderRadius: 8,
    background: "linear-gradient(110deg,#a98524,#f0d36a,#b28b2d)",
    color: "#090909",
    fontWeight: 900,
    cursor: "pointer",
  },
  deleteButton: {
    width: "100%",
    padding: 14,
    marginTop: 10,
    border: "1px solid #813737",
    borderRadius: 8,
    background: "#260d0d",
    color: "#ff8585",
    fontWeight: "bold",
    cursor: "pointer",
  },
  managerCard: {
    border: "1px solid rgba(212,175,55,.35)",
    borderRadius: 12,
    padding: 15,
    marginBottom: 20,
    background: "#111",
  },
  managerHeader: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    flexWrap: "wrap",
    gap: 12,
    borderBottom: "1px solid #514321",
    paddingBottom: 14,
    marginBottom: 14,
  },
  teamCard: {
    background: "#191919",
    border: "1px solid #3d3420",
    borderRadius: 10,
    padding: 14,
    marginTop: 13,
  },
  teamHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 10,
  },
  badge: {
    color: "#d4af37",
    border: "1px solid #80672b",
    padding: "6px 10px",
    borderRadius: 20,
    fontSize: 10,
    fontWeight: "bold",
  },
  performanceGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit,minmax(110px,1fr))",
    gap: 9,
    margin: "14px 0",
  },
  metric: {
    background: "#0b0b0b",
    border: "1px solid #302817",
    borderRadius: 8,
    padding: 11,
    minWidth: 0,
  },
  tableWrap: {
    overflowX: "auto",
    width: "100%",
    marginTop: 13,
  },
  table: {
    width: "100%",
    minWidth: 570,
    borderCollapse: "collapse",
    textAlign: "left",
    fontSize: 12,
  },
  empty: {
    color: "#888",
    textAlign: "center",
    padding: 20,
  },
  note: {
    color: "#888",
    fontSize: 11,
    lineHeight: 1.7,
    marginTop: 13,
  },
  message: {
    marginTop: 18,
    padding: 14,
    border: "1px solid #d4af37",
    borderRadius: 8,
    background: "#171717",
    color: "#e8c75a",
    fontSize: 13,
  },
  loading: {
    textAlign: "center",
    padding: 60,
    color: "#d4af37",
  },
  footer: {
    textAlign: "center",
    color: "#68604c",
    fontSize: 9,
    letterSpacing: 1.3,
    marginTop: 40,
  },
};

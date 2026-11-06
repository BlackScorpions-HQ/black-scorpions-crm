
"use client";

import { useEffect, useState } from "react";
import { createClient } from "../utils/supabase/client";

function ScorpionMark({ size = 34 }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      style={{
        verticalAlign: "middle",
        filter: "drop-shadow(0 0 6px rgba(212,175,55,.6))"
      }}
    >
      <defs>
        <linearGradient id="scorpionGold" x1="20" y1="15" x2="80" y2="95">
          <stop stopColor="#fff0a6" />
          <stop offset=".45" stopColor="#d4af37" />
          <stop offset="1" stopColor="#8d6418" />
        </linearGradient>
      </defs>

      <g
        stroke="url(#scorpionGold)"
        strokeWidth="4"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M48 48 C35 35 38 22 49 17 C61 12 72 22 65 31 C59 39 49 34 53 27" />
        <path d="M46 48 C36 42 28 47 25 56 L18 64" />
        <path d="M54 48 C65 42 74 47 77 56 L84 64" />
        <path d="M43 51 L31 44 L23 48" />
        <path d="M57 51 L69 44 L77 48" />
        <path d="M43 57 L28 69 L19 68" />
        <path d="M57 57 L72 69 L81 68" />
        <path d="M45 63 L36 78 L28 81" />
        <path d="M55 63 L64 78 L72 81" />
        <path d="M50 38 L50 70" />
        <path d="M50 70 C47 80 52 87 62 88" />
        <path d="M62 88 L69 81" />
        <path d="M62 88 L69 94" />
        <path d="M40 48 L50 43 L60 48 L63 59 L55 68 L45 68 L37 59 Z" />
      </g>
    </svg>
  );
}

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

  const [changeRequests, setChangeRequests] = useState([]);
  const [requestsLoading, setRequestsLoading] = useState(false);
  const [processingRequest, setProcessingRequest] = useState("");
  const [requestMessage, setRequestMessage] = useState("");
  const [requestError, setRequestError] = useState("");

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

        if (profile.role === "CEO") {
          await loadChangeRequests();
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
            "id, company_name, offer_name, recruiter_id, recruiter_name, team_leader_id, team_leader_name, recruiter_commission, team_leader_commission, founder_commission, hiring_date"
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

  // Load pending account change requests for CEO
  async function loadChangeRequests() {
    setRequestsLoading(true);
    setRequestError("");

    const { data, error } = await supabase
      .from("account_change_requests")
      .select(
        "id, user_id, user_name, user_email, request_type, old_value, requested_value, status, created_at"
      )
      .eq("status", "Pending")
      .in("request_type", ["full_name", "phone"])
      .order("created_at", { ascending: false });

    if (error) {
      setRequestError(error.message);
    } else {
      setChangeRequests(data || []);
    }

    setRequestsLoading(false);
  }

  // CEO approves or denies a request through the secure API
  async function handleRequestDecision(requestId, action) {
    setProcessingRequest(requestId);
    setRequestMessage("");
    setRequestError("");

    try {
      const {
        data: { session },
        error: sessionError
      } = await supabase.auth.getSession();

      if (sessionError || !session?.access_token) {
        throw new Error("Your session has expired. Please log in again.");
      }

      const response = await fetch(
        "/api/admin/account-change-request",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.access_token}`
          },
          body: JSON.stringify({
            request_id: requestId,
            action
          })
        }
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(
          result.error || result.message || "Request failed."
        );
      }

      setRequestMessage(
        action === "approve"
          ? "Request approved successfully."
          : "Request denied successfully."
      );

      await loadChangeRequests();
    } catch (err) {
      setRequestError(err.message || "Something went wrong.");
    }

    setProcessingRequest("");
  }

  function requestTypeLabel(type) {
    if (type === "full_name") return "NAME CHANGE";
    if (type === "phone") return "PHONE NUMBER CHANGE";
    return type;
  }

  async function logout() {
    await supabase.auth.signOut();
    window.location.href = "/login";
  }

  if (loading) {
    return (
      <main style={styles.page}>
        <div style={styles.loading}>
          <ScorpionMark size={48} />
          <h2 style={styles.gold}>BLACK SCORPIONS</h2>
          <p style={styles.muted}>Loading dashboard...</p>
        </div>
      </main>
    );
  }

  if (error) {
    return (
      <main style={styles.page}>
        <h2 style={styles.gold}>
          <ScorpionMark /> BLACK SCORPIONS
        </h2>
        <p style={styles.error}>{error}</p>
        <button onClick={logout} style={styles.logout}>
          LOG OUT
        </button>
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
        ["Commission Structure", "/commission-structures", "View offer commission rates"],
        ["Settings", "/settings", "Manage your account settings"]
      ];

  const recruiters = team.filter(
    (member) => member.member_role === "Recruiter"
  );

  const teamLeaders = team.filter(
    (member) => member.member_role === "Team Leader"
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

  // Recruiter Performance & Ranking
  const recruiterPerformance = recruiters
    .map((recruiter) => {
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
    })
    .sort(
      (a, b) =>
        b.hire_count - a.hire_count ||
        b.commission_total - a.commission_total
    );

  // Team Leader Performance & Ranking
  const teamLeaderPerformance = teamLeaders
    .map((leader) => {
      const leaderHires = hires.filter(
        (hire) => hire.team_leader_id === leader.member_id
      );

      const leaderCommission = commissions
        .filter(
          (item) =>
            item.user_id === leader.member_id &&
            item.user_role === "Team Leader"
        )
        .reduce(
          (total, item) => total + Number(item.amount || 0),
          0
        );

      const leaderRecruiters = recruiters.filter(
        (recruiter) =>
          recruiter.team_leader_name === leader.member_name
      );

      const leaderCandidates = leaderRecruiters.reduce(
        (total, recruiter) =>
          total + Number(recruiter.candidate_count || 0),
        0
      );

      return {
        ...leader,
        team_size: leaderRecruiters.length,
        candidate_total: leaderCandidates,
        hire_count: leaderHires.length,
        commission_total: leaderCommission,
      };
    })
    .sort(
      (a, b) =>
        b.hire_count - a.hire_count ||
        b.commission_total - a.commission_total
    );

  // Company Performance Analytics - CEO
  const companyPerformance = Object.values(
    hires.reduce((groups, hire) => {
      const companyName = (
        hire.company_name ||
        hire.offer_name ||
        "Unknown Company"
      ).trim();

      if (!groups[companyName]) {
        groups[companyName] = {
          company_name: companyName,
          hire_count: 0,
          recruiter_commissions: 0,
          team_leader_commissions: 0,
          founder_commissions: 0,
          total_commissions: 0,
        };
      }

      const recruiterCommission = Number(
        hire.recruiter_commission || 0
      );

      const teamLeaderCommission = Number(
        hire.team_leader_commission || 0
      );

      const founderCommission = Number(
        hire.founder_commission || 0
      );

      groups[companyName].hire_count += 1;
      groups[companyName].recruiter_commissions += recruiterCommission;
      groups[companyName].team_leader_commissions += teamLeaderCommission;
      groups[companyName].founder_commissions += founderCommission;

      groups[companyName].total_commissions +=
        recruiterCommission +
        teamLeaderCommission +
        founderCommission;

      return groups;
    }, {})
  ).sort(
    (a, b) =>
      b.hire_count - a.hire_count ||
      b.total_commissions - a.total_commissions
  );

  const totalCompanies = companyPerformance.length;

  const totalCompanyCommissions = companyPerformance.reduce(
    (total, company) => total + company.total_commissions,
    0
  );

  const topCompany = companyPerformance[0] || null;

  return (
    <main style={styles.page}>
      <header style={styles.header}>
        <div style={styles.logo}>
          <ScorpionMark size={55} />
          <h1 style={styles.logoTitle}>BLACK SCORPIONS</h1>
        </div>

        <p style={styles.muted}>
          RECRUITMENT MANAGEMENT SYSTEM
        </p>

        <div style={styles.goldLine} />
      </header>

      <section style={styles.card}>
        <p style={styles.muted}>WELCOME BACK</p>

        <h2 style={styles.welcomeName}>
          {user?.user_metadata?.full_name || user?.email}
        </h2>

        <div style={styles.role}>
          {isCEO ? "CEO / FOUNDER" : role.toUpperCase()}
        </div>
      </section>

      {/* CEO ACCOUNT CHANGE NOTIFICATIONS */}
      {isCEO && (
        <section style={styles.notificationSection}>
          <div style={styles.notificationHeader}>
            <div>
              <h2 style={styles.notificationTitle}>
                <ScorpionMark size={27} />
                ACCOUNT CHANGE REQUESTS
              </h2>

              <p style={styles.notificationSubtitle}>
                Review and manage employee account change requests.
              </p>
            </div>

            <div style={styles.requestCount}>
              {changeRequests.length}
              <span>PENDING</span>
            </div>
          </div>

          {requestMessage && (
            <div style={styles.requestSuccess}>
              {requestMessage}
            </div>
          )}

          {requestError && (
            <div style={styles.requestError}>
              {requestError}
            </div>
          )}

          {requestsLoading ? (
            <p style={styles.muted}>Loading requests...</p>
          ) : changeRequests.length === 0 ? (
            <div style={styles.noRequests}>
              <ScorpionMark size={30} />
              <p>No pending account change requests.</p>
            </div>
          ) : (
            <div style={styles.requestGrid}>
              {changeRequests.map((request) => (
                <div key={request.id} style={styles.requestCard}>
                  <div style={styles.requestCardTop}>
                    <span style={styles.requestType}>
                      {requestTypeLabel(request.request_type)}
                    </span>

                    <span style={styles.pendingBadge}>
                      PENDING
                    </span>
                  </div>

                  <h3 style={styles.requestUser}>
                    {request.user_name || "Unknown User"}
                  </h3>

                  <p style={styles.requestEmail}>
                    {request.user_email}
                  </p>

                  <div style={styles.requestValues}>
                    <div>
                      <span>PREVIOUS VALUE</span>
                      <p>{request.old_value || "Not provided"}</p>
                    </div>

                    <div>
                      <span>REQUESTED VALUE</span>
                      <p style={{ color: "#f2d477" }}>
                        {request.requested_value || "Not provided"}
                      </p>
                    </div>
                  </div>

                  <p style={styles.requestDate}>
                    Submitted:{" "}
                    {new Date(request.created_at).toLocaleString()}
                  </p>

                  <div style={styles.decisionButtons}>
                    <button
                      style={styles.approveButton}
                      disabled={!!processingRequest}
                      onClick={() =>
                        handleRequestDecision(request.id, "approve")
                      }
                    >
                      {processingRequest === request.id
                        ? "PROCESSING..."
                        : "✓ APPROVE"}
                    </button>

                    <button
                      style={styles.denyButton}
                      disabled={!!processingRequest}
                      onClick={() =>
                        handleRequestDecision(request.id, "deny")
                      }
                    >
                      {processingRequest === request.id
                        ? "PROCESSING..."
                        : "✕ DENY"}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          <button
            style={styles.refreshRequests}
            onClick={loadChangeRequests}
            disabled={requestsLoading || !!processingRequest}
          >
            ↻ REFRESH REQUESTS
          </button>
        </section>
      )}

      <h2 style={styles.sectionTitle}>
        <ScorpionMark size={28} />
        {isCEO
          ? " CEO Dashboard"
          : isTeamLeader
          ? " Team Leader Dashboard"
          : " Recruiter Dashboard"}
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
            <div style={styles.itemHeading}>
              <ScorpionMark size={25} />
              <h3 style={styles.itemTitle}>{title}</h3>
              <span style={styles.arrow}>↗</span>
            </div>

            <p style={styles.muted}>{description}</p>

            <div style={styles.itemLine} />
          </a>
        ))}
      </section>

      {(isCEO || isTeamLeader) && (
        <>
          <section style={styles.teamSection}>
            <h2 style={styles.sectionTitle}>
              <ScorpionMark size={29} />
              {isCEO ? " Company Overview" : " My Team Overview"}
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
                    <h2 style={styles.statNumber}>
                      {recruiters.length}
                    </h2>
                    <p style={styles.muted}>Total Recruiters</p>
                  </div>

                  <div style={styles.statCard}>
                    <h2 style={styles.statNumber}>
                      {totalCandidates}
                    </h2>
                    <p style={styles.muted}>Total Candidates</p>
                  </div>

                  <div style={styles.statCard}>
                    <h2 style={styles.statNumber}>
                      {hires.length}
                    </h2>
                    <p style={styles.muted}>Successful Hires</p>
                  </div>

                  <div style={styles.statCard}>
                    <h2 style={styles.statNumber}>
                      {totalTeamCommissions.toLocaleString()} EGP
                    </h2>
                    <p style={styles.muted}>Team Commissions</p>
                  </div>
                </div>

                <div style={styles.stats}>
                  <div style={styles.statCard}>
                    <h3 style={{ color: "#f2d477" }}>
                      {totalPendingCommissions.toLocaleString()} EGP
                    </h3>
                    <p style={styles.muted}>Pending Commissions</p>
                  </div>

                  <div style={styles.statCard}>
                    <h3 style={{ color: "#65d69a" }}>
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
            <>
              {/* RECRUITER PERFORMANCE */}
              <section style={styles.teamSection}>
                <h2 style={styles.sectionTitle}>
                  <ScorpionMark size={29} />
                  Recruiter Performance & Ranking
                </h2>

                <p style={styles.muted}>
                  Recruiters are ranked by successful hires.
                  Commission total breaks ties.
                </p>

                {recruiterPerformance.length === 0 ? (
                  <p style={styles.muted}>
                    No Recruiters found in this team yet.
                  </p>
                ) : (
                  <div style={{ overflowX: "auto" }}>
                    <table style={styles.table}>
                      <thead>
                        <tr>
                          <th style={styles.cell}>Rank</th>
                          <th style={styles.cell}>Recruiter</th>
                          <th style={styles.cell}>Candidates</th>
                          <th style={styles.cell}>Successful Hires</th>
                          <th style={styles.cell}>Commissions</th>
                        </tr>
                      </thead>

                      <tbody>
                        {recruiterPerformance.map((recruiter, index) => (
                          <tr key={recruiter.member_id}>
                            <td style={styles.cell}>
                              <span style={styles.rankBadge}>
                                #{index + 1}
                              </span>
                            </td>

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
                              <strong style={{ color: "#f2d477" }}>
                                {recruiter.hire_count}
                              </strong>
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

              {/* TEAM LEADER PERFORMANCE - CEO ONLY */}
              {isCEO && (
                <section style={styles.teamSection}>
                  <h2 style={styles.sectionTitle}>
                    <ScorpionMark size={29} />
                    Team Leader Performance & Ranking
                  </h2>

                  <p style={styles.muted}>
                    Team Leaders ranked by successful team placements.
                    Commission total breaks ties.
                  </p>

                  {teamLeaderPerformance.length === 0 ? (
                    <p style={styles.muted}>
                      No Team Leaders found yet.
                    </p>
                  ) : (
                    <div style={{ overflowX: "auto" }}>
                      <table style={styles.table}>
                        <thead>
                          <tr>
                            <th style={styles.cell}>Rank</th>
                            <th style={styles.cell}>Team Leader</th>
                            <th style={styles.cell}>Recruiters</th>
                            <th style={styles.cell}>Candidates</th>
                            <th style={styles.cell}>Successful Hires</th>
                            <th style={styles.cell}>TL Commissions</th>
                          </tr>
                        </thead>

                        <tbody>
                          {teamLeaderPerformance.map((leader, index) => (
                            <tr key={leader.member_id}>
                              <td style={styles.cell}>
                                <span style={styles.rankBadge}>
                                  #{index + 1}
                                </span>
                              </td>

                              <td style={styles.cell}>
                                <strong>{leader.member_name}</strong>
                                <br />
                                <span style={styles.muted}>
                                  {leader.member_email}
                                </span>
                              </td>

                              <td style={styles.cell}>
                                {leader.team_size}
                              </td>

                              <td style={styles.cell}>
                                {leader.candidate_total}
                              </td>

                              <td style={styles.cell}>
                                <strong style={{ color: "#f2d477" }}>
                                  {leader.hire_count}
                                </strong>
                              </td>

                              <td style={styles.cell}>
                                {leader.commission_total.toLocaleString()} EGP
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </section>
              )}

              {/* COMPANY PERFORMANCE ANALYTICS - CEO ONLY */}
              {isCEO && (
                <section style={styles.teamSection}>
                  <h2 style={styles.sectionTitle}>
                    <ScorpionMark size={29} />
                    Company Performance Analytics
                  </h2>

                  <p style={styles.muted}>
                    Company rankings based on successful placements
                    and total commission distribution.
                  </p>

                  <div style={styles.stats}>
                    <div style={styles.statCard}>
                      <h2 style={styles.statNumber}>
                        {totalCompanies}
                      </h2>
                      <p style={styles.muted}>Total Companies</p>
                    </div>

                    <div style={styles.statCard}>
                      <h2 style={styles.statNumber}>
                        {hires.length}
                      </h2>
                      <p style={styles.muted}>Total Placements</p>
                    </div>

                    <div style={styles.statCard}>
                      <h2 style={styles.statNumber}>
                        {totalCompanyCommissions.toLocaleString()} EGP
                      </h2>
                      <p style={styles.muted}>Total Commissions</p>
                    </div>
                  </div>

                  {topCompany && (
                    <div style={{
                      ...styles.statCard,
                      marginBottom: 20,
                      border: "1px solid #d4af37",
                      background: "linear-gradient(135deg,#30250d,#111)"
                    }}>
                      <p style={{
                        color: "#aaa",
                        fontSize: 12,
                        letterSpacing: 2
                      }}>
                        🏆 TOP PERFORMING COMPANY
                      </p>

                      <h2 style={{
                        color: "#f2d477",
                        margin: "10px 0",
                        fontSize: 24
                      }}>
                        {topCompany.company_name}
                      </h2>

                      <p style={styles.muted}>
                        {topCompany.hire_count} Successful Hires
                      </p>
                    </div>
                  )}

                  {companyPerformance.length === 0 ? (
                    <p style={styles.muted}>
                      No company performance data available yet.
                    </p>
                  ) : (
                    <div style={{ overflowX: "auto" }}>
                      <table style={styles.table}>
                        <thead>
                          <tr>
                            <th style={styles.cell}>Rank</th>
                            <th style={styles.cell}>Company</th>
                            <th style={styles.cell}>Successful Hires</th>
                            <th style={styles.cell}>Recruiter Commissions</th>
                            <th style={styles.cell}>TL Commissions</th>
                            <th style={styles.cell}>Founder Commissions</th>
                            <th style={styles.cell}>Total Commissions</th>
                          </tr>
                        </thead>

                        <tbody>
                          {companyPerformance.map((company, index) => (
                            <tr key={company.company_name}>
                              <td style={styles.cell}>
                                <span style={styles.rankBadge}>
                                  #{index + 1}
                                </span>
                              </td>

                              <td style={styles.cell}>
                                <strong style={{ color: "#f2d477" }}>
                                  {company.company_name}
                                </strong>
                              </td>

                              <td style={styles.cell}>
                                <strong style={{ color: "#f2d477" }}>
                                  {company.hire_count}
                                </strong>
                              </td>

                              <td style={styles.cell}>
                                {company.recruiter_commissions.toLocaleString()} EGP
                              </td>

                              <td style={styles.cell}>
                                {company.team_leader_commissions.toLocaleString()} EGP
                              </td>

                              <td style={styles.cell}>
                                {company.founder_commissions.toLocaleString()} EGP
                              </td>

                              <td style={styles.cell}>
                                <strong style={{ color: "#65d69a" }}>
                                  {company.total_commissions.toLocaleString()} EGP
                                </strong>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </section>
              )}
            </>
          )}

          <section style={styles.teamSection}>
            <h2 style={styles.sectionTitle}>
              <ScorpionMark size={29} />
              {isCEO ? " Company Teams" : " My Team"}
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
        <ScorpionMark size={23} /> LOG OUT
      </button>

      <footer style={styles.footer}>
        <ScorpionMark size={22} />
        <p>BLACK SCORPIONS</p>
        <span>POWER • PRECISION • PERFORMANCE</span>
      </footer>
    </main>
  );
}

const styles = {
  page: {
    minHeight: "100vh",
    background: "transparent",
    color: "#fff",
    padding: 25,
    fontFamily: "Arial, sans-serif"
  },

  loading: {
    minHeight: "80vh",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    gap: 15
  },

  header: {
    textAlign: "center",
    marginBottom: 35,
    padding: "25px 10px"
  },

  logo: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    flexWrap: "wrap"
  },

  logoTitle: {
    color: "#f2d477",
    fontSize: "clamp(24px, 5vw, 38px)",
    letterSpacing: "2px",
    textShadow: "0 0 15px rgba(212,175,55,.4)"
  },

  gold: {
    color: "#f2d477",
    textShadow: "0 0 12px rgba(212,175,55,.35)",
    letterSpacing: "1px"
  },

  muted: {
    color: "#aaa",
    lineHeight: 1.6
  },

  goldLine: {
    width: 150,
    height: 2,
    margin: "18px auto 0",
    background: "linear-gradient(90deg,transparent,#d4af37,transparent)"
  },

  card: {
    background: "linear-gradient(145deg,rgba(20,20,20,.96),rgba(5,5,5,.96))",
    border: "1px solid #a9822b",
    borderRadius: 15,
    padding: 22,
    marginBottom: 30,
    boxShadow: "0 0 18px rgba(212,175,55,.12),inset 0 0 15px rgba(212,175,55,.04)"
  },

  welcomeName: {
    marginTop: 8,
    overflowWrap: "anywhere"
  },

  role: {
    display: "inline-block",
    background: "linear-gradient(135deg,#fff0a6,#d4af37,#98701e)",
    color: "#080808",
    padding: "9px 17px",
    borderRadius: 7,
    fontWeight: "900",
    marginTop: 12,
    boxShadow: "0 0 12px rgba(212,175,55,.3)"
  },

  sectionTitle: {
    color: "#f2d477",
    display: "flex",
    alignItems: "center",
    gap: 10,
    flexWrap: "wrap",
    marginBottom: 18,
    textShadow: "0 0 10px rgba(212,175,55,.25)"
  },

  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))",
    gap: 15
  },

  item: {
    display: "block",
    textDecoration: "none",
    background: "linear-gradient(145deg,rgba(25,25,25,.96),rgba(5,5,5,.96))",
    border: "1px solid #72571e",
    borderRadius: 13,
    padding: 20,
    color: "#fff",
    boxShadow: "inset 0 0 15px rgba(212,175,55,.04),0 5px 18px rgba(0,0,0,.4)"
  },

  itemHeading: {
    display: "flex",
    alignItems: "center",
    gap: 9,
    marginBottom: 12
  },

  itemTitle: {
    color: "#f2d477",
    fontSize: 17,
    flex: 1
  },

  arrow: {
    color: "#d4af37",
    fontSize: 22
  },

  itemLine: {
    height: 2,
    marginTop: 16,
    background: "linear-gradient(90deg,#8d6418,#f2d477,transparent)"
  },

  adminItem: {
    border: "1px solid #e0b943",
    background: "linear-gradient(135deg,rgba(54,40,10,.95),rgba(10,10,10,.98))",
    boxShadow: "0 0 16px rgba(212,175,55,.18)"
  },

  notificationSection: {
    marginBottom: 35,
    padding: 22,
    background: "linear-gradient(145deg,rgba(42,32,12,.98),rgba(9,9,9,.98))",
    border: "1px solid #d4af37",
    borderRadius: 15,
    boxShadow: "0 0 25px rgba(212,175,55,.16)"
  },

  notificationHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 15,
    marginBottom: 20
  },

  notificationTitle: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    flexWrap: "wrap",
    color: "#f2d477",
    fontSize: 19,
    margin: 0
  },

  notificationSubtitle: {
    color: "#aaa",
    fontSize: 13,
    lineHeight: 1.6
  },

  requestCount: {
    minWidth: 70,
    padding: "12px 15px",
    border: "1px solid #d4af37",
    borderRadius: 10,
    textAlign: "center",
    color: "#f2d477",
    fontSize: 25,
    fontWeight: "900",
    background: "rgba(212,175,55,.08)"
  },

  requestGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit,minmax(260px,1fr))",
    gap: 15
  },

  requestCard: {
    padding: 17,
    background: "linear-gradient(145deg,#1d1a12,#0b0b0b)",
    border: "1px solid #8d6c25",
    borderRadius: 11
  },

  requestCardTop: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 15
  },

  requestType: {
    color: "#f2d477",
    fontSize: 11,
    fontWeight: "900",
    letterSpacing: 1
  },

  pendingBadge: {
    color: "#f2d477",
    border: "1px solid #9b792c",
    padding: "5px 8px",
    borderRadius: 5,
    fontSize: 9,
    fontWeight: "bold"
  },

  requestUser: {
    color: "#fff",
    margin: "0 0 5px",
    overflowWrap: "anywhere"
  },

  requestEmail: {
    color: "#999",
    fontSize: 12,
    overflowWrap: "anywhere",
    marginBottom: 17
  },

  requestValues: {
    display: "grid",
    gap: 12,
    padding: 13,
    background: "#101010",
    borderRadius: 8,
    border: "1px solid #49391b"
  },

  requestDate: {
    color: "#777",
    fontSize: 10,
    marginTop: 14
  },

  decisionButtons: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: 9,
    marginTop: 17
  },

  approveButton: {
    padding: 12,
    background: "linear-gradient(135deg,#fff0a6,#d4af37,#98701e)",
    color: "#080808",
    border: "none",
    borderRadius: 7,
    fontWeight: "900",
    fontSize: 11,
    cursor: "pointer"
  },

  denyButton: {
    padding: 12,
    background: "#291313",
    color: "#ff9999",
    border: "1px solid #883d3d",
    borderRadius: 7,
    fontWeight: "900",
    fontSize: 11,
    cursor: "pointer"
  },

  refreshRequests: {
    width: "100%",
    marginTop: 18,
    padding: 13,
    background: "#171717",
    color: "#f2d477",
    border: "1px solid #8d6c25",
    borderRadius: 8,
    fontWeight: "bold",
    cursor: "pointer"
  },

  noRequests: {
    textAlign: "center",
    padding: 25,
    color: "#aaa",
    border: "1px dashed #72571e",
    borderRadius: 10
  },

  requestSuccess: {
    padding: 12,
    marginBottom: 15,
    color: "#65d69a",
    background: "rgba(40,120,75,.12)",
    border: "1px solid #287a50",
    borderRadius: 7,
    fontSize: 13
  },

  requestError: {
    padding: 12,
    marginBottom: 15,
    color: "#ff8888",
    background: "rgba(150,30,30,.12)",
    border: "1px solid #883d3d",
    borderRadius: 7,
    fontSize: 13
  },

  teamSection: {
    marginTop: 35,
    padding: 20,
    background: "linear-gradient(145deg,rgba(20,20,20,.96),rgba(5,5,5,.96))",
    border: "1px solid #a9822b",
    borderRadius: 15,
    boxShadow: "0 0 18px rgba(212,175,55,.1)"
  },

  stats: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit,minmax(140px,1fr))",
    gap: 12,
    margin: "20px 0"
  },

  statCard: {
    background: "linear-gradient(145deg,#202020,#0b0b0b)",
    border: "1px solid #66501f",
    borderRadius: 12,
    padding: 17,
    textAlign: "center",
    overflowWrap: "anywhere",
    boxShadow: "inset 0 0 12px rgba(212,175,55,.05)"
  },

  statNumber: {
    color: "#f2d477",
    fontSize: 27,
    marginBottom: 8,
    textShadow: "0 0 10px rgba(212,175,55,.3)"
  },

  table: {
    width: "100%",
    minWidth: 600,
    borderCollapse: "collapse",
    marginTop: 15,
    textAlign: "left"
  },

  cell: {
    padding: 13,
    borderBottom: "1px solid #59451d",
    verticalAlign: "top"
  },

  rankBadge: {
    display: "inline-block",
    minWidth: 34,
    textAlign: "center",
    padding: "6px 8px",
    borderRadius: 7,
    color: "#080808",
    background: "linear-gradient(135deg,#fff0a6,#d4af37,#98701e)",
    fontWeight: "900",
    fontSize: 12
  },

  error: {
    color: "#ff5555",
    marginTop: 15
  },

  logout: {
    marginTop: 30,
    padding: "14px 28px",
    background: "linear-gradient(135deg,#fff0a6,#d4af37,#98701e)",
    color: "#080808",
    border: "1px solid #ffe69a",
    borderRadius: 9,
    fontWeight: "900",
    letterSpacing: "1px",
    cursor: "pointer",
    boxShadow: "0 0 16px rgba(212,175,55,.3)",
    display: "flex",
    alignItems: "center",
    gap: 10
  },

  footer: {
    marginTop: 55,
    padding: 20,
    borderTop: "1px solid rgba(212,175,55,.25)",
    textAlign: "center",
    color: "#d4af37",
    letterSpacing: "2px",
    lineHeight: 2
  }
};

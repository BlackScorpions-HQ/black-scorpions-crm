
"use client";

import { useEffect, useState } from "react";
import { createClient } from "../../utils/supabase/client";

export default function SuccessfulHires() {
  const [supabase] = useState(() => createClient());

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState(null);

  const [user, setUser] = useState(null);
  const [role, setRole] = useState("");
  const [isCEO, setIsCEO] = useState(false);

  const [hires, setHires] = useState([]);
  const [candidates, setCandidates] = useState([]);
  const [recruiters, setRecruiters] = useState([]);
  const [teamLeaders, setTeamLeaders] = useState([]);
  const [offers, setOffers] = useState([]);

  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const initialForm = {
    candidate_id: "",
    offer_name: "",
    job_title: "",
    hiring_date: new Date().toISOString().split("T")[0],
    recruiter_id: "",
    recruiter_name: "",
    recruiter_commission: "0",
    team_leader_id: "",
    team_leader_name: "",
    team_leader_commission: "0",
    founder_name: "",
    founder_commission: "0",
  };

  const [form, setForm] = useState(initialForm);

  useEffect(() => {
    loadPage();
  }, [supabase]);

  const currentUserName = (authUser) =>
    authUser?.user_metadata?.full_name ||
    authUser?.user_metadata?.name ||
    authUser?.email ||
    "Unknown User";

  async function loadPage() {
    setLoading(true);
    setError("");

    try {
      const { data: authData, error: authError } =
        await supabase.auth.getUser();

      if (authError || !authData?.user) {
        setError("Please login first.");
        setLoading(false);
        return;
      }

      const currentUser = authData.user;
      setUser(currentUser);

      const { data: roleData, error: roleError } = await supabase
        .from("user_roles")
        .select("role")
        .eq("id", currentUser.id)
        .single();

      if (roleError || !roleData?.role) {
        setError("Could not identify your account role.");
        setLoading(false);
        return;
      }

      const currentRole = roleData.role;

      if (!["CEO", "Team Leader", "Recruiter"].includes(currentRole)) {
        setError("You do not have permission to access this page.");
        setLoading(false);
        return;
      }

      setRole(currentRole);
      setIsCEO(currentRole === "CEO");

      const currentName = currentUserName(currentUser);

      let founderName = currentName;

      if (currentRole !== "CEO") {
        founderName = "CEO / Founder";
      }

      setForm((previous) => ({
        ...previous,
        founder_name: previous.founder_name || founderName,
        recruiter_id:
          currentRole === "Recruiter"
            ? currentUser.id
            : previous.recruiter_id,
        recruiter_name:
          currentRole === "Recruiter"
            ? currentName
            : previous.recruiter_name,
        team_leader_id:
          currentRole === "Team Leader"
            ? currentUser.id
            : previous.team_leader_id,
        team_leader_name:
          currentRole === "Team Leader"
            ? currentName
            : previous.team_leader_name,
      }));

      const [
        hireResult,
        candidateResult,
        teamResult,
        offerResult,
      ] = await Promise.all([
        supabase
          .from("successful_hires")
          .select("*")
          .order("created_at", { ascending: false }),

        supabase
          .from("candidates")
          .select("id, full_name")
          .order("created_at", { ascending: false }),

        supabase.rpc("get_my_team"),

        supabase
          .from("commission_entries")
          .select("*")
          .order("offer_name", { ascending: true }),
      ]);

      if (hireResult.error) {
        setError(
          "Could not load successful hires: " +
            hireResult.error.message
        );
      } else {
        setHires(hireResult.data || []);
      }

      if (candidateResult.error) {
        setError(
          "Could not load candidates: " +
            candidateResult.error.message
        );
      } else {
        setCandidates(candidateResult.data || []);
      }

      if (teamResult.error) {
        console.error("Team accounts error:", teamResult.error);
      } else {
        const accounts = teamResult.data || [];

        setRecruiters(
          accounts.filter(
            (account) => account.member_role === "Recruiter"
          )
        );

        setTeamLeaders(
          accounts.filter(
            (account) => account.member_role === "Team Leader"
          )
        );
      }

      if (offerResult.error) {
        console.error("Commission offers error:", offerResult.error);
      } else {
        setOffers(offerResult.data || []);
      }
    } catch (err) {
      setError(
        err.message || "Something went wrong while loading the page."
      );
    }

    setLoading(false);
  }

  function updateForm(field, value) {
    setForm((previous) => ({
      ...previous,
      [field]: value,
    }));
  }

  function selectOffer(offerName) {
    const selectedOffer = offers.find(
      (offer) => offer.offer_name === offerName
    );

    setForm((previous) => ({
      ...previous,
      offer_name: offerName,
      recruiter_commission: selectedOffer
        ? String(selectedOffer.recruiter_commission ?? 0)
        : "0",
      team_leader_commission: selectedOffer
        ? String(selectedOffer.team_leader_commission ?? 0)
        : "0",
      founder_commission: selectedOffer
        ? String(selectedOffer.founder_commission ?? 0)
        : "0",
    }));
  }

  async function addSuccessfulHire(e) {
    e.preventDefault();

    if (role !== "CEO") {
      setError("Only the CEO can add successful hires.");
      return;
    }

    setSaving(true);
    setMessage("");
    setError("");

    const candidate = candidates.find(
      (item) => item.id === form.candidate_id
    );

    if (!candidate) {
      setError("Please select a candidate.");
      setSaving(false);
      return;
    }

    if (!form.offer_name.trim()) {
      setError("Please select an Offer.");
      setSaving(false);
      return;
    }

    if (!form.founder_name.trim()) {
      setError("Founder name is missing.");
      setSaving(false);
      return;
    }

    const recruiterCommission = Number(form.recruiter_commission);
    const teamLeaderCommission = Number(form.team_leader_commission);
    const founderCommission = Number(form.founder_commission);

    if (
      [
        recruiterCommission,
        teamLeaderCommission,
        founderCommission,
      ].some((value) => !Number.isFinite(value) || value < 0)
    ) {
      setError("Commission amounts must be valid non-negative numbers.");
      setSaving(false);
      return;
    }

    const { data: authData, error: authError } =
      await supabase.auth.getUser();

    if (authError || !authData?.user) {
      setError("Please login again.");
      setSaving(false);
      return;
    }

    const currentUser = authData.user;

    const recruiter = recruiters.find(
      (item) => item.member_id === form.recruiter_id
    );

    const teamLeader = teamLeaders.find(
      (item) => item.member_id === form.team_leader_id
    ) || null;

    if (!recruiter) {
      setError("Please select a Recruiter account.");
      setSaving(false);
      return;
    }

    if (teamLeaderCommission > 0 && !teamLeader) {
      setError(
        "A Team Leader is required when the Team Leader commission is greater than zero."
      );
      setSaving(false);
      return;
    }

    const { data: founderData, error: founderError } = await supabase
      .from("user_roles")
      .select("id")
      .eq("role", "CEO")
      .limit(1)
      .maybeSingle();

    if (founderError || !founderData?.id) {
      setError("Could not identify the CEO account for Founder commission.");
      setSaving(false);
      return;
    }

    const founderId = founderData.id;
    const founderName = form.founder_name.trim();

    const hirePayload = {
      candidate_id: candidate.id,
      candidate_name: candidate.full_name,
      offer_name: form.offer_name,
      company_name: form.offer_name,
      job_title: form.job_title.trim() || null,
      recruiter_id: recruiter.member_id,
      recruiter_name: recruiter.member_name,
      team_leader_id: teamLeader ? teamLeader.member_id : null,
      team_leader_name: teamLeader ? teamLeader.member_name : null,
      recruiter_commission: recruiterCommission,
      team_leader_commission: teamLeaderCommission,
      founder_commission: founderCommission,
      hiring_date: form.hiring_date,
    };

    const { data: hire, error: hireError } = await supabase
      .from("successful_hires")
      .insert(hirePayload)
      .select()
      .single();

    if (hireError) {
      setError(
        "Could not save Successful Hire: " + hireError.message
      );
      setSaving(false);
      return;
    }

    const commissionRows = [
      {
        successful_hire_id: hire.id,
        user_id: recruiter.member_id,
        user_name: recruiter.member_name,
        user_role: "Recruiter",
        amount: recruiterCommission,
        status: "Pending",
      },
    ];

    if (teamLeader) {
      commissionRows.push({
        successful_hire_id: hire.id,
        user_id: teamLeader.member_id,
        user_name: teamLeader.member_name,
        user_role: "Team Leader",
        amount: teamLeaderCommission,
        status: "Pending",
      });
    }

    commissionRows.push({
      successful_hire_id: hire.id,
      user_id: founderId,
      user_name: founderName,
      user_role: "CEO",
      amount: founderCommission,
      status: "Pending",
    });

    const { error: commissionError } = await supabase
      .from("commissions")
      .insert(commissionRows);

    if (commissionError) {
      setError(
        "Hire saved, but commissions could not be created: " +
          commissionError.message
      );
      await loadPage();
      setSaving(false);
      return;
    }

    setMessage("Successful Hire and all commissions added! 🔥");

    setForm({
      ...initialForm,
      hiring_date: new Date().toISOString().split("T")[0],
      founder_name: founderName,
    });

    await loadPage();
    setSaving(false);
  }

  async function deleteHire(hire) {
    if (!isCEO) {
      setError("Only the CEO can delete successful hires.");
      return;
    }

    const confirmed = window.confirm(
      `Are you sure you want to delete the successful hire for ${hire.candidate_name} at ${hire.offer_name || hire.company_name}?\n\nAll commissions linked to this hire will also be deleted.`
    );

    if (!confirmed) return;

    setDeletingId(hire.id);
    setMessage("");
    setError("");

    const { error: deleteError } = await supabase
      .from("successful_hires")
      .delete()
      .eq("id", hire.id);

    if (deleteError) {
      setError("Could not delete hire: " + deleteError.message);
      setDeletingId(null);
      return;
    }

    setHires((previous) =>
      previous.filter((item) => item.id !== hire.id)
    );

    setMessage(
      "Successful Hire and its linked commissions deleted successfully."
    );

    setDeletingId(null);
  }

  const inputStyle = {
    width: "100%",
    padding: "13px 14px",
    marginTop: "8px",
    marginBottom: "17px",
    background: "rgba(8,8,8,0.9)",
    color: "#fff",
    border: "1px solid rgba(212,175,55,0.45)",
    borderRadius: "9px",
    boxSizing: "border-box",
    outline: "none",
    fontSize: "14px",
    colorScheme: "dark",
  };

  const sectionStyle = {
    background: "linear-gradient(145deg, #191919, #101010)",
    border: "1px solid rgba(212,175,55,0.35)",
    borderRadius: "13px",
    padding: "19px",
    marginTop: "20px",
    boxShadow: "0 8px 25px rgba(0,0,0,0.25)",
  };

  const labelStyle = {
    display: "block",
    color: "#d4af37",
    fontSize: "13px",
    fontWeight: "700",
    letterSpacing: "0.3px",
  };

  const cardStyle = {
    background: "linear-gradient(145deg, rgba(24,24,24,0.97), rgba(12,12,12,0.97))",
    border: "1px solid rgba(212,175,55,0.35)",
    borderRadius: "16px",
    padding: "22px",
    marginTop: "25px",
    boxShadow: "0 12px 35px rgba(0,0,0,0.35)",
    backdropFilter: "blur(12px)",
  };

  if (loading) {
    return (
      <main style={styles.page}>
        <div style={styles.loadingCard}>
          <div style={styles.goldLine}></div>
          <h2 style={styles.heading}>Loading Successful Hires...</h2>
          <p style={{ color: "#999" }}>Black Scorpions HQ</p>
        </div>
      </main>
    );
  }

  if (!role) {
    return (
      <main style={styles.page}>
        <div style={styles.loadingCard}>
          <h2 style={styles.title}>Access Error</h2>
          <p style={{ color: "#999" }}>
            {error || "Your account role could not be verified."}
          </p>
        </div>
      </main>
    );
  }

  const canChooseRecruiter = role === "CEO";

  return (
    <main style={styles.page}>
      <div style={styles.glowOne}></div>
      <div style={styles.glowTwo}></div>

      <div style={styles.content}>
        <header style={styles.header}>
          <div style={styles.brandLine}>
            <span style={styles.brandMark}>🦂</span>
            <span style={styles.brandName}>BLACK SCORPIONS</span>
          </div>

          <h1 style={styles.title}>Successful Hires</h1>

          <p style={styles.subtitle}>
            Manage successful placements and commission distribution.
          </p>

          <div style={styles.goldLine}></div>
        </header>

        {message && (
          <div style={styles.success}>
            <span>✓</span> {message}
          </div>
        )}

        {error && (
          <div style={styles.error}>
            <span>!</span> {error}
          </div>
        )}

        {/* CEO ONLY: ADD SUCCESSFUL HIRE FORM */}
        {isCEO && (
          <section style={cardStyle}>
            <div style={styles.sectionHeader}>
              <div>
                <span style={styles.eyebrow}>PLACEMENT MANAGEMENT</span>
                <h2 style={styles.heading}>Add Successful Hire</h2>
              </div>
              <span style={styles.headerIcon}>✦</span>
            </div>

            <form onSubmit={addSuccessfulHire}>
              <label style={labelStyle}>Candidate</label>
              <select
                required
                style={inputStyle}
                value={form.candidate_id}
                onChange={(e) =>
                  updateForm("candidate_id", e.target.value)
                }
              >
                <option value="">Select Candidate</option>
                {candidates.map((candidate) => (
                  <option key={candidate.id} value={candidate.id}>
                    {candidate.full_name}
                  </option>
                ))}
              </select>

              <label style={labelStyle}>Offer Name</label>
              <select
                required
                style={inputStyle}
                value={form.offer_name}
                onChange={(e) => selectOffer(e.target.value)}
              >
                <option value="">Select Offer</option>
                {offers.map((offer) => (
                  <option key={offer.id} value={offer.offer_name}>
                    {offer.offer_name}
                  </option>
                ))}
              </select>

              {offers.length === 0 && (
                <p style={styles.warning}>
                  No offers found. Add offers first in Commission Structure.
                </p>
              )}

              <label style={labelStyle}>Job Title</label>
              <input
                style={inputStyle}
                value={form.job_title}
                onChange={(e) =>
                  updateForm("job_title", e.target.value)
                }
                placeholder="Enter job title"
              />

              <label style={labelStyle}>Hiring Date</label>
              <input
                required
                type="date"
                style={inputStyle}
                value={form.hiring_date}
                onChange={(e) =>
                  updateForm("hiring_date", e.target.value)
                }
              />

              <div style={sectionStyle}>
                <h3 style={styles.subHeading}>👤 Recruiter</h3>

                <label style={labelStyle}>Recruiter Name</label>
                <select
                  required
                  style={inputStyle}
                  value={form.recruiter_id}
                  onChange={(e) => {
                    const selected = recruiters.find(
                      (item) => item.member_id === e.target.value
                    );

                    setForm((previous) => ({
                      ...previous,
                      recruiter_id: e.target.value,
                      recruiter_name: selected
                        ? selected.member_name
                        : "",
                    }));
                  }}
                >
                  <option value="">Select Recruiter</option>
                  {recruiters.map((recruiter) => (
                    <option
                      key={recruiter.member_id}
                      value={recruiter.member_id}
                    >
                      {recruiter.member_name}
                    </option>
                  ))}
                </select>

                <label style={labelStyle}>Recruiter Commission (EGP)</label>
                <input
                  required
                  type="number"
                  min="0"
                  style={inputStyle}
                  value={form.recruiter_commission}
                  onChange={(e) =>
                    updateForm("recruiter_commission", e.target.value)
                  }
                />
              </div>

              <div style={sectionStyle}>
                <h3 style={styles.subHeading}>👔 Team Leader</h3>

                <label style={labelStyle}>Team Leader Name</label>
                <select
                  style={inputStyle}
                  value={form.team_leader_id}
                  onChange={(e) => {
                    const selected = teamLeaders.find(
                      (item) => item.member_id === e.target.value
                    );

                    setForm((previous) => ({
                      ...previous,
                      team_leader_id: e.target.value,
                      team_leader_name: selected
                        ? selected.member_name
                        : "",
                    }));
                  }}
                >
                  <option value="">No Team Leader</option>
                  {teamLeaders.map((leader) => (
                    <option
                      key={leader.member_id}
                      value={leader.member_id}
                    >
                      {leader.member_name}
                    </option>
                  ))}
                </select>

                <label style={labelStyle}>Team Leader Commission (EGP)</label>
                <input
                  required
                  type="number"
                  min="0"
                  style={inputStyle}
                  value={form.team_leader_commission}
                  onChange={(e) =>
                    updateForm("team_leader_commission", e.target.value)
                  }
                />
              </div>

              <div style={sectionStyle}>
                <h3 style={styles.subHeading}>👑 CEO / Founder</h3>

                <label style={labelStyle}>Founder Name</label>
                <input
                  required
                  style={inputStyle}
                  value={form.founder_name}
                  onChange={(e) =>
                    updateForm("founder_name", e.target.value)
                  }
                  placeholder="Founder name"
                />

                <label style={labelStyle}>Founder Commission (EGP)</label>
                <input
                  required
                  type="number"
                  min="0"
                  style={inputStyle}
                  value={form.founder_commission}
                  onChange={(e) =>
                    updateForm("founder_commission", e.target.value)
                  }
                />
              </div>

              <button
                type="submit"
                disabled={saving}
                style={{
                  ...styles.button,
                  opacity: saving ? 0.6 : 1,
                  cursor: saving ? "not-allowed" : "pointer",
                }}
              >
                {saving ? "Saving..." : "✦ Publish Successful Hire"}
              </button>
            </form>
          </section>
        )}

        {/* ALL AUTHORIZED ROLES: VIEW SUCCESSFUL HIRES */}
        <section style={cardStyle}>
          <div style={styles.sectionHeader}>
            <div>
              <span style={styles.eyebrow}>PLACEMENT RECORDS</span>
              <h2 style={styles.heading}>Successful Hires</h2>
            </div>

            <div style={styles.countBadge}>{hires.length}</div>
          </div>

          {hires.length === 0 ? (
            <div style={styles.emptyState}>
              <div style={{ fontSize: "35px" }}>🦂</div>
              <p>No successful hires yet.</p>
            </div>
          ) : (
            <div style={styles.tableWrapper}>
              <table style={styles.table}>
                <thead>
                  <tr>
                    <th>Candidate</th>
                    <th>Offer Name</th>
                    <th>Recruiter</th>
                    <th>Team Leader</th>
                    <th>Founder Commission</th>
                    <th>Date</th>
                    {isCEO && <th>Action</th>}
                  </tr>
                </thead>

                <tbody>
                  {hires.map((hire) => (
                    <tr key={hire.id}>
                      <td style={styles.nameCell}>
                        {hire.candidate_name}
                      </td>
                      <td>{hire.offer_name || hire.company_name || "—"}</td>
                      <td>{hire.recruiter_name}</td>
                      <td>{hire.team_leader_name || "—"}</td>
                      <td style={styles.moneyCell}>
                        {hire.founder_commission} EGP
                      </td>
                      <td>{hire.hiring_date}</td>

                      {isCEO && (
                        <td>
                          <button
                            type="button"
                            disabled={deletingId === hire.id}
                            onClick={() => deleteHire(hire)}
                            style={{
                              ...styles.deleteButton,
                              opacity: deletingId === hire.id ? 0.6 : 1,
                            }}
                          >
                            {deletingId === hire.id
                              ? "Deleting..."
                              : "Delete"}
                          </button>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <footer style={styles.footer}>
          <span>🦂</span> BLACK SCORPIONS RECRUITMENT AGENCY
        </footer>
      </div>
    </main>
  );
}

const styles = {
  page: {
    minHeight: "100vh",
    position: "relative",
    overflow: "hidden",
    background: "radial-gradient(ellipse at 50% 0%, #29200d 0%, #111 38%, #050505 100%)",
    color: "#fff",
    padding: "28px 18px",
    fontFamily: "Arial, sans-serif",
    boxSizing: "border-box",
  },

  content: {
    position: "relative",
    zIndex: 2,
    maxWidth: "1150px",
    margin: "0 auto",
  },

  glowOne: {
    position: "absolute",
    top: "-150px",
    right: "-100px",
    width: "400px",
    height: "400px",
    borderRadius: "50%",
    background: "rgba(212,175,55,0.09)",
    filter: "blur(100px)",
    pointerEvents: "none",
  },

  glowTwo: {
    position: "absolute",
    top: "650px",
    left: "-150px",
    width: "350px",
    height: "350px",
    borderRadius: "50%",
    background: "rgba(130,130,130,0.07)",
    filter: "blur(100px)",
    pointerEvents: "none",
  },

  header: {
    marginBottom: "28px",
    padding: "15px 5px",
  },

  brandLine: {
    display: "flex",
    alignItems: "center",
    gap: "10px",
    marginBottom: "18px",
  },

  brandMark: {
    fontSize: "27px",
  },

  brandName: {
    color: "#d4af37",
    fontSize: "12px",
    fontWeight: "bold",
    letterSpacing: "3px",
  },

  title: {
    color: "#e5c45b",
    fontSize: "clamp(29px, 5vw, 43px)",
    margin: "0 0 10px",
    fontWeight: "800",
    letterSpacing: "0.5px",
    textShadow: "0 0 25px rgba(212,175,55,0.18)",
  },

  subtitle: {
    color: "#aaa",
    fontSize: "14px",
    lineHeight: 1.6,
  },

  goldLine: {
    width: "75px",
    height: "3px",
    borderRadius: "5px",
    background: "linear-gradient(90deg, #80621c, #f4d778)",
    marginTop: "20px",
  },

  sectionHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: "12px",
    marginBottom: "20px",
  },

  eyebrow: {
    display: "block",
    color: "#9c8135",
    fontSize: "10px",
    letterSpacing: "2px",
    fontWeight: "bold",
    marginBottom: "7px",
  },

  heading: {
    color: "#e2c15b",
    fontSize: "21px",
    margin: 0,
    fontWeight: "700",
  },

  subHeading: {
    color: "#e2c15b",
    fontSize: "17px",
    margin: "0 0 18px",
  },

  headerIcon: {
    color: "#d4af37",
    fontSize: "27px",
  },

  countBadge: {
    minWidth: "42px",
    height: "42px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    background: "rgba(212,175,55,0.12)",
    border: "1px solid rgba(212,175,55,0.4)",
    borderRadius: "10px",
    color: "#e5c45b",
    fontWeight: "bold",
  },

  button: {
    width: "100%",
    padding: "15px",
    marginTop: "20px",
    background: "linear-gradient(135deg, #b38b25, #f0d778, #b38b25)",
    color: "#100d05",
    fontWeight: "800",
    border: "1px solid #f4dc88",
    borderRadius: "9px",
    cursor: "pointer",
    fontSize: "14px",
    letterSpacing: "0.5px",
    boxShadow: "0 5px 20px rgba(212,175,55,0.15)",
  },

  deleteButton: {
    padding: "9px 13px",
    background: "rgba(127,29,29,0.25)",
    color: "#ff8585",
    fontWeight: "bold",
    border: "1px solid rgba(239,68,68,0.5)",
    borderRadius: "7px",
    cursor: "pointer",
    whiteSpace: "nowrap",
  },

  success: {
    color: "#75e6a0",
    padding: "14px 16px",
    background: "rgba(16,70,35,0.35)",
    border: "1px solid rgba(74,222,128,0.35)",
    borderRadius: "10px",
    marginBottom: "15px",
    fontSize: "14px",
  },

  error: {
    color: "#ff8585",
    padding: "14px 16px",
    background: "rgba(100,20,20,0.3)",
    border: "1px solid rgba(239,68,68,0.35)",
    borderRadius: "10px",
    marginBottom: "15px",
    fontSize: "14px",
  },

  warning: {
    color: "#e7bd58",
    fontSize: "12px",
    marginTop: "-8px",
    marginBottom: "17px",
  },

  tableWrapper: {
    width: "100%",
    overflowX: "auto",
    borderRadius: "9px",
  },

  table: {
    width: "100%",
    minWidth: "850px",
    borderCollapse: "collapse",
    textAlign: "left",
    fontSize: "13px",
  },

  nameCell: {
    color: "#e5c45b",
    fontWeight: "bold",
  },

  moneyCell: {
    color: "#e5c45b",
    fontWeight: "bold",
    whiteSpace: "nowrap",
  },

  emptyState: {
    textAlign: "center",
    padding: "35px 10px",
    color: "#999",
    border: "1px dashed rgba(212,175,55,0.25)",
    borderRadius: "10px",
  },

  loadingCard: {
    maxWidth: "450px",
    margin: "100px auto",
    textAlign: "center",
    padding: "30px",
    background: "#141414",
    border: "1px solid rgba(212,175,55,0.35)",
    borderRadius: "15px",
  },

  footer: {
    textAlign: "center",
    color: "#76652f",
    fontSize: "10px",
    letterSpacing: "2px",
    marginTop: "45px",
    padding: "20px 5px",
    borderTop: "1px solid rgba(212,175,55,0.15)",
  },
};

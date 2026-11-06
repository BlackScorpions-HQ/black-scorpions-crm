
"use client";

import { useEffect, useState } from "react";
import { createClient } from "../../utils/supabase/client";

export default function SuccessfulHires() {
  const [supabase] = useState(() => createClient());

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
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
    company_name: "",
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

  async function loadPage() {
    setLoading(true);
    setError("");

    const { data: authData, error: authError } =
      await supabase.auth.getUser();

    if (authError || !authData?.user) {
      setError("Please login first.");
      setLoading(false);
      return;
    }

    const { data: roleData, error: roleError } = await supabase
      .from("user_roles")
      .select("role")
      .eq("id", authData.user.id)
      .single();

    if (roleError || roleData?.role !== "CEO") {
      setIsCEO(false);
      setLoading(false);
      return;
    }

    setIsCEO(true);

    const founderDefault =
      authData.user.user_metadata?.full_name ||
      authData.user.user_metadata?.name ||
      authData.user.email ||
      "";

    setForm((previous) => ({
      ...previous,
      founder_name: previous.founder_name || founderDefault,
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
      setError(hireResult.error.message);
    } else {
      setHires(hireResult.data || []);
    }

    if (candidateResult.error) {
      setError(candidateResult.error.message);
    } else {
      setCandidates(candidateResult.data || []);
    }

    if (teamResult.error) {
      setError(
        "Could not load recruiter and Team Leader accounts: " +
          teamResult.error.message
      );
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
      setError(
        "Could not load commission offers: " +
          offerResult.error.message
      );
    } else {
      setOffers(offerResult.data || []);
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

    setSaving(true);
    setMessage("");
    setError("");

    const candidate = candidates.find(
      (item) => item.id === form.candidate_id
    );

    const recruiter = recruiters.find(
      (item) => item.member_id === form.recruiter_id
    );

    const teamLeader = teamLeaders.find(
      (item) => item.member_id === form.team_leader_id
    );

    if (!candidate) {
      setError("Please select a candidate.");
      setSaving(false);
      return;
    }

    if (!recruiter) {
      setError("Please select a Recruiter account.");
      setSaving(false);
      return;
    }

    if (!form.offer_name) {
      setError("Please select an Offer.");
      setSaving(false);
      return;
    }

    if (!form.company_name.trim() || !form.founder_name.trim()) {
      setError("Please complete the company and Founder name.");
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
      setError(
        "Commission amounts must be valid non-negative numbers."
      );
      setSaving(false);
      return;
    }

    if (teamLeaderCommission > 0 && !teamLeader) {
      setError(
        "Please select a Team Leader for their commission."
      );
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

    const founderId = authData.user.id;

    const hirePayload = {
      candidate_id: candidate.id,
      candidate_name: candidate.full_name,
      offer_name: form.offer_name,
      company_name: form.company_name.trim(),
      job_title: form.job_title.trim() || null,

      recruiter_id: recruiter.member_id,
      recruiter_name: recruiter.member_name,

      team_leader_id: teamLeader
        ? teamLeader.member_id
        : null,

      team_leader_name: teamLeader
        ? teamLeader.member_name
        : null,

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
      setError(hireError.message);
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
      {
        successful_hire_id: hire.id,
        user_id: teamLeader ? teamLeader.member_id : null,
        user_name: teamLeader
          ? teamLeader.member_name
          : "No Team Leader",
        user_role: "Team Leader",
        amount: teamLeaderCommission,
        status: "Pending",
      },
      {
        successful_hire_id: hire.id,
        user_id: founderId,
        user_name: form.founder_name.trim(),
        user_role: "CEO",
        amount: founderCommission,
        status: "Pending",
      },
    ];

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

    setMessage(
      "Successful Hire and all commissions added! 🔥"
    );

    setForm({
      ...initialForm,
      hiring_date: new Date().toISOString().split("T")[0],
      founder_name: form.founder_name,
    });

    await loadPage();
    setSaving(false);
  }

  async function deleteHire(hire) {
    const confirmed = window.confirm(
      `Are you sure you want to delete the successful hire for ${hire.candidate_name} at ${hire.company_name}?\n\nAll commissions linked to this hire will also be deleted.`
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
    padding: "12px",
    marginTop: "7px",
    marginBottom: "15px",
    background: "#171717",
    color: "#fff",
    border: "1px solid #80621c",
    borderRadius: "8px",
    boxSizing: "border-box",
  };

  const sectionStyle = {
    background: "#171717",
    border: "1px solid #80621c",
    borderRadius: "10px",
    padding: "15px",
    marginTop: "20px",
  };

  if (loading) {
    return (
      <main style={styles.page}>
        <h2>Loading Successful Hires...</h2>
      </main>
    );
  }

  if (!isCEO) {
    return (
      <main style={styles.page}>
        <h2>CEO Access Only</h2>
      </main>
    );
  }

  return (
    <main style={styles.page}>
      <h1 style={styles.title}>🦂 Successful Hires</h1>

      <p style={{ color: "#aaa" }}>
        Manage successful placements and commission distribution.
      </p>

      {message && <p style={styles.success}>{message}</p>}
      {error && <p style={styles.error}>{error}</p>}

      <section style={styles.card}>
        <h2 style={styles.heading}>Add Successful Hire</h2>

        <form onSubmit={addSuccessfulHire}>
          <label>Candidate</label>
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

          <label>Offer Name</label>
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
            <p style={{ color: "#ffb84d", marginTop: "-8px" }}>
              No offers found. Add offers first in Commission Structure.
            </p>
          )}

          <label>Company Name</label>
          <input
            required
            style={inputStyle}
            value={form.company_name}
            onChange={(e) =>
              updateForm("company_name", e.target.value)
            }
            placeholder="Company name"
          />

          <label>Job Title</label>
          <input
            style={inputStyle}
            value={form.job_title}
            onChange={(e) =>
              updateForm("job_title", e.target.value)
            }
            placeholder="Job title"
          />

          <label>Hiring Date</label>
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
            <h3 style={styles.heading}>👤 Recruiter</h3>

            <label>Recruiter Name</label>
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

            <label>Recruiter Commission (EGP)</label>
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
            <h3 style={styles.heading}>👔 Team Leader</h3>

            <label>Team Leader Name</label>
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

            <label>Team Leader Commission (EGP)</label>
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
            <h3 style={styles.heading}>👑 CEO / Founder</h3>

            <label>Founder Name</label>
            <input
              required
              style={inputStyle}
              value={form.founder_name}
              onChange={(e) =>
                updateForm("founder_name", e.target.value)
              }
              placeholder="Write Founder name"
            />

            <label>Founder Commission (EGP)</label>
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
            style={styles.button}
          >
            {saving ? "Saving..." : "Publish Successful Hire"}
          </button>
        </form>
      </section>

      <section style={styles.card}>
        <h2 style={styles.heading}>
          Successful Hires ({hires.length})
        </h2>

        {hires.length === 0 ? (
          <p style={{ color: "#aaa" }}>
            No successful hires yet.
          </p>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={styles.table}>
              <thead>
                <tr>
                  <th>Candidate</th>
                  <th>Offer</th>
                  <th>Company</th>
                  <th>Recruiter</th>
                  <th>Team Leader</th>
                  <th>Founder Commission</th>
                  <th>Date</th>
                  <th>Action</th>
                </tr>
              </thead>

              <tbody>
                {hires.map((hire) => (
                  <tr key={hire.id}>
                    <td>{hire.candidate_name}</td>
                    <td>{hire.offer_name || "—"}</td>
                    <td>{hire.company_name}</td>
                    <td>{hire.recruiter_name}</td>
                    <td>{hire.team_leader_name || "—"}</td>
                    <td>{hire.founder_commission} EGP</td>
                    <td>{hire.hiring_date}</td>
                    <td>
                      <button
                        type="button"
                        disabled={deletingId === hire.id}
                        onClick={() => deleteHire(hire)}
                        style={styles.deleteButton}
                      >
                        {deletingId === hire.id
                          ? "Deleting..."
                          : "🗑️ Delete"}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </main>
  );
}

const styles = {
  page: {
    minHeight: "100vh",
    background: "#080808",
    color: "#fff",
    padding: "25px",
    fontFamily: "Arial, sans-serif",
  },

  title: {
    color: "#d4af37",
    fontSize: "30px",
    marginBottom: "5px",
  },

  card: {
    background: "#111",
    border: "1px solid #80621c",
    borderRadius: "12px",
    padding: "20px",
    marginTop: "25px",
  },

  heading: {
    color: "#d4af37",
    marginBottom: "15px",
  },

  button: {
    width: "100%",
    padding: "14px",
    marginTop: "20px",
    background: "#d4af37",
    color: "#080808",
    fontWeight: "bold",
    border: "none",
    borderRadius: "8px",
    cursor: "pointer",
  },

  deleteButton: {
    padding: "9px 13px",
    background: "#7f1d1d",
    color: "#fff",
    fontWeight: "bold",
    border: "1px solid #ef4444",
    borderRadius: "7px",
    cursor: "pointer",
  },

  success: {
    color: "#4ade80",
    padding: "12px",
    background: "#102516",
    borderRadius: "8px",
  },

  error: {
    color: "#ff6464",
    padding: "12px",
    background: "#2b1111",
    borderRadius: "8px",
  },

  table: {
    width: "100%",
    borderCollapse: "collapse",
    textAlign: "left",
  },
};

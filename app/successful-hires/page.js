
"use client";

import { useEffect, useState } from "react";
import { createClient } from "../../utils/supabase/client";

export default function SuccessfulHires() {
  const [supabase] = useState(() => createClient());

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isCEO, setIsCEO] = useState(false);

  const [hires, setHires] = useState([]);
  const [candidates, setCandidates] = useState([]);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const [form, setForm] = useState({
    candidate_id: "",
    company_name: "",
    job_title: "",
    hiring_date: new Date().toISOString().split("T")[0],

    recruiter_name: "",
    recruiter_commission: "0",

    team_leader_name: "",
    team_leader_commission: "0",

    founder_name: "",
    founder_commission: "0",
  });

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

    const [hireResult, candidateResult] = await Promise.all([
      supabase
        .from("successful_hires")
        .select("*")
        .order("created_at", { ascending: false }),

      supabase
        .from("candidates")
        .select("id, full_name")
        .order("created_at", { ascending: false }),
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

    setLoading(false);
  }

  function updateForm(field, value) {
    setForm((previous) => ({
      ...previous,
      [field]: value,
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

    if (!candidate) {
      setError("Please select a candidate.");
      setSaving(false);
      return;
    }

    if (
      !form.company_name.trim() ||
      !form.recruiter_name.trim() ||
      !form.founder_name.trim()
    ) {
      setError("Please complete the required names and company.");
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

    if (
      teamLeaderCommission > 0 &&
      !form.team_leader_name.trim()
    ) {
      setError("Enter the Team Leader name for their commission.");
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
      company_name: form.company_name.trim(),
      job_title: form.job_title.trim() || null,

      recruiter_id: null,
      recruiter_name: form.recruiter_name.trim(),

      team_leader_id: null,
      team_leader_name: form.team_leader_name.trim() || null,

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
        user_id: null,
        user_name: form.recruiter_name.trim(),
        user_role: "Recruiter",
        amount: recruiterCommission,
        status: "Pending",
      },
      {
        successful_hire_id: hire.id,
        user_id: null,
        user_name: form.team_leader_name.trim() || "No Team Leader",
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

    setMessage("Successful Hire and all commissions added! 🔥");

    setForm({
      candidate_id: "",
      company_name: "",
      job_title: "",
      hiring_date: new Date().toISOString().split("T")[0],

      recruiter_name: "",
      recruiter_commission: "0",

      team_leader_name: "",
      team_leader_commission: "0",

      founder_name: form.founder_name,
      founder_commission: "0",
    });

    await loadPage();
    setSaving(false);
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
            <input
              required
              style={inputStyle}
              value={form.recruiter_name}
              onChange={(e) =>
                updateForm("recruiter_name", e.target.value)
              }
              placeholder="Write Recruiter name"
            />

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
            <input
              style={inputStyle}
              value={form.team_leader_name}
              onChange={(e) =>
                updateForm("team_leader_name", e.target.value)
              }
              placeholder="Write Team Leader name"
            />

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
                  <th>Company</th>
                  <th>Recruiter</th>
                  <th>Team Leader</th>
                  <th>Founder Commission</th>
                  <th>Date</th>
                </tr>
              </thead>

              <tbody>
                {hires.map((hire) => (
                  <tr key={hire.id}>
                    <td>{hire.candidate_name}</td>
                    <td>{hire.company_name}</td>
                    <td>{hire.recruiter_name}</td>
                    <td>{hire.team_leader_name || "—"}</td>
                    <td>{hire.founder_commission} EGP</td>
                    <td>{hire.hiring_date}</td>
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

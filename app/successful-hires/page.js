
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
  const [recruiters, setRecruiters] = useState([]);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const [form, setForm] = useState({
    candidate_id: "",
    recruiter_id: "",
    company_name: "",
    job_title: "",
    recruiter_commission: "0",
    team_leader_commission: "0",
    founder_commission: "0",
    hiring_date: new Date().toISOString().split("T")[0],
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

    const userId = authData.user.id;

    const { data: roleData, error: roleError } = await supabase
      .from("user_roles")
      .select("role")
      .eq("id", userId)
      .single();

    if (roleError || roleData?.role !== "CEO") {
      setIsCEO(false);
      setLoading(false);
      return;
    }

    setIsCEO(true);

    const [hireResult, candidateResult, recruiterResult] =
      await Promise.all([
        supabase
          .from("successful_hires")
          .select("*")
          .order("created_at", { ascending: false }),

        supabase
          .from("candidates")
          .select("id, full_name, recruiter_name, created_by")
          .order("created_at", { ascending: false }),

        supabase
          .from("user_roles")
          .select("id, full_name, role, team_leader_id")
          .in("role", ["Recruiter", "Team Leader", "CEO"]),
      ]);

    if (hireResult.error) setError(hireResult.error.message);
    else setHires(hireResult.data || []);

    if (candidateResult.error) {
      setError(candidateResult.error.message);
    } else {
      setCandidates(candidateResult.data || []);
    }

    if (recruiterResult.error) {
      setError(recruiterResult.error.message);
    } else {
      setRecruiters(recruiterResult.data || []);
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

    const recruiter = recruiters.find(
      (item) => item.id === form.recruiter_id
    );

    if (!candidate || !recruiter) {
      setError("Please select a candidate and recruiter.");
      setSaving(false);
      return;
    }

    const teamLeader = recruiters.find(
      (item) => item.id === recruiter.team_leader_id
    );

    const recruiterCommission = Number(form.recruiter_commission);
    const teamLeaderCommission = Number(form.team_leader_commission);
    const founderCommission = Number(form.founder_commission);

    if (
      [recruiterCommission, teamLeaderCommission, founderCommission]
        .some((value) => !Number.isFinite(value) || value < 0)
    ) {
      setError("Commission amounts must be valid non-negative numbers.");
      setSaving(false);
      return;
    }

    const { data: authData } = await supabase.auth.getUser();
    const founderId = authData.user.id;

    const hirePayload = {
      candidate_id: candidate.id,
      candidate_name: candidate.full_name,
      company_name: form.company_name.trim(),
      job_title: form.job_title.trim(),
      recruiter_id: recruiter.id,
      recruiter_name: recruiter.full_name || candidate.recruiter_name || "Recruiter",
      team_leader_id: teamLeader?.id || null,
      team_leader_name: teamLeader?.full_name || null,
      recruiter_commission: recruiterCommission,
      team_leader_commission: teamLeader ? teamLeaderCommission : 0,
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
        user_id: recruiter.id,
        user_name: recruiter.full_name || "Recruiter",
        user_role: "Recruiter",
        amount: recruiterCommission,
        status: "Pending",
      },
      {
        successful_hire_id: founderId === recruiter.id ? null : hire.id,
        user_id: founderId,
        user_name: "Founder",
        user_role: "CEO",
        amount: founderCommission,
        status: "Pending",
      },
    ];

    if (teamLeader && teamLeaderCommission > 0) {
      commissionRows.push({
        successful_hire_id: hire.id,
        user_id: teamLeader.id,
        user_name: teamLeader.full_name || "Team Leader",
        user_role: "Team Leader",
        amount: teamLeaderCommission,
        status: "Pending",
      });
    }

    const { error: commissionError } = await supabase
      .from("commissions")
      .insert(commissionRows);

    if (commissionError) {
      setError(
        "Hire was saved, but commission records could not be created: " +
          commissionError.message
      );
      await loadPage();
      setSaving(false);
      return;
    }

    setMessage("Successful hire and commissions added successfully! 🔥");

    setForm({
      candidate_id: "",
      recruiter_id: "",
      company_name: "",
      job_title: "",
      recruiter_commission: "0",
      team_leader_commission: "0",
      founder_commission: "0",
      hiring_date: new Date().toISOString().split("T")[0],
    });

    await loadPage();
    setSaving(false);
  }

  const inputStyle = {
    width: "100%",
    padding: "12px",
    marginTop: "7px",
    marginBottom: "14px",
    background: "#171717",
    color: "#fff",
    border: "1px solid #80621c",
    borderRadius: "8px",
    boxSizing: "border-box",
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
        <h2>Successful Hires</h2>
        <p>CEO access only.</p>
      </main>
    );
  }

  return (
    <main style={styles.page}>
      <h1 style={styles.title}>🦂 Successful Hires</h1>
      <p style={{ color: "#aaa" }}>
        Manage successful placements and team commissions.
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
            onChange={(e) => updateForm("candidate_id", e.target.value)}
          >
            <option value="">Select Candidate</option>
            {candidates.map((candidate) => (
              <option key={candidate.id} value={candidate.id}>
                {candidate.full_name}
              </option>
            ))}
          </select>

          <label>Recruiter</label>
          <select
            required
            style={inputStyle}
            value={form.recruiter_id}
            onChange={(e) => updateForm("recruiter_id", e.target.value)}
          >
            <option value="">Select Recruiter</option>
            {recruiters
              .filter((person) => person.role === "Recruiter")
              .map((person) => (
                <option key={person.id} value={person.id}>
                  {person.full_name || person.id}
                </option>
              ))}
          </select>

          <label>Company Name</label>
          <input
            required
            style={inputStyle}
            value={form.company_name}
            onChange={(e) => updateForm("company_name", e.target.value)}
            placeholder="Company name"
          />

          <label>Job Title</label>
          <input
            style={inputStyle}
            value={form.job_title}
            onChange={(e) => updateForm("job_title", e.target.value)}
            placeholder="Job title"
          />

          <label>Hiring Date</label>
          <input
            required
            type="date"
            style={inputStyle}
            value={form.hiring_date}
            onChange={(e) => updateForm("hiring_date", e.target.value)}
          />

          <h3 style={styles.heading}>Commission Distribution (EGP)</h3>

          <label>Recruiter Commission</label>
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

          <label>Team Leader Commission</label>
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

          <label>Founder Commission</label>
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

          <button type="submit" disabled={saving} style={styles.button}>
            {saving ? "Saving..." : "Publish Successful Hire"}
          </button>
        </form>
      </section>

      <section style={styles.card}>
        <h2 style={styles.heading}>
          Successful Hires ({hires.length})
        </h2>

        {hires.length === 0 ? (
          <p style={{ color: "#aaa" }}>No successful hires yet.</p>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={styles.table}>
              <thead>
                <tr>
                  <th>Candidate</th>
                  <th>Company</th>
                  <th>Recruiter</th>
                  <th>Team Leader</th>
                  <th>Date</th>
                </tr>
              </thead>
              <tbody>
                {hires.map((hire) => (
                  <tr key={hire.id}>
                    <td>{hire.candidate_name}</td>
                    <td>{hire.company_name}</td>
                    <td>{hire.recruiter_name}</td>
                    <td>{hire.team_leader_name || "Direct"}</td>
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
    marginBottom: "20px",
  },
  button: {
    width: "100%",
    padding: "14px",
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

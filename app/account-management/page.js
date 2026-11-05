
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

    const { data: { user }, error: authError } =
      await supabase.auth.getUser();

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
    const { data: { session } } = await supabase.auth.getSession();
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

      if (!response.ok) throw new Error(result.error || "Move failed.");

      setMessage("Recruiter team updated successfully!");
      await loadData();
    } catch (error) {
      setMessage(error.message);
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

      if (!response.ok) throw new Error(result.error || "Delete failed.");

      setMessage("Account deleted. Candidate records were preserved.");
      setSelectedUser("");
      setSelectedLeader("");
      await loadData();
    } catch (error) {
      setMessage(error.message);
    }

    setSaving(false);
  }

  const selected = users.find(
    (item) => item.member_id === selectedUser
  );

  return (
    <main style={{
      minHeight: "100vh",
      background: "#080808",
      color: "#fff",
      padding: "30px 16px",
      fontFamily: "Arial, sans-serif"
    }}>
      <div style={{ maxWidth: 850, margin: "0 auto" }}>

        <button
          onClick={() => router.push("/")}
          style={{
            background: "transparent",
            color: "#d4af37",
            border: "1px solid #d4af37",
            padding: "10px 18px",
            borderRadius: 8,
            cursor: "pointer",
            marginBottom: 25
          }}
        >
          ← Dashboard
        </button>

        <h1 style={{
          color: "#d4af37",
          fontSize: 30,
          marginBottom: 8
        }}>
          ACCOUNT MANAGEMENT
        </h1>

        <p style={{ color: "#aaa", marginBottom: 30 }}>
          Manage recruiters, team assignments and accounts.
        </p>

        {loading ? (
          <p style={{ color: "#d4af37" }}>Loading accounts...</p>
        ) : (
          <>
            <section style={{
              background: "#141414",
              border: "1px solid #333",
              borderRadius: 14,
              padding: 22,
              marginBottom: 25
            }}>
              <h2 style={{ color: "#d4af37", marginTop: 0 }}>
                Team Members ({users.length})
              </h2>

              {users.length === 0 ? (
                <p style={{ color: "#aaa" }}>No team members found.</p>
              ) : (
                <div style={{ overflowX: "auto" }}>
                  <table style={{
                    width: "100%",
                    borderCollapse: "collapse",
                    minWidth: 500
                  }}>
                    <thead>
                      <tr style={{ color: "#d4af37", textAlign: "left" }}>
                        <th style={{ padding: 10 }}>Name</th>
                        <th style={{ padding: 10 }}>Role</th>
                        <th style={{ padding: 10 }}>Team Leader</th>
                        <th style={{ padding: 10 }}>Candidates</th>
                      </tr>
                    </thead>
                    <tbody>
                      {users.map((item) => (
                        <tr key={item.member_id}
                          style={{ borderTop: "1px solid #333" }}>
                          <td style={{ padding: 10 }}>
                            {item.member_name}
                          </td>
                          <td style={{ padding: 10 }}>
                            {item.member_role}
                          </td>
                          <td style={{ padding: 10 }}>
                            {item.team_leader_name}
                          </td>
                          <td style={{ padding: 10 }}>
                            {item.candidate_count}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>

            <section style={{
              background: "#141414",
              border: "1px solid #333",
              borderRadius: 14,
              padding: 22
            }}>
              <h2 style={{ color: "#d4af37", marginTop: 0 }}>
                Manage Recruiter
              </h2>

              <label style={{ display: "block", marginBottom: 9 }}>
                Select Recruiter
              </label>

              <select
                value={selectedUser}
                onChange={(e) => {
                  setSelectedUser(e.target.value);
                  setSelectedLeader("");
                }}
                style={selectStyle}
              >
                <option value="">Choose a recruiter...</option>
                {users
                  .filter((item) => item.member_role === "Recruiter")
                  .map((item) => (
                    <option key={item.member_id} value={item.member_id}>
                      {item.member_name}
                    </option>
                  ))}
              </select>

              {selected && (
                <p style={{ color: "#aaa", fontSize: 13 }}>
                  Current team: {selected.team_leader_name}
                </p>
              )}

              <label style={{
                display: "block",
                marginTop: 22,
                marginBottom: 9
              }}>
                Assign To Team Leader
              </label>

              <select
                value={selectedLeader}
                onChange={(e) => setSelectedLeader(e.target.value)}
                style={selectStyle}
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
                style={goldButton}
              >
                {saving ? "PLEASE WAIT..." : "MOVE TO TEAM"}
              </button>

              <button
                onClick={deleteUser}
                disabled={saving || !selectedUser}
                style={deleteButton}
              >
                DELETE ACCOUNT
              </button>

              <p style={{
                color: "#aaa",
                fontSize: 12,
                marginTop: 15
              }}>
                Deleting an account preserves its candidate records.
              </p>
            </section>
          </>
        )}

        {message && (
          <p style={{
            marginTop: 20,
            padding: 14,
            borderRadius: 8,
            background: "#202020",
            color: message.toLowerCase().includes("error") ||
              message.toLowerCase().includes("failed")
              ? "#ff7777"
              : "#d4af37"
          }}>
            {message}
          </p>
        )}
      </div>
    </main>
  );
}

const selectStyle = {
  width: "100%",
  padding: 13,
  borderRadius: 8,
  background: "#080808",
  color: "#fff",
  border: "1px solid #555",
  marginBottom: 12
};

const goldButton = {
  width: "100%",
  padding: 14,
  marginTop: 18,
  border: "none",
  borderRadius: 8,
  background: "#d4af37",
  color: "#080808",
  fontWeight: "bold",
  cursor: "pointer"
};

const deleteButton = {
  width: "100%",
  padding: 14,
  marginTop: 12,
  border: "1px solid #a33",
  borderRadius: 8,
  background: "#301010",
  color: "#ff7777",
  fontWeight: "bold",
  cursor: "pointer"
};

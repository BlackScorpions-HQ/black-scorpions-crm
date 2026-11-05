
"use client";

import { useEffect, useState } from "react";
import { createClient } from "../../utils/supabase/client";

export default function RecruitersPage() {
  const [supabase] = useState(() => createClient());
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [updating, setUpdating] = useState("");

  async function loadMembers() {
    setLoading(true);
    setMessage("");

    const { data, error } = await supabase.rpc("get_team_members");

    if (error) {
      setMessage("Error: " + error.message);
    } else {
      setMembers(data || []);
    }

    setLoading(false);
  }

  async function changeRole(userId, newRole) {
    if (!confirm("Are you sure you want to change this member's role?")) {
      return;
    }

    setUpdating(userId);
    setMessage("");

    const { error } = await supabase
      .from("user_roles")
      .update({ role: newRole })
      .eq("id", userId);

    if (error) {
      setMessage("Error: " + error.message);
    } else {
      setMessage("Role updated successfully!");
      await loadMembers();
    }

    setUpdating("");
  }

  useEffect(() => {
    loadMembers();
  }, []);

  return (
    <main
      style={{
        minHeight: "100vh",
        background: "#080808",
        color: "white",
        padding: 25,
        fontFamily: "Arial",
      }}
    >
      <h1 style={{ color: "#d4af37" }}>
        🦂 Recruiters Management
      </h1>

      <p style={{ color: "#999" }}>
        Manage your Black Scorpions team and permissions.
      </p>

      <button
        onClick={loadMembers}
        style={buttonStyle}
      >
        REFRESH TEAM
      </button>

      {message && (
        <p style={{ color: "#d4af37" }}>{message}</p>
      )}

      {loading ? (
        <p>Loading team members...</p>
      ) : (
        <div style={{ overflowX: "auto" }}>
          <table
            style={{
              width: "100%",
              minWidth: 650,
              borderCollapse: "collapse",
              marginTop: 25,
            }}
          >
            <thead>
              <tr style={{ color: "#d4af37", textAlign: "left" }}>
                <th style={cellStyle}>Name</th>
                <th style={cellStyle}>Email</th>
                <th style={cellStyle}>Role</th>
                <th style={cellStyle}>Manage Role</th>
              </tr>
            </thead>

            <tbody>
              {members.map((member) => (
                <tr key={member.user_id}>
                  <td style={cellStyle}>
                    {member.full_name || "No name"}
                  </td>

                  <td style={cellStyle}>
                    {member.email}
                  </td>

                  <td style={cellStyle}>
                    {member.role}
                  </td>

                  <td style={cellStyle}>
                    <select
                      value={member.role}
                      disabled={
                        updating === member.user_id ||
                        member.role === "CEO"
                      }
                      onChange={(e) =>
                        changeRole(member.user_id, e.target.value)
                      }
                      style={{
                        background: "#222",
                        color: "#d4af37",
                        border: "1px solid #d4af37",
                        padding: 9,
                        borderRadius: 6,
                      }}
                    >
                      <option value="Recruiter">Recruiter</option>
                      <option value="Team Leader">Team Leader</option>
                      <option value="Unit Manager">Unit Manager</option>
                      <option value="CEO" disabled>CEO</option>
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {members.length === 0 && (
            <p>No team members found.</p>
          )}
        </div>
      )}
    </main>
  );
}

const cellStyle = {
  padding: 14,
  borderBottom: "1px solid #333",
};

const buttonStyle = {
  background: "#d4af37",
  color: "#000",
  padding: "12px 20px",
  border: "none",
  borderRadius: 7,
  fontWeight: "bold",
  cursor: "pointer",
};

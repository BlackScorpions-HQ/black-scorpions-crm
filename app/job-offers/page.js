
"use client";

import { useEffect, useState } from "react";
import { createClient } from "../../utils/supabase/client";

const experienceOptions = [
  "No Experience",
  "1 Year",
  "1–2 Years",
  "2–3 Years",
  "+3 Years",
];

const graduationOptions = [
  "Graduate",
  "Undergraduate",
  "Gap Year",
  "Dropout",
];

const emptySearch = {
  age: "",
  job_type: "",
  graduation_status: "",
  required_language: "",
  experience: "",
  nationality: "",
};

export default function JobOffersPage() {
  const [supabase] = useState(() => createClient());
  const [role, setRole] = useState("");
  const [offers, setOffers] = useState([]);
  const [search, setSearch] = useState(emptySearch);
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [changingStatus, setChangingStatus] = useState(null);
  const [message, setMessage] = useState("");

  const [job, setJob] = useState({
    title: "",
    maximum_age: "",
    required_language: "",
    location: "",
    job_description: "",
    job_type: "",
    graduation_status: "",
    experience: "",
    nationality: "Both",
    status: "Active",
  });

  const isCEO = role === "CEO";

  async function loadOffers() {
    setLoading(true);

    const { data: authData } = await supabase.auth.getUser();
    const currentUser = authData?.user;

    if (!currentUser) {
      setMessage("Please log in first.");
      setLoading(false);
      return;
    }

    const { data: roleData, error: roleError } = await supabase
      .from("user_roles")
      .select("role")
      .eq("id", currentUser.id)
      .single();

    if (roleError) {
      setMessage(roleError.message);
      setLoading(false);
      return;
    }

    setRole(roleData.role);

    const { data, error } = await supabase
      .from("job_offers")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      setMessage(error.message);
    } else {
      setOffers(data || []);
    }

    setLoading(false);
  }

  useEffect(() => {
    loadOffers();
  }, [supabase]);

  function updateJob(field, value) {
    setJob((previous) => ({
      ...previous,
      [field]: value,
    }));
  }

  function updateSearch(field, value) {
    setSearch((previous) => ({
      ...previous,
      [field]: value,
    }));
  }

  async function addJob(event) {
    event.preventDefault();
    setMessage("");

    if (
      !job.title.trim() ||
      !job.maximum_age ||
      !job.required_language.trim() ||
      !job.location.trim() ||
      !job.job_description.trim()
    ) {
      setMessage("Please complete all required job fields.");
      return;
    }

    if (Number(job.maximum_age) < 18) {
      setMessage("Maximum age cannot be below 18.");
      return;
    }

    setSaving(true);

    const { error } = await supabase
      .from("job_offers")
      .insert({
        title: job.title.trim(),
        company: "Black Scorpions",
        maximum_age: Number(job.maximum_age),
        required_language: job.required_language.trim(),
        location: job.location.trim(),
        job_description: job.job_description.trim(),
        job_type: job.job_type || null,
        graduation_status: job.graduation_status || null,
        experience: job.experience || null,
        nationality: job.nationality || "Both",
        status: job.status,
      });

    if (error) {
      setMessage(error.message);
    } else {
      setMessage("Job offer published successfully!");

      setJob({
        title: "",
        maximum_age: "",
        required_language: "",
        location: "",
        job_description: "",
        job_type: "",
        graduation_status: "",
        experience: "",
        nationality: "Both",
        status: "Active",
      });

      await loadOffers();
    }

    setSaving(false);
  }

  async function changeJobStatus(offerId, newStatus) {
    if (!isCEO) return;

    setMessage("");
    setChangingStatus(offerId);

    const { error } = await supabase
      .from("job_offers")
      .update({ status: newStatus })
      .eq("id", offerId);

    if (error) {
      setMessage("Status update failed: " + error.message);
    } else {
      setOffers((previous) =>
        previous.map((offer) =>
          offer.id === offerId
            ? { ...offer, status: newStatus }
            : offer
        )
      );

      setMessage(
        newStatus === "Active"
          ? "Job activated successfully!"
          : "Job placed on Hold successfully!"
      );

      setResults(null);
    }

    setChangingStatus(null);
  }

  function findMatches(event) {
    event.preventDefault();
    setMessage("");
    setResults(null);

    const age = Number(search.age);

    if (!search.age || !Number.isFinite(age) || age < 18) {
      setMessage("Candidates must be at least 18 years old.");
      return;
    }

    if (
      !search.job_type ||
      !search.graduation_status ||
      !search.required_language.trim() ||
      !search.experience ||
      !search.nationality
    ) {
      setMessage("Please complete all search fields.");
      return;
    }

    const matches = offers.filter((offer) => {
      if (offer.status !== "Active") return false;

      if (age > Number(offer.maximum_age)) return false;

      if (
        offer.required_language?.toLowerCase().trim() !==
        search.required_language.toLowerCase().trim()
      ) return false;

      if (offer.job_type && offer.job_type !== search.job_type) {
        return false;
      }

      if (
        offer.graduation_status &&
        offer.graduation_status !== search.graduation_status
      ) return false;

      if (
        offer.experience &&
        offer.experience !== search.experience
      ) return false;

      if (
        offer.nationality &&
        offer.nationality !== "Both" &&
        offer.nationality !== search.nationality
      ) return false;

      return true;
    });

    setResults(matches);
  }

  const activeOffers = offers.filter(
    (offer) => offer.status === "Active"
  );

  const visibleOffers = isCEO
    ? offers
    : activeOffers;

  const inputStyle = {
    width: "100%",
    padding: "12px",
    borderRadius: "9px",
    border: "1px solid #51421c",
    background: "#111111",
    color: "#ffffff",
    marginTop: "6px",
    marginBottom: "14px",
    boxSizing: "border-box",
  };

  const labelStyle = {
    color: "#d9b64c",
    fontSize: "14px",
    fontWeight: "600",
    display: "block",
  };

  const buttonStyle = {
    width: "100%",
    padding: "13px",
    border: "none",
    borderRadius: "9px",
    background: "linear-gradient(90deg,#b68b25,#f2d477)",
    color: "#080808",
    fontWeight: "800",
    cursor: "pointer",
  };

  function field(label, value, onChange, placeholder = "", type = "text") {
    return (
      <label style={labelStyle}>
        {label}
        <input
          style={inputStyle}
          type={type}
          value={value}
          placeholder={placeholder}
          min={type === "number" ? 18 : undefined}
          onChange={(e) => onChange(e.target.value)}
        />
      </label>
    );
  }

  function dropdown(label, value, onChange, options, placeholder) {
    return (
      <label style={labelStyle}>
        {label}
        <select
          style={inputStyle}
          value={value}
          onChange={(e) => onChange(e.target.value)}
        >
          <option value="">
            {placeholder || "Select..."}
          </option>

          {options.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
      </label>
    );
  }

  function offerCard(offer) {
    const isActive = offer.status === "Active";

    return (
      <div
        key={offer.id}
        style={{
          background: "#111111",
          border: "1px solid #57451b",
          borderRadius: "12px",
          padding: "17px",
          marginBottom: "13px",
        }}
      >
        <div style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "10px",
        }}>
          <h3 style={{
            color: "#e9c45b",
            marginTop: 0,
          }}>
            {offer.title}
          </h3>

          <span style={{
            color: isActive ? "#65d69a" : "#ff5555",
            fontWeight: "bold",
            background: isActive ? "#10251a" : "#2b1111",
            padding: "7px 12px",
            borderRadius: "20px",
          }}>
            {isActive ? "🟢 ACTIVE" : "🔴 HOLD"}
          </span>
        </div>

        <p><b>Location:</b> {offer.location}</p>
        <p><b>Language:</b> {offer.required_language}</p>
        <p><b>Maximum Age:</b> {offer.maximum_age}</p>
        <p><b>Job Type:</b> {offer.job_type || "Any"}</p>
        <p><b>Graduation:</b> {offer.graduation_status || "Any"}</p>
        <p><b>Experience:</b> {offer.experience || "Any"}</p>
        <p><b>Nationality:</b> {offer.nationality || "Both"}</p>

        <p style={{
          whiteSpace: "pre-wrap",
          color: "#cccccc",
        }}>
          {offer.job_description}
        </p>

        {isCEO && (
          <button
            type="button"
            disabled={changingStatus === offer.id}
            onClick={() =>
              changeJobStatus(
                offer.id,
                isActive ? "Hold" : "Active"
              )
            }
            style={{
              ...buttonStyle,
              background: isActive
                ? "#8d2525"
                : "#176b3a",
              color: "#ffffff",
              marginTop: "10px",
              opacity: changingStatus === offer.id ? 0.6 : 1,
            }}
          >
            {changingStatus === offer.id
              ? "Updating..."
              : isActive
                ? "🔴 Put On Hold"
                : "🟢 Activate Job"}
          </button>
        )}
      </div>
    );
  }

  if (loading) {
    return (
      <main style={{
        background: "#080808",
        color: "#e9c45b",
        minHeight: "100vh",
        padding: 30,
      }}>
        Loading Job Offers...
      </main>
    );
  }

  return (
    <main style={{
      background: "#080808",
      color: "#ffffff",
      minHeight: "100vh",
      padding: "20px",
      fontFamily: "Arial, sans-serif",
    }}>
      <div style={{
        maxWidth: "850px",
        margin: "auto",
      }}>
        <h1 style={{ color: "#e9c45b" }}>
          🦂 Job Offers
        </h1>

        <p style={{ color: "#aaaaaa" }}>
          BLACK SCORPIONS | Smart Job Matching
        </p>

        {message && (
          <div style={{
            background: "#201b0e",
            border: "1px solid #b68b25",
            color: "#f2d477",
            padding: "12px",
            borderRadius: "9px",
            marginBottom: "18px",
          }}>
            {message}
          </div>
        )}

        {isCEO && (
          <section style={{
            background: "#151515",
            border: "1px solid #b68b25",
            borderRadius: "14px",
            padding: "18px",
            marginBottom: "28px",
          }}>
            <h2 style={{ color: "#e9c45b" }}>
              + Publish New Job
            </h2>

            <form onSubmit={addJob}>
              {field(
                "Job Title *",
                job.title,
                (v) => updateJob("title", v),
                "Job title"
              )}

              {field(
                "Maximum Age *",
                job.maximum_age,
                (v) => updateJob("maximum_age", v),
                "18+",
                "number"
              )}

              {field(
                "Language *",
                job.required_language,
                (v) => updateJob("required_language", v),
                "Example: English B2"
              )}

              {field(
                "Location *",
                job.location,
                (v) => updateJob("location", v),
                "Example: Maadi"
              )}

              {dropdown(
                "Job Type",
                job.job_type,
                (v) => updateJob("job_type", v),
                ["WFS", "WFH"],
                "Any"
              )}

              {dropdown(
                "Graduation Status",
                job.graduation_status,
                (v) => updateJob("graduation_status", v),
                graduationOptions,
                "Any"
              )}

              {dropdown(
                "Experience",
                job.experience,
                (v) => updateJob("experience", v),
                experienceOptions,
                "Any"
              )}

              {dropdown(
                "Nationality",
                job.nationality,
                (v) => updateJob("nationality", v),
                ["Both", "Egyptian", "Foreigner"]
              )}

              {dropdown(
                "Job Status *",
                job.status,
                (v) => updateJob("status", v),
                ["Active", "Hold"]
              )}

              <label style={labelStyle}>
                Job Description *
                <textarea
                  style={{
                    ...inputStyle,
                    minHeight: "110px",
                  }}
                  value={job.job_description}
                  onChange={(e) =>
                    updateJob("job_description", e.target.value)
                  }
                  placeholder="Write job details..."
                />
              </label>

              <button
                style={buttonStyle}
                disabled={saving}
              >
                {saving ? "Publishing..." : "Publish Job Offer"}
              </button>
            </form>
          </section>
        )}

        <section style={{
          background: "#151515",
          border: "1px solid #b68b25",
          borderRadius: "14px",
          padding: "18px",
          marginBottom: "28px",
        }}>
          <h2 style={{ color: "#e9c45b" }}>
            🔎 Smart Job Matching
          </h2>

          <p style={{ color: "#aaaaaa" }}>
            Search for suitable active jobs using candidate details.
          </p>

          <form onSubmit={findMatches}>
            {field(
              "Candidate Age *",
              search.age,
              (v) => updateSearch("age", v),
              "Minimum 18",
              "number"
            )}

            {dropdown(
              "Job Type *",
              search.job_type,
              (v) => updateSearch("job_type", v),
              ["WFS", "WFH"]
            )}

            {dropdown(
              "Graduation Status *",
              search.graduation_status,
              (v) => updateSearch("graduation_status", v),
              graduationOptions
            )}

            {field(
              "Language *",
              search.required_language,
              (v) => updateSearch("required_language", v),
              "Example: English B2"
            )}

            {dropdown(
              "Experience *",
              search.experience,
              (v) => updateSearch("experience", v),
              experienceOptions
            )}

            {dropdown(
              "Nationality *",
              search.nationality,
              (v) => updateSearch("nationality", v),
              ["Egyptian", "Foreigner"]
            )}

            <button style={buttonStyle}>
              Find Matching Jobs
            </button>
          </form>

          {results !== null && (
            <div style={{ marginTop: "22px" }}>
              <h3 style={{ color: "#e9c45b" }}>
                Matching Results: {results.length}
              </h3>

              {results.length === 0 ? (
                <p style={{ color: "#cccccc" }}>
                  No matching jobs found.
                </p>
              ) : (
                results.map(offerCard)
              )}
            </div>
          )}
        </section>

        <section>
          <h2 style={{ color: "#e9c45b" }}>
            {isCEO ? "All Job Offers" : "Active Job Offers"}
            {" "}({visibleOffers.length})
          </h2>

          {visibleOffers.length === 0 ? (
            <p style={{ color: "#aaaaaa" }}>
              No job offers found.
            </p>
          ) : (
            visibleOffers.map(offerCard)
          )}
        </section>
      </div>
    </main>
  );
}

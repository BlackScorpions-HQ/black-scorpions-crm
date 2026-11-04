
"use client";

import { useState } from "react";

export default function Home() {
  const [activeTab, setActiveTab] = useState("Dashboard");
  const [candidates, setCandidates] = useState([]);
  const [jobs, setJobs] = useState([]);
  const [recruiters, setRecruiters] = useState([]);

  const [candidate, setCandidate] = useState({
    name: "", phone: "", english: "B1", location: "",
    graduation: "Graduate", workType: "On-site"
  });

  const [job, setJob] = useState({
    title: "", company: "", language: "", location: ""
  });

  const [recruiter, setRecruiter] = useState({
    name: "", role: "Recruiter", phone: ""
  });

  const gold = "#d4af37";
  const inputStyle = {
    width: "100%", padding: 12, marginTop: 7,
    marginBottom: 15, background: "#222",
    color: "white", border: "1px solid #444",
    borderRadius: 7, boxSizing: "border-box"
  };

  const buttonStyle = {
    padding: "12px 22px", background: gold,
    color: "#000", border: "none",
    borderRadius: 7, fontWeight: "bold",
    cursor: "pointer"
  };

  const cardStyle = {
    background: "#151515", border: "1px solid #333",
    borderRadius: 12, padding: 22, marginBottom: 18
  };

  function Field({ label, value, onChange, placeholder, options }) {
    return (
      <label style={{ display: "block", color: "#ccc" }}>
        {label}
        {options ? (
          <select value={value} onChange={e => onChange(e.target.value)} style={inputStyle}>
            {options.map(x => <option key={x}>{x}</option>)}
          </select>
        ) : (
          <input value={value} placeholder={placeholder}
            onChange={e => onChange(e.target.value)}
            style={inputStyle} />
        )}
      </label>
    );
  }

  function Heading({ children }) {
    return <h2 style={{ color: gold, marginBottom: 22 }}>{children}</h2>;
  }

  function Dashboard() {
    const stats = [
      ["Total Candidates", candidates.length],
      ["Active Recruiters", recruiters.length],
      ["Available Jobs", jobs.length],
      ["Successful Hires", 0]
    ];

    return (
      <>
        <Heading>Dashboard Overview</Heading>
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit,minmax(160px,1fr))",
          gap: 15
        }}>
          {stats.map(([title, value]) => (
            <div key={title} style={cardStyle}>
              <p style={{ color: "#999" }}>{title}</p>
              <h1 style={{ color: gold, fontSize: 34 }}>{value}</h1>
            </div>
          ))}
        </div>
        <div style={cardStyle}>
          <h3>Welcome to Black Scorpions CRM 🦂</h3>
          <p style={{ color: "#999", marginTop: 12 }}>
            Manage your candidates, job offers and recruitment team.
          </p>
        </div>
      </>
    );
  }

  function Candidates() {
    return (
      <>
        <Heading>Candidates Management</Heading>
        <form style={cardStyle} onSubmit={e => {
          e.preventDefault();
          setCandidates([...candidates, { ...candidate, id: Date.now() }]);
          setCandidate({
            name: "", phone: "", english: "B1", location: "",
            graduation: "Graduate", workType: "On-site"
          });
        }}>
          <h3>Add New Candidate</h3>
          <Field label="Full Name" value={candidate.name}
            onChange={v => setCandidate({...candidate, name:v})} placeholder="Candidate name" />
          <Field label="Phone Number" value={candidate.phone}
            onChange={v => setCandidate({...candidate, phone:v})} placeholder="Phone number" />
          <Field label="English Level" value={candidate.english}
            options={["A1","A2","B1","B2","C1","C2"]}
            onChange={v => setCandidate({...candidate, english:v})} />
          <Field label="Location" value={candidate.location}
            onChange={v => setCandidate({...candidate, location:v})} placeholder="Candidate location" />
          <Field label="Graduation Status" value={candidate.graduation}
            options={["Graduate","Undergraduate","Gap Year","Dropout"]}
            onChange={v => setCandidate({...candidate, graduation:v})} />
          <Field label="Work Type" value={candidate.workType}
            options={["On-site","Work From Home","Both"]}
            onChange={v => setCandidate({...candidate, workType:v})} />
          <button style={buttonStyle} type="submit"
            disabled={!candidate.name.trim() || !candidate.phone.trim()}>
            Add Candidate
          </button>
        </form>

        <div style={cardStyle}>
          <h3>Candidate Records ({candidates.length})</h3>
          {candidates.length === 0 ? <p style={{color:"#888"}}>No candidates added yet.</p> :
            candidates.map(c => (
              <div key={c.id} style={{borderBottom:"1px solid #333", padding:"14px 0"}}>
                <b style={{color:gold}}>{c.name}</b>
                <p style={{color:"#aaa"}}>{c.phone} · {c.english} · {c.location}</p>
                <p style={{color:"#888"}}>{c.graduation} · {c.workType}</p>
              </div>
            ))
          }
        </div>
      </>
    );
  }

  function JobOffers() {
    return (
      <>
        <Heading>Job Offers</Heading>
        <form style={cardStyle} onSubmit={e => {
          e.preventDefault();
          setJobs([...jobs, {...job, id:Date.now()}]);
          setJob({title:"", company:"", language:"", location:""});
        }}>
          <h3>Add New Job</h3>
          <Field label="Job Title" value={job.title}
            onChange={v => setJob({...job,title:v})} placeholder="Customer Service Representative" />
          <Field label="Company" value={job.company}
            onChange={v => setJob({...job,company:v})} placeholder="Company name" />
          <Field label="Required Language" value={job.language}
            onChange={v => setJob({...job,language:v})} placeholder="English B2 / Dutch B2" />
          <Field label="Location" value={job.location}
            onChange={v => setJob({...job,location:v})} placeholder="Maadi / WFH" />
          <button style={buttonStyle} type="submit"
            disabled={!job.title.trim() || !job.company.trim()}>
            Add Job Offer
          </button>
        </form>
        <div style={cardStyle}>
          <h3>Available Jobs ({jobs.length})</h3>
          {jobs.length === 0 ? <p style={{color:"#888"}}>No jobs added yet.</p> :
            jobs.map(j => (
              <div key={j.id} style={{padding:14,borderBottom:"1px solid #333"}}>
                <b style={{color:gold}}>{j.title}</b>
                <p style={{color:"#aaa"}}>{j.company} · {j.language} · {j.location}</p>
              </div>
            ))
          }
        </div>
      </>
    );
  }

  function Recruiters() {
    return (
      <>
        <Heading>Recruitment Team</Heading>
        <form style={cardStyle} onSubmit={e => {
          e.preventDefault();
          setRecruiters([...recruiters, {...recruiter, id:Date.now()}]);
          setRecruiter({name:"", role:"Recruiter", phone:""});
        }}>
          <h3>Add Team Member</h3>
          <Field label="Full Name" value={recruiter.name}
            onChange={v => setRecruiter({...recruiter,name:v})} placeholder="Recruiter name" />
          <Field label="Role" value={recruiter.role}
            options={["Recruiter","Team Leader","Unit Manager","CEO"]}
            onChange={v => setRecruiter({...recruiter,role:v})} />
          <Field label="Phone Number" value={recruiter.phone}
            onChange={v => setRecruiter({...recruiter,phone:v})} placeholder="Phone number" />
          <button style={buttonStyle} type="submit"
            disabled={!recruiter.name.trim()}>
            Add Recruiter
          </button>
        </form>
        <div style={cardStyle}>
          <h3>Team Members ({recruiters.length})</h3>
          {recruiters.length === 0 ? <p style={{color:"#888"}}>No recruiters added yet.</p> :
            recruiters.map(r => (
              <div key={r.id} style={{padding:14,borderBottom:"1px solid #333"}}>
                <b style={{color:gold}}>{r.name}</b>
                <p style={{color:"#aaa"}}>{r.role} · {r.phone}</p>
              </div>
            ))
          }
        </div>
      </>
    );
  }

  return (
    <main style={{
      minHeight:"100vh", background:"#080808", color:"#fff",
      fontFamily:"Arial", display:"flex", flexWrap:"wrap"
    }}>
      <aside style={{
        width:220, flexShrink:0, background:"#111",
        padding:20, borderRight:"1px solid #333",
        boxSizing:"border-box"
      }}>
        <h2 style={{color:gold}}>🦂 BLACK SCORPIONS</h2>
        <p style={{color:"#888",fontSize:12}}>RECRUITMENT CRM</p>
        <div style={{marginTop:35}}>
          {["Dashboard","Candidates","Job Offers","Recruiters","Settings"].map(item => (
            <button key={item} onClick={() => setActiveTab(item)}
              style={{
                display:"block", width:"100%", padding:14,
                marginBottom:9, background:activeTab===item ? gold:"#1b1b1b",
                color:activeTab===item ? "#000":"#fff",
                border:"none", borderRadius:8, textAlign:"left",
                cursor:"pointer"
              }}>{item}</button>
          ))}
        </div>
      </aside>

      <section style={{flex:1,minWidth:260,padding:25,boxSizing:"border-box"}}>
        <h1 style={{color:gold,marginBottom:28}}>{activeTab}</h1>

        {activeTab === "Dashboard" && <Dashboard />}
        {activeTab === "Candidates" && <Candidates />}
        {activeTab === "Job Offers" && <JobOffers />}
        {activeTab === "Recruiters" && <Recruiters />}
        {activeTab === "Settings" && (
          <>
            <Heading>System Settings</Heading>
            <div style={cardStyle}>
              <h3>Black Scorpions Recruitment Agency</h3>
              <p style={{color:"#999",marginTop:12}}>Internal Recruitment Management System</p>
              <p style={{color:gold,marginTop:12}}>Version 1.0</p>
            </div>
          </>
        )}
      </section>
    </main>
  );
}

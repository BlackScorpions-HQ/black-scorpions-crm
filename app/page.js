"use client";

import { useState } from "react";

export default function Home() {
  const [activeTab, setActiveTab] = useState("Dashboard");

  const menu = [
    "Dashboard",
    "Candidates",
    "Job Offers",
    "Recruiters",
    "Settings"
  ];

  return (
    <main style={{
      minHeight: "100vh",
      background: "#080808",
      color: "#fff",
      fontFamily: "Arial",
      display: "flex"
    }}>

      <aside style={{
        width: "240px",
        background: "#111",
        padding: "25px",
        borderRight: "1px solid #333"
      }}>
        <h2 style={{color:"#d4af37"}}>
          🦂 BLACK SCORPIONS
        </h2>

        <p style={{color:"#888",marginTop:8}}>
          RECRUITMENT CRM
        </p>

        <div style={{marginTop:40}}>
          {menu.map(item => (
            <button
              key={item}
              onClick={() => setActiveTab(item)}
              style={{
                display:"block",
                width:"100%",
                padding:14,
                marginBottom:10,
                background:activeTab === item ? "#d4af37" : "#1b1b1b",
                color:activeTab === item ? "#000" : "#fff",
                border:"none",
                borderRadius:8,
                textAlign:"left"
              }}
            >
              {item}
            </button>
          ))}
        </div>
      </aside>

      <section style={{flex:1,padding:35}}>
        <h1 style={{color:"#d4af37"}}>
          {activeTab}
        </h1>

        <p style={{color:"#999",marginTop:10}}>
          Welcome to Black Scorpions CRM
        </p>

        <div style={{
          display:"grid",
          gridTemplateColumns:"repeat(auto-fit,minmax(180px,1fr))",
          gap:20,
          marginTop:35
        }}>
          {[
            ["Total Candidates","0"],
            ["Active Recruiters","0"],
            ["Available Jobs","0"],
            ["Successful Hires","0"]
          ].map(([title,value]) => (
            <div key={title} style={{
              background:"#151515",
              border:"1px solid #333",
              borderRadius:12,
              padding:25
            }}>
              <p style={{color:"#999"}}>{title}</p>
              <h2 style={{
                color:"#d4af37",
                fontSize:32,
                marginTop:15
              }}>{value}</h2>
            </div>
          ))}
        </div>

        <div style={{
          marginTop:35,
          padding:25,
          background:"#151515",
          borderRadius:12,
          border:"1px solid #333"
        }}>
          <h2>System Overview</h2>
          <p style={{color:"#999",marginTop:12}}>
            Your recruitment management system is ready to be configured.
          </p>
        </div>
      </section>
    </main>
  );
        }

import React, { useState } from "react";
import "./CaseDetail.css";

function CaseDetail() {
  const [filter, setFilter] = useState("All");

  return (
    <div className="case-detail-page">
      {/* FIXED TOP SECTION */}
      <div className="case-top-section">
        <div className="case-breadcrumb">
          Cases <span>›</span> <span>CASE-1092</span>
        </div>

        <header className="case-header">
          <div className="case-header-left">
            <div className="case-title-row">
              <span className="case-id">CASE-1092</span>
              <span className="case-title-separator">—</span>
              <h1>Suspicious PowerShell Activity</h1>
            </div>

            <div className="case-meta">
              <span className="case-severity">• High</span>
              <span className="case-status">Investigating</span>
              <span className="case-created">Created Aug 8, 206</span>
            </div>
          </div>

          <div className="case-header-actions">
            <button className="case-action-button">Edit Case</button>
            <button className="case-action-button">Close Case</button>
          </div>
        </header>
      </div>

      {/* SCROLLABLE LOWER SECTION */}
      <div className="case-content-scrollable">
        {/* OVERVIEW STATS */}
        <div className="stats-grid">
          <div className="stat-card">
            <span className="label">EVENTS</span>
            <span className="value"></span>
          </div>
          <div className="stat-card">
            <span className="label">DETECTIONS</span>
            <span className="value"></span>
          </div>
          <div className="stat-card">
            <span className="label">HOSTS</span>
            <span className="value"></span>
          </div>
          <div className="stat-card">
            <span className="label">USERS</span>
            <span className="value"></span>
          </div>
        </div>

        {/* SUMMARY */}
        <section className="section-block">
          <h3 className="section-header">INVESTIGATION SUMMARY</h3>
          <p className="summary-text">
            Multiple instances of encoded PowerShell commands executed from non-standard parent processes. Possible lateral movement or C2 beaconing detected on WS-FINANCE-04.
          </p>
        </section>

        {/* DETAILS TABLE */}
        <section className="section-block">
          <div className="details-table">
            <div className="table-row">
              <span className="row-label">Case ID</span>
              <span className="row-value">CASE-1092</span>
            </div>
            <div className="table-row">
              <span className="row-label">Created</span>
              <span className="row-value">Aug 8, 2026</span>
            </div>
            <div className="table-row">
              <span className="row-label">Last Updated</span>
              <span className="row-value">Aug 8, 2026</span>
            </div>
            <div className="table-row">
              <span className="row-label">Last Activity</span>
              <span className="row-value">10 min ago</span>
            </div>
            <div className="table-row">
              <span className="row-label">Tags</span>
              <span className="row-value">powershell, lateral-movement, endpoint</span>
            </div>
          </div>
        </section>

        {/* 1. ACTIVITY SECTION */}
        <section className="section-block">
          <h3 className="section-header">ACTIVITY</h3>
          <div className="activity-timeline">
            <div className="timeline-card">
              <div className="card-top">
                <span className="badge high">High</span>
                <span className="source">Sysmon</span>
              </div>
              <div className="card-title">Process Creation</div>
              <div className="card-code">powershell.exe -enc JABjADOAtgBIAHcA...</div>
              <div className="card-time">09:14:22</div>
            </div>

            <div className="timeline-card">
              <div className="card-top">
                <span className="badge high">High</span>
                <span className="source">Sysmon</span>
              </div>
              <div className="card-title">Network Connection</div>
              <div className="card-code">192.168.1.50 — 185.220.101.47:443</div>
              <div className="card-time">09:14:35</div>
            </div>

            <div className="timeline-card">
              <div className="card-top">
                <span className="badge critical">Critical</span>
                <span className="source">Sysmon</span>
              </div>
              <div className="card-title">File Creation</div>
              <div className="card-code">C:\Users\jsmith\AppData\Local\Temp\stag...</div>
              <div className="card-time">09:14:51</div>
            </div>

            <div className="timeline-card">
              <div className="card-top">
                <span className="badge critical">Critical</span>
                <span className="source">Sysmon</span>
              </div>
              <div className="card-title">Process Creation</div>
              <div className="card-code">stager.exe spawned from powershell.exe</div>
              <div className="card-time">09:15:10</div>
            </div>

            <div className="timeline-card">
              <div className="card-top">
                <span className="badge high">High</span>
                <span className="source">Sysmon</span>
              </div>
              <div className="card-title">Registry Modification</div>
              <div className="card-code">Run key persistence: HKCU\...\Run\update</div>
              <div className="card-time">09:35:12</div>
            </div>
          </div>
        </section>

        {/* 2. DETECTED EVENTS */}
        <section className="section-block">
          <h3 className="section-header">DETECTED EVENTS</h3>
          <table className="soc-table">
            <thead>
              <tr>
                <th>TIME</th>
                <th>EVENT TYPE</th>
                <th>DESCRIPTION</th>
                <th>HOST</th>
                <th>SEVERITY</th>
                <th>DETECTION RULE</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="time-col">09:14:22</td>
                <td className="bold-col">Process Creation</td>
                <td className="code-col">powershell.exe -enc JABjADOAtgBIAHcA...</td>
                <td>WS-FINANCE-04</td>
                <td><span className="badge high">• High</span></td>
                <td className="highlight-col">Suspicious PowerShell Execution</td>
              </tr>
              <tr>
                <td className="time-col">09:14:35</td>
                <td className="bold-col">Network Connection</td>
                <td className="code-col">192.168.1.50 → 185.220.101.47:443</td>
                <td>WS-FINANCE-04</td>
                <td><span className="badge high">• High</span></td>
                <td className="highlight-col">Suspicious Outbound Connection</td>
              </tr>
              <tr>
                <td className="time-col">09:14:51</td>
                <td className="bold-col">File Creation</td>
                <td className="code-col">C:\Users\jsmith\AppData\Local\Temp\stager.exe</td>
                <td>WS-FINANCE-04</td>
                <td><span className="badge critical">• Critical</span></td>
                <td className="highlight-col">Suspicious File Drop in Temp</td>
              </tr>
              <tr>
                <td className="time-col">09:15:10</td>
                <td className="bold-col">Process Creation</td>
                <td className="code-col">stager.exe spawned from powershell.exe</td>
                <td>WS-FINANCE-04</td>
                <td><span className="badge critical">• Critical</span></td>
                <td className="highlight-col">Malware Execution</td>
              </tr>
            </tbody>
          </table>
        </section>

        {/* 3. EVENTS SECTION */}
        <section className="section-block">
          <h3 className="section-header">EVENTS</h3>
          <div className="table-controls">
            <input type="text" placeholder="Search events..." className="soc-input" />
            <div className="filter-group">
              {["All", "Critical", "High", "Medium", "Low"].map((item) => (
                <button
                  key={item}
                  className={`filter-tab ${filter === item ? "active" : ""}`}
                  onClick={() => setFilter(item)}
                >
                  {item}
                </button>
              ))}
            </div>
            <span className="total-count">6 events</span>
          </div>

          <table className="soc-table">
            <thead>
              <tr>
                <th>TIMESTAMP</th>
                <th>EID</th>
                <th>EVENT TYPE</th>
                <th>DESCRIPTION</th>
                <th>HOST</th>
                <th>USER</th>
                <th>SEVERITY</th>
                <th>DETECTION</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="time-col">2026-08-08 09:14:22</td>
                <td>1</td>
                <td className="bold-col">Process Creation</td>
                <td className="code-col">powershell.exe -enc JABjADOAtgBIAHcA...</td>
                <td>WS-FINANCE-04</td>
                <td>jsmith</td>
                <td><span className="badge high">• High</span></td>
                <td className="highlight-col">Suspicious PowerShell Execution</td>
              </tr>
              <tr>
                <td className="time-col">2026-08-08 09:14:35</td>
                <td>3</td>
                <td className="bold-col">Network Connection</td>
                <td className="code-col">192.168.1.50 → 185.220.101.47:443</td>
                <td>WS-FINANCE-04</td>
                <td>jsmith</td>
                <td><span className="badge high">• High</span></td>
                <td className="highlight-col">Suspicious Outbound Connection</td>
              </tr>
              <tr>
                <td className="time-col">2026-08-08 09:14:51</td>
                <td>11</td>
                <td className="bold-col">File Creation</td>
                <td className="code-col">C:\Users\jsmith\AppData\Local\Temp\stager....</td>
                <td>WS-FINANCE-04</td>
                <td>jsmith</td>
                <td><span className="badge critical">• Critical</span></td>
                <td className="highlight-col">Suspicious File Drop in Temp</td>
              </tr>
              <tr>
                <td className="time-col">2026-08-08 09:15:10</td>
                <td>1</td>
                <td className="bold-col">Process Creation</td>
                <td className="code-col">stager.exe spawned from powershell.exe</td>
                <td>WS-FINANCE-04</td>
                <td>jsmith</td>
                <td><span className="badge critical">• Critical</span></td>
                <td className="highlight-col">Malware Execution</td>
              </tr>
              <tr>
                <td className="time-col">2026-08-08 09:35:12</td>
                <td>13</td>
                <td className="bold-col">Registry Modification</td>
                <td className="code-col">Run key persistence: HKCU\...\Run\update</td>
                <td>WS-FINANCE-04</td>
                <td>jsmith</td>
                <td><span className="badge high">• High</span></td>
                <td className="highlight-col">Registry Run Key Persistence</td>
              </tr>
              <tr>
                <td className="time-col">2026-08-08 10:02:19</td>
                <td>3</td>
                <td className="bold-col">Network Connection</td>
                <td className="code-col">WS-HR-02 → 185.220.101.47:4444</td>
                <td>WS-HR-02</td>
                <td>mwilson</td>
                <td><span className="badge critical">• Critical</span></td>
                <td className="highlight-col">C2 Beaconing</td>
              </tr>
            </tbody>
          </table>
        </section>

        {/* 4. NOTES SECTION */}
        <section className="section-block">
          <h3 className="section-header">NOTES</h3>
          <div className="notes-container">
            <div className="note-item">
              <p>
                Initial triage complete. PowerShell encoded commands traced to jsmith on WS-FINANCE-04. Parent process is explorer.exe — likely phishing or drive-by. Escalated to Tier 2 for full investigation.
              </p>
              <div className="note-meta">a.chen · 2026-08-08 09:30:00</div>
            </div>

            <div className="note-item">
              <p>
                Confirmed lateral movement to WS-HR-02 via stager.exe. Registry persistence established in HKCU Run key. IOC 185.220.101.47 added to network blocklist. Containment in progress on both endpoints.
              </p>
              <div className="note-meta">r.patel · 2026-08-08 10:15:00</div>
            </div>

            <div className="add-note-box">
              <span className="add-note-label">ADD NOTE</span>
              <textarea placeholder="Document findings, artifacts, or actions taken..."></textarea>
              <div className="add-note-actions">
                <span className="shortcut-hint">⌘↵ to submit</span>
                <button className="soc-btn">Add Note</button>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}

export default CaseDetail;
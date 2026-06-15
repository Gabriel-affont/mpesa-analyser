import { useState } from "react";
//import { fmt, initials, parseCSV, buildPeopleMap } from "./utilis";
import { fmt, initials, parseMpesaCSV, buildPeopleMap } from "./utilis";
import "./index.css";

// ─── Sample data so you can test without a real M-Pesa export 
const SAMPLE = [
  { date:"2024-01-05 09:14", desc:"Send Money to JANE WANJIKU 0712345678",  amount:-2500, balance:18500, type:"sent",     name:"Jane Wanjiku",    phone:"0712345678" },
  { date:"2024-01-06 11:30", desc:"Received from JOHN KAMAU 0723456789",     amount:5000,  balance:23500, type:"received", name:"John Kamau",       phone:"0723456789" },
  { date:"2024-01-07 14:20", desc:"Send Money to PETER MWANGI 0734567890",   amount:-1800, balance:21700, type:"sent",     name:"Peter Mwangi",     phone:"0734567890" },
  { date:"2024-01-08 08:55", desc:"Received from JANE WANJIKU 0712345678",   amount:3200,  balance:24900, type:"received", name:"Jane Wanjiku",     phone:"0712345678" },
  { date:"2024-01-09 16:40", desc:"Send Money to JOHN KAMAU 0723456789",     amount:-800,  balance:24100, type:"sent",     name:"John Kamau",       phone:"0723456789" },
  { date:"2024-01-10 10:10", desc:"Send Money to GRACE ACHIENG 0745678901",  amount:-3500, balance:20600, type:"sent",     name:"Grace Achieng",    phone:"0745678901" },
  { date:"2024-01-12 09:00", desc:"Send Money to JANE WANJIKU 0712345678",   amount:-4000, balance:17800, type:"sent",     name:"Jane Wanjiku",     phone:"0712345678" },
  { date:"2024-01-13 17:30", desc:"Received from GRACE ACHIENG 0745678901",  amount:2000,  balance:19800, type:"received", name:"Grace Achieng",    phone:"0745678901" },
  { date:"2024-01-15 08:45", desc:"Received from JANE WANJIKU 0712345678",   amount:7500,  balance:26700, type:"received", name:"Jane Wanjiku",     phone:"0712345678" },
  { date:"2024-01-16 14:00", desc:"Send Money to SAMUEL KIPROTICH 0756789012",amount:-2200,balance:24500, type:"sent",     name:"Samuel Kiprotich", phone:"0756789012" },
];

export default function App() {
  

  const [transactions, setTransactions] = useState([]);   // all parsed transactions
  const [selectedPerson, setSelectedPerson] = useState(null); // currently viewed contact
  const [filter, setFilter] = useState("all");            // "all" | "sent" | "received"
  const [search, setSearch] = useState("");               // search box text
  const [fileInfo, setFileInfo] = useState("");           // filename label
  const [isDragging, setIsDragging] = useState(false);   // drag-over state for drop zone

  // ── Derived values (computed from state, no setState needed) ────────────
  // These recalculate automatically every render
  const people = buildPeopleMap(
    transactions.filter((t) =>
      !search ||
      t.name.toLowerCase().includes(search.toLowerCase()) ||
      t.phone.includes(search)
    )
  );

  const personTxns = selectedPerson
    ? transactions.filter((t) => t.name === selectedPerson.name)
    : [];

  const filteredTxns = personTxns.filter((t) =>
    filter === "all" ? true : t.type === filter
  );

  const totalSent     = personTxns.filter(t => t.type === "sent").reduce((s,t) => s + Math.abs(t.amount), 0);
  const totalReceived = personTxns.filter(t => t.type === "received").reduce((s,t) => s + Math.abs(t.amount), 0);
  const net           = totalReceived - totalSent;

  // ── File handling ────────────────────────────────────────────────────────
  function handleFile(file) {
    if (!file) return;
    const reader = new FileReader(); // browser API to read file contents
    reader.onload = (e) => {
      const txns = parseCSV(e.target.result); // parse the raw text
      setTransactions(txns);
      setFileInfo(file.name + " · " + txns.length + " transactions");
      setSelectedPerson(null);
      setFilter("all");
    };
    reader.readAsText(file); // triggers onload when done
  }

  function handleDrop(e) {
    e.preventDefault();           // stop browser from opening the file
    setIsDragging(false);
    handleFile(e.dataTransfer.files[0]);
  }

  function reset() {
    setTransactions([]);
    setSelectedPerson(null);
    setFilter("all");
    setSearch("");
    setFileInfo("");
  }

  

  // Show upload screen if no transactions loaded yet
  if (!transactions.length) {
    return (
      <div className="app">
        <div
          className={`drop-zone ${isDragging ? "drag-over" : ""}`}
          onClick={() => document.getElementById("fileInput").click()}
          onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={handleDrop}
        >
          <div className="drop-title"> Upload your M-Pesa statement</div>
          <div className="drop-sub">CSV or TXT · drag and drop or click to browse</div>
          <div className="drop-sub" style={{ marginTop: "0.5rem", fontSize: "11px" }}>
            Your file stays in your browser — nothing leaves your device
          </div>
        </div>

        {/* Hidden file input — clicking the drop zone triggers this */}
        <input
          type="file"
          id="fileInput"
          accept=".csv,.txt"
          style={{ display: "none" }}
          onChange={(e) => handleFile(e.target.files[0])}
        />

        <div style={{ marginTop: "1rem" }}>
          <button className="btn-ghost" onClick={() => { setTransactions(SAMPLE); setFileInfo("Sample data · " + SAMPLE.length + " transactions"); }}>
            Load sample data
          </button>
        </div>
      </div>
    );
  }

  // Main view — shown after transactions are loaded
  return (
    <div className="app">
      {/* Top bar */}
      <div className="topbar">
        <span style={{ color: "#666", fontSize: "13px" }}>{fileInfo}</span>
        <button className="btn-ghost" onClick={reset}>↑ Upload new file</button>
      </div>

      {/* Search */}
      <div className="search-row">
        <span>🔍</span>
        <input
          type="text"
          placeholder="Search by name or phone…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {/* Two-column layout */}
      <div className="main-layout">

        {/* ── Left sidebar: contact list ── */}
        <div className="sidebar">
          <div style={{ fontSize: "13px", color: "#666", fontWeight: 500 }}>
            People ({people.length})
          </div>
          <div className="people-list">
            {people.map((p) => (
              <div
                key={p.name}
                className={`person-row ${selectedPerson?.name === p.name ? "selected" : ""}`}
                onClick={() => { setSelectedPerson(p); setFilter("all"); }}
              >
                <div className="avatar">{initials(p.name)}</div>
                <div>
                  <div style={{ fontSize: "13px", fontWeight: 500 }}>{p.name}</div>
                  <div style={{ fontSize: "11px", color: "#888" }}>{p.count} transactions</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ── Right panel: person detail ── */}
        <div>
          {!selectedPerson ? (
            <div className="empty">Select a contact to see their transactions</div>
          ) : (
            <>
              {/* Person header */}
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: "1rem" }}>
                <div className="avatar" style={{ width: 40, height: 40, fontSize: 14 }}>
                  {initials(selectedPerson.name)}
                </div>
                <div>
                  <div style={{ fontSize: 16, fontWeight: 600 }}>{selectedPerson.name}</div>
                  <div style={{ fontSize: 12, color: "#888" }}>{selectedPerson.phone || "No phone"}</div>
                </div>
              </div>

              {/* Summary cards */}
              <div className="metric-grid">
                <div className="metric">
                  <div className="metric-label">↑ Total sent</div>
                  <div className="metric-value sent">{fmt(totalSent)}</div>
                </div>
                <div className="metric">
                  <div className="metric-label">↓ Total received</div>
                  <div className="metric-value received">{fmt(totalReceived)}</div>
                </div>
                <div className="metric">
                  <div className="metric-label">Net balance</div>
                  <div className={`metric-value ${net >= 0 ? "received" : "sent"}`}>
                    {net >= 0 ? "+" : "-"}{fmt(Math.abs(net))}
                  </div>
                </div>
                <div className="metric">
                  <div className="metric-label">Transactions</div>
                  <div className="metric-value">{personTxns.length}</div>
                </div>
              </div>

              {/* Filter buttons */}
              <div className="filter-row">
                {["all", "sent", "received"].map((f) => (
                  <button
                    key={f}
                    className={`filter-btn ${filter === f ? "active" : ""}`}
                    onClick={() => setFilter(f)}
                  >
                    {f.charAt(0).toUpperCase() + f.slice(1)}
                  </button>
                ))}
              </div>

              {/* Transaction table */}
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Description</th>
                      <th>Type</th>
                      <th style={{ textAlign: "right" }}>Amount</th>
                      <th style={{ textAlign: "right" }}>Balance</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredTxns.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="empty">No transactions for this filter</td>
                      </tr>
                    ) : (
                      filteredTxns.map((t, i) => (
                        <tr key={i}>
                          <td style={{ whiteSpace: "nowrap", color: "#888", fontSize: 12 }}>{t.date || "—"}</td>
                          <td style={{ maxWidth: 200, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}
                              title={t.desc}>{t.desc}</td>
                          <td><span className={`badge ${t.type}`}>{t.type}</span></td>
                          <td style={{ textAlign: "right", fontWeight: 600, color: t.type === "sent" ? "#a32d2d" : "#3b6d11" }}>
                            {t.type === "sent" ? "-" : "+"}{fmt(t.amount)}
                          </td>
                          <td style={{ textAlign: "right", color: "#888", fontSize: 12 }}>
                            {t.balance ? fmt(t.balance) : "—"}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
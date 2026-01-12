import React from "react";

export default function Sidebar({ activeTab, setActiveTab, reports, onView, onDelete }) {
  return (
    <div className="sidebar">
      <h2>Reports</h2>
      <ul>
        <li
          className={activeTab === "Exporter" ? "active" : ""}
          onClick={() => setActiveTab("Exporter")}
        >
          Exporter Ranking
        </li>
        <li
          className={activeTab === "Importer" ? "active" : ""}
          onClick={() => setActiveTab("Importer")}
        >
          Importer Ranking
        </li>
      </ul>

      {reports.length > 0 && (
        <ul>
          {reports.map((r, idx) => (
            <li key={idx}>
              {r.title}{" "}
              <button onClick={() => onView(r)}>View</button>{" "}
              <button onClick={() => onDelete(r)}>Delete</button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

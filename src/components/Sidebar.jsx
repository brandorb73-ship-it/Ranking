import React from "react";

export default function Sidebar({ activeTab, setActiveTab, reports, onView, onDelete }) {
  return (
    <div className="sidebar">
      <h2>Reports</h2>

      <ul className="tab-list">
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

      {reports.length > 0 ? (
        <ul className="view-list">
          {reports.map((r, idx) => (
            <li key={idx} className="view-item">
              <span className="view-title">{r.title}</span>
              <div className="view-actions">
                <button className="btn secondary" onClick={() => onView(r)}>
                  View
                </button>
                <button className="btn danger" onClick={() => onDelete(r)}>
                  Delete
                </button>
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <div className="no-views">No saved views</div>
      )}
    </div>
  );
}

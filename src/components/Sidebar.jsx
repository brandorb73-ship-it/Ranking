import React from "react";

export default function Sidebar({ activeTab, setActiveTab, savedViews = [], onView, onDelete }) {
  return (
    <div className="sidebar">
      <h2>Saved Intelligence Views</h2>

      {/* Tab switcher */}
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

      {/* Views list */}
      {savedViews.length > 0 ? (
        <ul className="view-list">
          {savedViews.map((view, idx) => (
            <li key={idx} className="view-item">
              <span className="view-title">{view.title}</span>
              <div className="view-actions">
                <button className="btn secondary" onClick={() => onView(view)}>View</button>
                <button className="btn danger" onClick={() => onDelete(view)}>Delete</button>
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <p className="no-views">No saved views for this tab.</p>
      )}
    </div>
  );
}

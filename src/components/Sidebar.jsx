export default function Sidebar({ activeTab, setActiveTab, reports, onView, onDelete }) {
  return (
    <div className="sidebar">
      <div className="tab-buttons">
        <button
          className={`tab-btn ${activeTab === "Exporter" ? "active" : ""}`}
          onClick={() => setActiveTab("Exporter")}
        >
          Exporter Ranking
        </button>
        <button
          className={`tab-btn ${activeTab === "Importer" ? "active" : ""}`}
          onClick={() => setActiveTab("Importer")}
        >
          Importer Ranking
        </button>
      </div>

      <div className="report-list">
        {reports.length === 0 && <p className="empty-msg">No reports yet</p>}
        {reports.map((r, idx) => (
          <div key={idx} className="report-item">
            <span>{r.title}</span>
            <div className="report-actions">
              <button className="btn" onClick={() => onView(r)}>View</button>
              <button className="btn delete" onClick={() => onDelete(r)}>Delete</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

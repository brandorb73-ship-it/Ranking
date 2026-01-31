import { useState } from "react";
import Login from "./components/Login";
import Sidebar from "./components/Sidebar";
import Header from "./components/Header";
import AddReportModal from "./components/AddReportModal";
import ReportTable from "./components/ReportTable";
import ChartDashboard from "./components/ChartDashboard";
import PivotReport from "./components/PivotReport";


export default function App() {
  const [loggedIn, setLoggedIn] = useState(false);

  const [clients, setClients] = useState([]);
  const [reports, setReports] = useState([]);

  const [activeTab, setActiveTab] = useState("Exporter");
  const [viewReport, setViewReport] = useState(null);

  const [showModal, setShowModal] = useState(false);

  // Phase 2: table | charts | combined
  const [viewMode, setViewMode] = useState("table");

  // 🔹 Login gate
  if (!loggedIn) {
    return <Login onLogin={() => setLoggedIn(true)} />;
  }

  // Filter reports by Exporter / Importer
  const filteredReports = reports.filter((r) => r.baseType === activeTab);

  return (
    <div className="app">
      {/* Sidebar */}
      <Sidebar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        reports={filteredReports}
        onView={(r) => {
          setViewReport(r);
          setViewMode("table");
        }}
        onDelete={(r) => setReports(reports.filter((rep) => rep !== r))}
      />

      {/* Main content */}
      <div className="main">
        {/* Header */}
        {!viewReport && (
          <Header
            clients={clients}
            setClients={setClients}
            onAddReport={() => setShowModal(true)}
          />
        )}

        {/* Placeholder if no report selected */}
        {!viewReport && (
          <div className="placeholder">
            <h3>Select a report or add a new one</h3>
          </div>
        )}

        {/* ================= REPORT VIEW ================= */}
        {viewReport && (
          <>
            {/* View toggle */}
            <div style={{ marginBottom: 12 }}>
              <button
                className="btn secondary"
                onClick={() => setViewMode("table")}
              >
                Table
              </button>{" "}
              <button
                className="btn secondary"
                onClick={() => setViewMode("charts")}
              >
                Charts
              </button>{" "}
              <button
                className="btn secondary"
                onClick={() => setViewMode("combined")}
              >
                Combined
              </button>
            </div>

            <div className="report-view-container">
              {/* Charts view */}
              {(viewMode === "charts" || viewMode === "combined") && (
                <ChartDashboard
                  rows={viewReport.rows || []}
                  filteredRows={viewReport.filteredRows || []}
                />
              )}

              {/* Table view */}
              {(viewMode === "table" || viewMode === "combined") && (
                <ReportTable
                  report={viewReport}
                  onBack={() => setViewReport(null)}
                />
              )}
               {/* Pivot view ← ADD THIS AFTER */}
  {viewMode === "pivot" && (
    <PivotReport rows={viewReport.rows || []} />
  )}
            </div>
          </>
        )}

        {/* ================= ADD REPORT MODAL ================= */}
        {showModal && (
          <AddReportModal
            onSave={(newView) => {
              setReports([...reports, newView]);
              setShowModal(false);
            }}
            onClose={() => setShowModal(false)}
          />
        )}
      </div>
    </div>
  );
}

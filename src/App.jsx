import { useState } from "react";
import Login from "./components/Login";
import Sidebar from "./components/Sidebar";
import Header from "./components/Header";
import AddReportModal from "./components/AddReportModal";
import ReportTable from "./components/ReportTable";
import ChartDashboard from "./components/ChartDashboard";

export default function App() {
  const [loggedIn, setLoggedIn] = useState(false);

  const [clients, setClients] = useState([]);
  const [reports, setReports] = useState([]);

  const [activeTab, setActiveTab] = useState("Exporter");
  const [viewReport, setViewReport] = useState(null);

  const [showModal, setShowModal] = useState(false);

  // 🔹 Phase 2 view mode
  const [viewMode, setViewMode] = useState("table"); // table | charts | combined

  // 🔹 Login gate
  if (!loggedIn) {
    return <Login onLogin={() => setLoggedIn(true)} />;
  }

  // 🔹 Filter reports by Exporter / Importer
  const filteredReports = reports.filter(
    (r) => r.baseType === activeTab
  );

  return (
    <div className="app">
      <Sidebar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        reports={filteredReports}
        onView={(r) => {
          setViewReport(r);
          setViewMode("table"); // reset view when opening report
        }}
        onDelete={(r) =>
          setReports(reports.filter((rep) => rep !== r))
        }
      />

      <div className="main">
        {!viewReport && (
          <Header
            clients={clients}
            setClients={setClients}
            onAddReport={() => setShowModal(true)}
          />
        )}

        {/* ================= NO REPORT SELECTED ================= */}
        {!viewReport && (
          <div className="placeholder">
            <h3>Select a report or add a new one</h3>
          </div>
        )}

        {/* ================= REPORT VIEW ================= */}
        {viewReport && (
          <>
            {/* 🔹 View toggle (Phase 2 ready) */}
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

            {/* 🔹 TABLE VIEW */}
            {viewMode === "table" && (
              <ReportTable
                report={viewReport}
                onBack={() => setViewReport(null)}
              />
            )}

            {/* 🔹 CHARTS VIEW */}
            {viewMode === "charts" && (
              <ChartDashboard report={viewReport} />
            )}

            {/* 🔹 COMBINED VIEW */}
            {viewMode === "combined" && (
              <>
                <ChartDashboard report={viewReport} />
                <ReportTable
                  report={viewReport}
                  onBack={() => setViewReport(null)}
                />
              </>
            )}
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
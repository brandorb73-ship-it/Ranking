import { useState } from "react";
import Login from "./components/Login";
import Sidebar from "./components/Sidebar";
import Header from "./components/Header";
import AddReportModal from "./components/AddReportModal";
import ReportTable from "./components/ReportTable";
import ChartDashboard from "./components/ChartDashboard";

export default function App() {
  const [clients, setClients] = useState([]);
  const [loggedIn, setLoggedIn] = useState(false);
  const [activeTab, setActiveTab] = useState("Exporter");
  const [viewReport, setViewReport] = useState(null);
  const [showModal, setShowModal] = useState(false);

  const [datasets, setDatasets] = useState([]);
  const [savedViews, setSavedViews] = useState([]);

  // Phase 2: View mode
  const [viewMode, setViewMode] = useState("table"); // "table" | "charts" | "combined"

  if (!loggedIn) return <Login onLogin={() => setLoggedIn(true)} />;

  const filteredViews = savedViews.filter(v => v.baseType === activeTab);

  return (
    <div className="app">
      <Sidebar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        savedViews={filteredViews}
        onView={setViewReport}
        onDelete={(v) => setSavedViews(savedViews.filter(sv => sv !== v))}
      />

      <div className="main">
        {!viewReport && (
          <Header
            clients={clients}
            setClients={setClients}
            onAddReport={() => setShowModal(true)}
          />
        )}

        {viewReport && (
          <div style={{ marginBottom: 20 }}>
            {/* ---------------- VIEW MODE TOGGLE ---------------- */}
            <button onClick={() => setViewMode("table")}>Table</button>
            <button onClick={() => setViewMode("charts")}>Charts</button>
            <button onClick={() => setViewMode("combined")}>Combined</button>
          </div>
        )}

        {/* ---------------- MAIN CONTENT ---------------- */}
        {viewReport && (viewMode === "table" || viewMode === "combined") && (
          <ReportTable
            report={viewReport || { dataset: "", viewType: "BY_VALUE", filters: {} }}
            onBack={() => setViewReport(null)}
          />
        )}

        {viewReport && (viewMode === "charts" || viewMode === "combined") && (
          <ChartDashboard report={viewReport} />
        )}

        {showModal && (
          <AddReportModal
            clients={clients}
            datasets={datasets}
            onSave={(newView, newDataset) => {
              if (newDataset) setDatasets([...datasets, newDataset]);
              setSavedViews([...savedViews, newView]);
              setShowModal(false);
            }}
            onClose={() => setShowModal(false)}
          />
        )}

        {!viewReport && (
          <div className="placeholder">
            <h3>Select a report or add a new one</h3>
          </div>
        )}
      </div>
    </div>
  );
}

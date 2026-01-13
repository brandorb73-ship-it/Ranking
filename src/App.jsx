import { useState } from "react";
import Login from "./components/Login";
import Sidebar from "./components/Sidebar";
import Header from "./components/Header";
import AddReportModal from "./components/AddReportModal";
import ReportTable from "./components/ReportTable";

export default function App() {
  // ---------------- PHASE 1 STATE ----------------
  const [clients, setClients] = useState([]);
  const [loggedIn, setLoggedIn] = useState(false);
  const [activeTab, setActiveTab] = useState("Exporter");
  const [viewReport, setViewReport] = useState(null);
  const [showModal, setShowModal] = useState(false);

  // Phase 1: datasets and saved intelligence views
  const [datasets, setDatasets] = useState([]);       // uploaded CSVs
  const [savedViews, setSavedViews] = useState([]);   // published intelligence views

  // ---------------- LOGIN ----------------
  if (!loggedIn) return <Login onLogin={() => setLoggedIn(true)} />;

  // ---------------- FILTERED VIEWS ----------------
  const filteredViews = savedViews.filter(v => v.baseType === activeTab);

  return (
    <div className="app">
      {/* ---------------- SIDEBAR ---------------- */}
      <Sidebar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        savedViews={filteredViews}
        onView={setViewReport}
        onDelete={(v) => setSavedViews(savedViews.filter(sv => sv !== v))}
      />

      {/* ---------------- MAIN CONTENT ---------------- */}
      <div className="main">
        {/* HEADER */}
        {!viewReport && (
          <Header
            clients={clients}
            setClients={setClients}
            onAddReport={() => setShowModal(true)}
          />
        )}

        {/* REPORT TABLE */}
        {viewReport ? (
          <ReportTable
            report={viewReport || { dataset: "", viewType: "BY_VALUE", filters: {} }}
            onBack={() => setViewReport(null)}
          />
        ) : (
          <div className="placeholder">
            <h3>Select a report or add a new one</h3>
          </div>
        )}

        {/* ADD REPORT MODAL */}
        {showModal && (
          <AddReportModal
            clients={clients}
            datasets={datasets}
            onSave={(newView, newDataset) => {
              // Save dataset if new
              if (newDataset) setDatasets([...datasets, newDataset]);

              // Save intelligence view
              setSavedViews([...savedViews, newView]);
              setShowModal(false);
            }}
            onClose={() => setShowModal(false)}
          />
        )}
      </div>
    </div>
  );
}

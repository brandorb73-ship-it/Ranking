import { useState } from "react";
import Login from "./components/Login";
import Sidebar from "./components/Sidebar";
import Header from "./components/Header";
import AddReportModal from "./components/AddReportModal";
import ReportTable from "./components/ReportTable";

export default function App() {
  const [clients, setClients] = useState([]);
  const [loggedIn, setLoggedIn] = useState(false);

  // Phase 1: Saved Intelligence Views
  const [savedViews, setSavedViews] = useState([]);
  const [datasets, setDatasets] = useState([]);

  const [activeTab, setActiveTab] = useState("Exporter");
  const [viewReport, setViewReport] = useState(null);
  const [showModal, setShowModal] = useState(false);

  if (!loggedIn) return <Login onLogin={() => setLoggedIn(true)} />;

  return (
    <div className="app">
      {/* Sidebar */}
      <Sidebar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        savedViews={savedViews}
        onView={(view) => setViewReport(view)}
        onDelete={(view) => setSavedViews(savedViews.filter(v => v !== view))}
      />

      {/* Main content */}
      <div className="main">
        {!viewReport && (
          <Header
            clients={clients}
            setClients={setClients}
            onAddReport={() => setShowModal(true)}
          />
        )}

        {/* Report Table */}
        {viewReport && (
          <ReportTable
            report={viewReport}
            onBack={() => setViewReport(null)}
          />
        )}

        {/* Add Intelligence View Modal */}
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

        {/* Placeholder */}
        {!viewReport && !showModal && (
          <div className="placeholder">
            <h3>Select a report or add a new one</h3>
          </div>
        )}
      </div>
    </div>
  );
}
import { useState } from "react";
import Sidebar from "./components/Sidebar";
import Header from "./components/Header";
import AddReportModal from "./components/AddReportModal";
import ReportTable from "./components/ReportTable";

export default function App() {
  // Clients list
  const [clients, setClients] = useState([]);

  // Modal open state
  const [showModal, setShowModal] = useState(false);

  // All datasets uploaded
  const [datasets, setDatasets] = useState([]);

  // Saved intelligence views
  const [savedViews, setSavedViews] = useState([]);

  // Active tab for Sidebar
  const [activeTab, setActiveTab] = useState("Exporter");

  // Currently viewed report
  const [viewReport, setViewReport] = useState(null);

  // Sidebar filtered views
  const filteredViews = savedViews.filter((v) => v.baseType === activeTab);

  return (
    <div className="app">
      {/* Sidebar */}
      <Sidebar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        reports={filteredViews}
        onView={setViewReport}
        onDelete={(r) => setSavedViews(savedViews.filter((v) => v !== r))}
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

        {/* Show report table if viewing */}
        {viewReport && (
          <ReportTable
            report={viewReport || { dataset: "", viewType: "BY_VALUE", filters: {} }}
            onBack={() => setViewReport(null)}
          />
        )}

        {/* Add Report / Intelligence View Modal */}
        {showModal && (
          <AddReportModal
            clients={clients}
            datasets={datasets}
            onSave={(newView, newDataset) => {
              // Save new dataset if provided
              if (newDataset) setDatasets([...datasets, newDataset]);

              // Save new intelligence view
              setSavedViews([...savedViews, newView]);

              // Close modal
              setShowModal(false);
            }}
            onClose={() => setShowModal(false)}
          />
        )}
      </div>
    </div>
  );
}

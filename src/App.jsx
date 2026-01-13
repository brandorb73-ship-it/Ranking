import { useState } from "react";
import Sidebar from "./components/Sidebar";
import Header from "./components/Header";
import AddReportModal from "./components/AddReportModal";
import ReportTable from "./components/ReportTable";

export default function App() {
  const [clients, setClients] = useState([]);
  const [datasets, setDatasets] = useState([]); // stores CSV datasets
  const [savedViews, setSavedViews] = useState([]); // stores intelligence views
  const [activeTab, setActiveTab] = useState("Exporter");
  const [viewReport, setViewReport] = useState(null);
  const [showModal, setShowModal] = useState(false);

  // Filter reports for active tab
  const filteredReports = savedViews.filter((r) => r.baseType === activeTab);

  return (
    <div className="app">
      <Sidebar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        reports={filteredReports}
        onView={setViewReport}
        onDelete={(r) =>
          setSavedViews(savedViews.filter((rep) => rep !== r))
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

        {viewReport ? (
          <ReportTable
            report={viewReport}
            onBack={() => setViewReport(null)}
          />
        ) : (
          <div className="placeholder">
            <h3>Select a report or add a new one</h3>
          </div>
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
      </div>
    </div>
  );
}

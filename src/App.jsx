import { useState } from "react";
import Login from "./components/Login";
import Sidebar from "./components/Sidebar";
import Header from "./components/Header";
import AddReportModal from "./components/AddReportModal";
import ReportTable from "./components/ReportTable";

export default function App() {
  const [clients, setClients] = useState([]);
  const [loggedIn, setLoggedIn] = useState(false);

  // PHASE 1: Saved intelligence views
  const [savedViews, setSavedViews] = useState([]);
  const [datasets, setDatasets] = useState([]);

  const [activeTab, setActiveTab] = useState("Exporter");
  const [viewReport, setViewReport] = useState(null);
  const [showModal, setShowModal] = useState(false);

  if (!loggedIn) return <Login onLogin={() => setLoggedIn(true)} />;

  const filteredViews = savedViews.filter(v => v.baseType === activeTab);

  return (
    <div className="app">
      <Sidebar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        reports={filteredViews}
        onView={setViewReport}
        onDelete={(v) => setSavedViews(savedViews.filter(view => view !== v))}
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

   {/* Add Intelligence View Modal */}
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

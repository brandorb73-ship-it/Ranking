import { useState } from "react";
import Login from "./components/Login";
import Sidebar from "./components/Sidebar";
import Header from "./components/Header";
import AddReportModal from "./components/AddReportModal";
import ReportTable from "./components/ReportTable";

export default function App() {
  const [loggedIn, setLoggedIn] = useState(false);
  const [reports, setReports] = useState([]);
  const [activeTab, setActiveTab] = useState("Exporter");
  const [viewReport, setViewReport] = useState(null);
  const [showModal, setShowModal] = useState(false);

  if (!loggedIn) return <Login onLogin={() => setLoggedIn(true)} />;

  // Filter reports by type
  const filteredReports = reports.filter(r => r.type === activeTab);

  return (
    <div className="app">
      <Sidebar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        reports={filteredReports}
        onView={setViewReport}
        onDelete={(r) =>
          setReports(reports.filter(rep => rep !== r))
        }
      />
      <div className="main">
        {!viewReport ? (
          <>
            <Header onAddReport={() => setShowModal(true)} />
          </>
        ) : (
          <div className="back-button-container">
            <button className="btn" onClick={() => setViewReport(null)}>← Back</button>
          </div>
        )}

        {viewReport ? (
          <ReportTable report={viewReport} />
        ) : (
          <div className="placeholder">
            <h3>Select a report or add a new one</h3>
          </div>
        )}

        {showModal && (
          <AddReportModal
            onClose={() => setShowModal(false)}
            onSave={(r) => {
              setReports([...reports, r]);
              setShowModal(false);
            }}
          />
        )}
      </div>
    </div>
  );
}

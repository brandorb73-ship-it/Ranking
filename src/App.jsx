import { useState } from "react";
import Login from "./components/Login";
import Sidebar from "./components/Sidebar";
import Header from "./components/Header";
import ReportTable from "./components/ReportTable";
import AddReportModal from "./components/AddReportModal";

export default function App() {
  const [loggedIn, setLoggedIn] = useState(false);
  const [reports, setReports] = useState([]);
  const [activeReport, setActiveReport] = useState(null);
  const [showModal, setShowModal] = useState(false);

  if (!loggedIn) {
    return <Login onLogin={() => setLoggedIn(true)} />;
  }

  return (
    <div className="app">
      <Sidebar reports={reports} onSelect={setActiveReport} />
      <div className="main">
        <Header onAddReport={() => setShowModal(true)} />
        {activeReport && <ReportTable report={activeReport} />}
      </div>

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
  );
}

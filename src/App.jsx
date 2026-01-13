import { useState } from "react";
import Papa from "papaparse";

import Login from "./components/Login";
import Sidebar from "./components/Sidebar";
import Header from "./components/Header";
import AddReportModal from "./components/AddReportModal";
import ReportTable from "./components/ReportTable";
import ChartDashboard from "./components/ChartDashboard";

export default function App() {
  const [clients, setClients] = useState([]);
  const [loggedIn, setLoggedIn] = useState(false);
  const [savedViews, setSavedViews] = useState([]);
  const [datasets, setDatasets] = useState([]);
  const [activeTab, setActiveTab] = useState("Exporter");
  const [viewReport, setViewReport] = useState(null);
  const [viewMode, setViewMode] = useState("table"); // table / charts / combined
  const [showModal, setShowModal] = useState(false);

  if (!loggedIn) return <Login onLogin={() => setLoggedIn(true)} />;

  // ------------------------
  // Handle view report
  // ------------------------
  const handleViewReport = (report) => {
    // Parse CSV on view
    Papa.parse(report.csv, {
      download: true,
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        const rows = results.data.map((row) => {
          ["Transactions", "Weight(Kg)", "Amount($)", "Quantity"].forEach((k) => {
            if (row[k]) row[k] = Number(String(row[k]).replace(/,/g, "")) || 0;
          });
          return row;
        });

        setViewReport({ ...report, rows }); // store parsed rows
      },
    });
  };

  const filteredReports = savedViews.filter(r => r.baseType === activeTab);

  return (
    <div className="app">
      {/* Sidebar */}
      <Sidebar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        reports={filteredReports}
        onView={handleViewReport}       // parse CSV here
        onDelete={(r) => setSavedViews(savedViews.filter(rep => rep !== r))}
      />

      {/* Main content */}
      <div className="main">
        {!viewReport && (
          <Header
            clients={clients}
            setClients={setClients}
            onAddReport={() => setShowModal(true)}
            viewMode={viewMode}
            setViewMode={setViewMode} // toggle table/charts/combined
          />
        )}

        {/* Table View */}
        {viewReport && viewMode === "table" && (
          <ReportTable
            report={viewReport}
            onBack={() => setViewReport(null)}
          />
        )}

        {/* Charts or Combined */}
        {viewReport && (viewMode === "charts" || viewMode === "combined") && (
          <ChartDashboard
            data={viewReport.rows || []}   // pass parsed rows
            savedView={viewReport}
          />
        )}

        {/* Combined: optionally show table below charts */}
        {viewReport && viewMode === "combined" && viewReport.rows?.length > 0 && (
          <div style={{ marginTop: 30 }}>
            <ReportTable report={viewReport} onBack={() => setViewReport(null)} />
          </div>
        )}

        {/* Add Report Modal */}
<AddReportModal
  clients={clients}
  datasets={datasets}
  onSave={(newView, newDataset) => {
    if (newDataset) setDatasets([...datasets, newDataset]);
    if (newView) setSavedViews([...savedViews, newView]);
    setShowModal(false);
  }}
  onClose={() => setShowModal(false)}
/>
      </div>
    </div>
  );
}
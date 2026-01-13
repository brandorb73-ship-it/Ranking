import { useState, useEffect } from "react";
import Login from "./components/Login";
import Sidebar from "./components/Sidebar";
import Header from "./components/Header";
import AddReportModal from "./components/AddReportModal";
import ReportTable from "./components/ReportTable";
import Papa from "papaparse"; // for CSV parsing

export default function App() {
  const [clients, setClients] = useState([]);
  const [loggedIn, setLoggedIn] = useState(false);

  // Phase 1 state
  const [datasets, setDatasets] = useState([]); // uploaded CSVs
  const [savedViews, setSavedViews] = useState([]); // saved intelligence views
  const [activeTab, setActiveTab] = useState("Exporter"); // Exporter/Importer
  const [activeView, setActiveView] = useState(null); // current saved view
  const [showModal, setShowModal] = useState(false);
  const [tableData, setTableData] = useState([]); // parsed CSV data

  if (!loggedIn) return <Login onLogin={() => setLoggedIn(true)} />;

  // Filter saved views by active tab
  const filteredViews = savedViews.filter(v => v.baseType === activeTab);

  // Load CSV data when activeView changes
  useEffect(() => {
    if (!activeView) return;
    const datasetUrl = activeView.dataset;

    Papa.parse(datasetUrl, {
      download: true,
      header: true,
      complete: function(results) {
        let data = results.data;

        // Apply filters
        if (activeView.filters) {
          if (activeView.filters.country?.length) {
            data = data.filter(row =>
              activeView.filters.country.includes(row.Country)
            );
          }
          if (activeView.filters.minAmount) {
            data = data.filter(row => Number(row.Amount) >= activeView.filters.minAmount);
          }
          if (activeView.filters.maxAmount) {
            data = data.filter(row => Number(row.Amount) <= activeView.filters.maxAmount);
          }
        }

        // Apply sorting based on viewType
        switch (activeView.viewType) {
          case "BY_VALUE":
            data.sort((a,b) => Number(b.Amount) - Number(a.Amount));
            break;
          case "BY_WEIGHT":
            data.sort((a,b) => Number(b.Weight) - Number(a.Weight));
            break;
          case "BY_TXNS":
            data.sort((a,b) => Number(b.Transactions) - Number(a.Transactions));
            break;
          case "BY_COUNTRY":
            data.sort((a,b) => a.Country.localeCompare(b.Country));
            break;
          default:
            break;
        }

        // Add Phase 1-lite risk flags
        data = data.map(row => {
          const flags = [];
          if(Number(row.Weight) > 10000 && Number(row.Amount) < 5000) flags.push("⚠ Under-valued");
          if(Number(row.Transactions) > 100) flags.push("⚠ Structuring");
          if(Number(row.CountryPercent) > 80) flags.push("⚠ Concentration");
          return { ...row, RiskFlags: flags.join(", ") };
        });

        setTableData(data);
      },
      error: function(err) {
        console.error("Error loading CSV:", err);
        setTableData([]);
      }
    });
  }, [activeView]);

  return (
    <div className="app">
      {/* Sidebar shows Saved Intelligence Views */}
      <Sidebar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        savedViews={filteredViews}
        onView={setActiveView}
        onDelete={(view) => setSavedViews(savedViews.filter(v => v !== view))}
      />

      <div className="main">
        {!activeView && (
          <Header
            clients={clients}
            setClients={setClients}
            onAddReport={() => setShowModal(true)}
          />
        )}

        {activeView ? (
          <ReportTable report={activeView} data={tableData} />
        ) : (
          <div className="placeholder">
            <h3>Select a saved intelligence view or add a new report</h3>
          </div>
        )}

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

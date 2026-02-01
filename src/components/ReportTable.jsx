import { useEffect, useState } from "react";
import Papa from "papaparse";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import ChartDashboard from "./ChartDashboard";

export default function ReportTable({ report, onBack }) {
  const [rows, setRows] = useState([]);
  const [filter, setFilter] = useState({});
  const [activeTab, setActiveTab] = useState("Table");
  const [isExporting, setIsExporting] = useState(false); // Track PDF status

  const formatValue = (v, header = "") => {
    if (v === null || v === undefined || isNaN(v)) return "0";
    const h = header.toLowerCase();
    const isInt = h.includes("qty") || h.includes("txn") || h.includes("count");
    return Number(v).toLocaleString(undefined, {
      minimumFractionDigits: isInt ? 0 : 2,
      maximumFractionDigits: isInt ? 0 : 2,
    });
  };

  useEffect(() => {
    console.log("Stage 1: Report Object Received", report);
    if (!report) return;

    const csvSource = report.csv && report.csv.trim() !== "" ? report.csv : "";
    const isUrl = report.csv && report.csv.trim().startsWith("http");

    Papa.parse(csvSource, {
      download: isUrl,
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        console.log("Stage 2: PapaParse Complete", results.data.length, "rows found");
        
        const cleanedData = results.data.map((row, idx) => {
          const nameKey = Object.keys(row).find(k => 
            /exporter|vendor|seller|shipper|entity|company|name/i.test(k)
          );
          
          row._label = row[nameKey] || "Unknown";
          row._uid = `row-${idx}-${row._label}`;

          Object.keys(row).forEach((key) => {
            const isNumericKey = /amount|weight|price|quantity|qty|transactions|txns|value/i.test(key) || key.includes("$");
            if (isNumericKey && row[key] !== null) {
              const cleanNum = String(row[key]).replace(/[$,]/g, "");
              row[key] = !isNaN(cleanNum) && cleanNum !== "" ? Number(cleanNum) : row[key];
            }
          });
          return row;
        });
        
        setRows(cleanedData);
      },
      error: (err) => console.error("Stage 2 Error: PapaParse Failed", err)
    });
  }, [report]);

  const filteredRows = rows.filter((r) =>
    Object.entries(filter).every(([k, v]) => !v || String(r[k]).toLowerCase().includes(v.toLowerCase()))
  );

  const total = (key) => filteredRows.reduce((sum, r) => sum + (Number(r[key]) || 0), 0);

  const exportPDF = () => {
    const el = document.getElementById("report-table-full-export");
    if (!el) return;
    
    setIsExporting(true); // Start loading

    html2canvas(el, { 
      scale: 2, 
      useCORS: true,
      logging: false 
    }).then((canvas) => {
      const imgData = canvas.toDataURL("image/png");
      const pdf = new jsPDF("l", "pt", "a4");
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
      
      pdf.addImage(imgData, "PNG", 0, 0, pdfWidth, pdfHeight);
      pdf.save(`${report.title || "Trade_Report"}.pdf`);
      setIsExporting(false); // Stop loading
    }).catch(err => {
      console.error("PDF Export failed", err);
      setIsExporting(false);
    });
  };

  if (!rows.length) {
    return (
      <div style={{ padding: '100px', textAlign: 'center', background: '#f8fafc' }}>
        <h3 style={{ color: '#1e3a8a' }}>Initializing Trade Engine...</h3>
        <p style={{ color: '#64748b' }}>If this takes too long, check the CSV format or the console logs.</p>
        <button onClick={onBack} style={{ marginTop: '20px', padding: '10px 20px', cursor: 'pointer' }}>← Go Back</button>
      </div>
    );
  }

  const columnHeaders = Object.keys(rows[0]).filter(h => !["_label", "_uid"].includes(h));

  return (
    /* Added id here for the PDF selector */
    <div id="report-table-full-export" style={{ background: '#f1f5f9', minHeight: '100vh', fontFamily: 'sans-serif' }}>
      
      {/* 3-TAB NAVIGATION BAR */}
      <div style={{ background: '#1e3a8a', padding: '12px 24px', display: 'flex', gap: '12px', alignItems: 'center', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
        <h3 style={{ color: '#fff', margin: '0 30px 0 0', fontSize: '20px' }}>TradeInsight Pro</h3>
        {["Table", "Charts", "Combined"].map(tab => (
          <button 
            key={tab}
            onClick={() => setActiveTab(tab)}
            style={{
              padding: '8px 24px', cursor: 'pointer', border: 'none', borderRadius: '6px',
              background: activeTab === tab ? '#fff' : 'rgba(255,255,255,0.15)',
              color: activeTab === tab ? '#1e3a8a' : '#fff', fontWeight: 'bold',
              transition: 'all 0.2s ease'
            }}
          >
            {tab}
          </button>
        ))}

        {/* NEW PDF EXPORT BUTTON */}
        <button 
          onClick={exportPDF} 
          disabled={isExporting}
          style={{ 
            marginLeft: 'auto', 
            background: isExporting ? '#64748b' : '#059669', 
            color: '#fff', 
            border: 'none', 
            padding: '8px 20px', 
            borderRadius: '6px', 
            cursor: isExporting ? 'not-allowed' : 'pointer', 
            fontWeight: 'bold',
            transition: 'background 0.3s'
          }}
        >
          {isExporting ? "Generating..." : "Export PDF"}
        </button>

        <button onClick={onBack} style={{ marginLeft: '12px', background: 'transparent', color: '#fff', border: '1px solid #fff', padding: '6px 16px', borderRadius: '4px', cursor: 'pointer' }}>Exit Report</button>
      </div>

      <div style={{ padding: '24px' }}>
        
        {/* CHART VIEW */}
        {(activeTab === "Charts" || activeTab === "Combined") && (
          <ChartDashboard rows={rows} filteredRows={filteredRows} />
        )}

        {/* TABLE VIEW */}
        {(activeTab === "Table" || activeTab === "Combined") && (
          <div style={{ background: '#fff', padding: '24px', borderRadius: '12px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)', marginTop: activeTab === "Combined" ? '24px' : '0' }}>
            <h3 style={{ color: '#1e3a8a', marginBottom: '20px' }}>Detailed Transaction Records</h3>
            <div style={{ overflowX: 'auto', border: '1px solid #e2e8f0', borderRadius: '8px' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                <thead>
                  <tr style={{ background: '#1e3a8a', color: '#ffffff' }}>
                    {columnHeaders.map((h) => (
                      <th key={h} style={{ padding: '14px', border: '1px solid #1e40af', textAlign: 'left' }}>
                        <div style={{ fontWeight: 'bold', marginBottom: '8px' }}>{h}</div>
                        <select 
                          style={{ width: '100%', padding: '6px', fontSize: '11px', border: 'none', borderRadius: '4px' }}
                          onChange={(e) => setFilter({...filter, [h]: e.target.value})}
                          value={filter[h] || ""}
                        >
                          <option value="">All {h}</option>
                          {[...new Set(rows.map(r => r[h]).filter(Boolean))].slice(0, 50).map(v => (
                            <option key={v} value={v}>{v}</option>
                          ))}
                        </select>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filteredRows.map((r, idx) => (
                    <tr key={r._uid} style={{ borderBottom: '1px solid #e2e8f0', background: idx % 2 === 0 ? '#ffffff' : '#f8fafc' }}>
                      {columnHeaders.map((h) => (
                        <td key={h} style={{ padding: '12px', borderRight: '1px solid #f1f5f9' }}>
                          {typeof r[h] === "number" ? formatValue(r[h], h) : r[h]}
                        </td>
                      ))}
                    </tr>
                  ))}
                  <tr style={{ background: '#f1f5f9', fontWeight: 'bold', color: '#1e3a8a' }}>
                    {columnHeaders.map((h, i) => (
                      <td key={`tot-${h}`} style={{ padding: '14px' }}>
                        {i === 0 ? "TOTALS" : (typeof rows[0][h] === "number" ? formatValue(total(h), h) : "")}
                      </td>
                    ))}
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
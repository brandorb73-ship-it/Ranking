import { useEffect, useState, useRef } from "react";
import Papa from "papaparse";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import ChartDashboard from "./ChartDashboard";

export default function ReportTable({ report, onBack }) {
  const [rows, setRows] = useState([]);
  const [filter, setFilter] = useState({});
  const [activeTab, setActiveTab] = useState("Table");
  const [isExporting, setIsExporting] = useState(false);
  const [reportTitle, setReportTitle] = useState(report?.title || "Trade Analysis Report");
  const [openFilter, setOpenFilter] = useState(null);

  const [logo, setLogo] = useState(null);
  const [showLogo, setShowLogo] = useState(true);
  const fileInputRef = useRef(null);

  // --- 1. DATA INTEGRITY: CLEAN NUMERICS ON INGESTION ---
  const cleanNumericValue = (val) => {
    if (val === null || val === undefined) return 0;
    // Remove symbols and commas so Math functions don't return NaN
    const cleanNum = String(val).replace(/[$,]/g, "");
    return !isNaN(cleanNum) && cleanNum !== "" ? Number(cleanNum) : 0;
  };

  const formatValue = (v, header = "") => {
    if (v === null || v === undefined || isNaN(v)) return "0";
    const h = header.toLowerCase();
    const isInt = h.includes("qty") || h.includes("quantity") || h.includes("txn") || h.includes("transaction") || h.includes("count");
    return Number(v).toLocaleString(undefined, {
      minimumFractionDigits: isInt ? 0 : 2,
      maximumFractionDigits: isInt ? 0 : 2,
    });
  };

  const handleLogoUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (en) => setLogo(en.target.result);
      reader.readAsDataURL(file);
    }
  };

  useEffect(() => {
    if (!report) return;
    const csvSource = report.csv && report.csv.trim() !== "" ? report.csv : "";
    const isUrl = report.csv && report.csv.trim().startsWith("http");

    Papa.parse(csvSource, {
      download: isUrl,
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        const cleanedData = results.data.map((row, idx) => {
          const nameKey = Object.keys(row).find(k => /exporter|vendor|seller|shipper|entity|company|name/i.test(k));
          row._label = row[nameKey] || "Unknown";
          row._uid = `row-${idx}-${row._label}`;
          
          Object.keys(row).forEach((key) => {
            const isNumericKey = /amount|weight|price|quantity|qty|transactions|txns|value/i.test(key) || key.includes("$");
            if (isNumericKey) {
              row[key] = cleanNumericValue(row[key]);
            }
          });
          return row;
        });
        setRows(cleanedData);
      }
    });
  }, [report]);

  const filteredRows = rows.filter((r) =>
    Object.entries(filter).every(([k, v]) => !v || v.length === 0 || v.includes(String(r[k])))
  );

  const toggleFilterValue = (header, value) => {
    const current = filter[header] || [];
    const next = current.includes(value) ? current.filter(v => v !== value) : [...current, value];
    setFilter({ ...filter, [header]: next });
  };

  const total = (key) => filteredRows.reduce((sum, r) => sum + (Number(r[key]) || 0), 0);

  // --- 2. PDF STRATEGY: COMPONENT STAMPING & BRANDING CONTROL ---
  const exportPDF = async () => {
    const el = document.getElementById("report-content-area");
    if (!el) return;
    
    setOpenFilter(null);
    setIsExporting(true);

    const pdf = new jsPDF("l", "pt", "a4");
    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = pdf.internal.pageSize.getHeight();
    const margin = 40;

    // Stamp Branding directly onto PDF coordinates
    const stampHeader = (pdfInstance, pageNum) => {
      let currentY = 30;
      if (logo && showLogo) {
        pdfInstance.addImage(logo, 'PNG', margin, 20, 60, 30);
        currentY = 70;
      }
      pdfInstance.setFontSize(18);
      pdfInstance.setTextColor(30, 58, 138); // #1e3a8a
      pdfInstance.text(reportTitle, margin, currentY);
      
      pdfInstance.setFontSize(10);
      pdfInstance.setTextColor(100);
      pdfInstance.text(`Page ${pageNum}`, pdfWidth - margin - 40, pdfHeight - 20);
      return currentY + 20; // Return Y where table content should start
    };

    try {
      const canvas = await html2canvas(el, {
        scale: 2,
        useCORS: true,
        windowWidth: 1200,
      });

      const imgData = canvas.toDataURL("image/png");
      const imgWidth = pdfWidth; 
      const imgHeight = (canvas.height * pdfWidth) / canvas.width;
      
      let heightLeft = imgHeight;
      let position = 0;
      let pageNum = 1;

      // Start rendering
      const contentStart = stampHeader(pdf, pageNum);
      const pageCapacity = pdfHeight - contentStart - 40; 

      pdf.addImage(imgData, 'PNG', 0, contentStart, imgWidth, imgHeight);
      heightLeft -= pageCapacity;

      while (heightLeft > 0) {
        pdf.addPage();
        pageNum++;
        position = heightLeft - imgHeight;
        const startY = stampHeader(pdf, pageNum);
        // Stamp image with offset to show the next "chunk"
        pdf.addImage(imgData, 'PNG', 0, position + startY, imgWidth, imgHeight);
        heightLeft -= (pdfHeight - startY - 40);
      }

      pdf.save(`${reportTitle.replace(/\s+/g, '_')}.pdf`);
    } catch (err) {
      console.error("PDF Export Error:", err);
    } finally {
      setIsExporting(false);
    }
  };

  if (!rows.length) return <div style={{ padding: '100px', textAlign: 'center' }}>Initializing Report Data...</div>;
  const columnHeaders = Object.keys(rows[0]).filter(h => !["_label", "_uid"].includes(h));

  return (
    <div id="report-table-full-export" style={{ background: '#f1f5f9', minHeight: '100vh', fontFamily: 'sans-serif' }}>
      <style>{`
        .editable-report-title:focus { border-bottom: 2px solid #1e3a8a !important; outline: none; }
        .export-hidden { display: ${isExporting ? 'none' : 'flex'}; }
        .header-cell:hover { background: #1e40af; }
        .checkbox-row:hover { background: #f1f5f9; }
        tr { page-break-inside: avoid; }
      `}</style>

      {/* TOP NAV BAR - EXCLUDED FROM PDF */}
      <div className="export-hidden" style={{ background: '#1e3a8a', padding: '12px 24px', gap: '12px', alignItems: 'center', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
        <h3 style={{ color: '#fff', margin: '0 20px 0 0', fontSize: '18px' }}>TradeInsight Pro</h3>
        
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center', borderRight: '1px solid rgba(255,255,255,0.2)', paddingRight: '15px', marginRight: '5px' }}>
          <input type="file" ref={fileInputRef} onChange={handleLogoUpload} style={{ display: 'none' }} accept="image/*" />
          <button onClick={() => fileInputRef.current.click()} style={{ background: 'rgba(255,255,255,0.1)', color: '#fff', border: '1px solid #fff', padding: '6px 12px', borderRadius: '4px', cursor: 'pointer', fontSize: '12px' }}>
            {logo ? "Change Logo" : "Upload Logo"}
          </button>
          {logo && (
            <button onClick={() => setShowLogo(!showLogo)} style={{ background: showLogo ? '#f59e0b' : '#64748b', color: '#fff', border: 'none', padding: '6px 12px', borderRadius: '4px', cursor: 'pointer', fontSize: '12px' }}>
              {showLogo ? "Hide Logo" : "Show Logo"}
            </button>
          )}
        </div>

        <div style={{ display: 'flex', gap: '8px' }}>
          {["Table", "Charts", "Combined"].map(tab => (
            <button key={tab} onClick={() => setActiveTab(tab)} style={{
              padding: '8px 20px', cursor: 'pointer', border: 'none', borderRadius: '6px',
              background: activeTab === tab ? '#fff' : 'rgba(255,255,255,0.15)',
              color: activeTab === tab ? '#1e3a8a' : '#fff', fontWeight: 'bold', fontSize: '13px'
            }}>{tab}</button>
          ))}
        </div>

        <button onClick={exportPDF} disabled={isExporting} style={{ marginLeft: 'auto', background: isExporting ? '#64748b' : '#059669', color: '#fff', border: 'none', padding: '8px 20px', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}>
          {isExporting ? "Processing PDF..." : "Export Multi-Page PDF"}
        </button>
        <button onClick={onBack} style={{ background: 'transparent', color: '#fff', border: '1px solid #fff', padding: '6px 16px', borderRadius: '4px' }}>Exit</button>
      </div>

      {/* RENDER AREA FOR PDF */}
      <div id="report-content-area" style={{ padding: '24px' }}>
        
        {/* On-screen Logo (stamped separately in PDF) */}
        {logo && showLogo && !isExporting && (
          <div style={{ marginBottom: '20px' }}>
            <img src={logo} alt="Logo" style={{ maxHeight: '60px', width: 'auto' }} />
          </div>
        )}

        <div style={{ marginBottom: '20px', background: '#fff', padding: '20px 24px', borderRadius: '12px', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}>
          <h1 className="editable-report-title" contentEditable={!isExporting} suppressContentEditableWarning={true} onBlur={(e) => setReportTitle(e.target.innerText)}
            style={{ fontSize: '28px', fontWeight: 'bold', color: '#1e3a8a', margin: 0, display: 'inline-block', borderBottom: isExporting ? 'none' : '2px solid transparent', minWidth: '200px' }}>
            {reportTitle}
          </h1>
        </div>

        {(activeTab === "Charts" || activeTab === "Combined") && <ChartDashboard rows={rows} filteredRows={filteredRows} />}

        {(activeTab === "Table" || activeTab === "Combined") && (
          <div style={{ background: '#fff', padding: '24px', borderRadius: '12px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)', marginTop: activeTab === "Combined" ? '24px' : '0' }}>
            <h3 style={{ color: '#1e3a8a', marginBottom: '20px' }}>Detailed Transaction Records</h3>
            <div style={{ overflowX: 'auto', border: '1px solid #e2e8f0', borderRadius: '8px' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                <thead>
                  <tr style={{ background: '#1e3a8a', color: '#ffffff' }}>
                    {columnHeaders.map((h) => (
                      <th key={h} className="header-cell" style={{ position: 'relative', padding: '14px', border: '1px solid #1e40af', textAlign: 'left', cursor: 'pointer' }} onClick={() => setOpenFilter(openFilter === h ? null : h)}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
                          <span style={{ fontWeight: 'bold' }}>{h}</span>
                          {!isExporting && <span className="filter-indicator" style={{ fontSize: '10px' }}>{filter[h]?.length > 0 ? `▼ (${filter[h].length})` : '▼'}</span>}
                        </div>
                        {openFilter === h && !isExporting && (
                          <div className="export-hidden" style={{ position: 'absolute', top: '100%', left: 0, zIndex: 100, background: '#fff', color: '#333', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)', borderRadius: '4px', minWidth: '200px', padding: '10px', border: '1px solid #e2e8f0' }} onClick={(e) => e.stopPropagation()}>
                            <div style={{ maxHeight: '200px', overflowY: 'auto', marginBottom: '10px' }}>
                              {[...new Set(rows.map(r => String(r[h])).filter(Boolean))].sort().map(val => (
                                <label key={val} className="checkbox-row" style={{ display: 'flex', alignItems: 'center', padding: '6px', cursor: 'pointer', fontSize: '12px', borderBottom: '1px solid #f8fafc' }}>
                                  <input type="checkbox" checked={(filter[h] || []).includes(val)} onChange={() => toggleFilterValue(h, val)} style={{ marginRight: '10px' }} />
                                  <span style={{ whiteSpace: 'nowrap' }}>{val}</span>
                                </label>
                              ))}
                            </div>
                            <div style={{ display: 'flex', gap: '8px' }}>
                                <button onClick={() => setFilter({...filter, [h]: []})} style={{ flex: 1, background: '#f1f5f9', border: 'none', padding: '8px', borderRadius: '4px', cursor: 'pointer', fontSize: '11px' }}>Clear</button>
                                <button onClick={() => setOpenFilter(null)} style={{ flex: 1, background: '#1e3a8a', color: '#fff', border: 'none', padding: '8px', borderRadius: '4px', cursor: 'pointer', fontSize: '11px', fontWeight: 'bold' }}>Apply</button>
                            </div>
                          </div>
                        )}
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
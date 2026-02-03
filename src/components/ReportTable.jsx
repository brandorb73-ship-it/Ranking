

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
    Papa.parse(report.csv || "", {
      download: report.csv?.startsWith("http"),
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        const cleanedData = results.data.map((row, idx) => {
          // IMPROVED DETECTION: Look for Importer first if it's an Importer report,
          // or generally find the first column that looks like a Company Name.
          const keys = Object.keys(row);
          const nameKey = keys.find(k => /importer|consignee/i.test(k)) ||
                          keys.find(k => /exporter|vendor|seller|shipper/i.test(k)) ||
                          keys.find(k => /entity|company|name/i.test(k));
         
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
      }
    });
  }, [report]);


  const toggleFilterValue = (header, value) => {
    const current = filter[header] || [];
    const next = current.includes(value) ? current.filter(v => v !== value) : [...current, value];
    setFilter({ ...filter, [header]: next });
  };


  const total = (key) => filteredRows.reduce((sum, r) => sum + (Number(r[key]) || 0), 0);


  const exportPDF = async () => {
    setIsExporting(true);
    setOpenFilter(null);


    const pdf = new jsPDF("l", "pt", "a4");
    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = pdf.internal.pageSize.getHeight();
    const margin = 40;
    const contentWidth = pdfWidth - (margin * 2);


    const stampHeader = (doc, pageNum) => {
      let yPos = 35;
      if (logo && showLogo) {
        doc.addImage(logo, 'PNG', margin, 20, 0, 30);
        yPos = 75;
      }
      doc.setFontSize(18);
      doc.setTextColor(30, 58, 138);
      doc.text(reportTitle, margin, yPos);
      doc.setFontSize(9);
      doc.setTextColor(150);
      doc.text(`Page ${pageNum}`, pdfWidth - margin - 30, pdfHeight - 20);
      return yPos + 20;
    };


    try {
      let currentY = stampHeader(pdf, 1);
      const sections = [];
      if (activeTab === "Charts" || activeTab === "Combined") sections.push(document.getElementById("chart-dash"));
      if (activeTab === "Table" || activeTab === "Combined") sections.push(document.getElementById("table-container"));


      for (const section of sections) {
        if (!section) continue;
        const canvas = await html2canvas(section, { scale: 2, useCORS: true, logging: false });
        const imgData = canvas.toDataURL("image/png");
        const imgHeightInPdf = (canvas.height * contentWidth) / canvas.width;
       
        let remainingHeight = imgHeightInPdf;
        let canvasOffset = 0;


        while (remainingHeight > 0) {
          const availableSpace = pdfHeight - currentY - 60;
          const sliceHeight = Math.min(remainingHeight, availableSpace);


          pdf.addImage(imgData, 'PNG', margin, currentY - canvasOffset, contentWidth, imgHeightInPdf, undefined, 'FAST');
         
          pdf.setFillColor(241, 245, 249);
          pdf.rect(0, 0, pdfWidth, currentY - 5, 'F');
          stampHeader(pdf, pdf.internal.getNumberOfPages());


          remainingHeight -= sliceHeight;
          if (remainingHeight > 0) {
            pdf.addPage();
            canvasOffset += sliceHeight;
            currentY = stampHeader(pdf, pdf.internal.getNumberOfPages());
          } else {
            currentY += sliceHeight + 20;
          }
        }
      }
      pdf.save(`${reportTitle.replace(/\s+/g, '_')}.pdf`);
    } catch (err) {
      console.error(err);
    } finally {
      setIsExporting(false);
    }
  };


  const filteredRows = rows.filter((r) =>
    Object.entries(filter).every(([k, v]) => !v || v.length === 0 || v.includes(String(r[k])))
  );


  if (!rows.length) return <div style={{ padding: '100px', textAlign: 'center' }}>Loading Data...</div>;
  const columnHeaders = Object.keys(rows[0]).filter(h => !["_label", "_uid"].includes(h));


  return (
    <div style={{ background: '#f1f5f9', minHeight: '100vh', fontFamily: 'sans-serif' }}>
      <div className="export-hidden" style={{ background: '#1e3a8a', padding: '12px 24px', display: 'flex', gap: '12px', alignItems: 'center' }}>
        <button onClick={onBack} style={{ background: 'transparent', color: '#fff', border: '1px solid #fff', padding: '6px 12px', borderRadius: '4px', cursor: 'pointer', fontSize: '12px' }}>← Back</button>
       
        <input
          value={reportTitle}
          onChange={(e) => setReportTitle(e.target.value)}
          style={{ background: 'transparent', color: '#fff', border: 'none', borderBottom: '1px solid #3b82f6', fontSize: '16px', outline: 'none', width: '250px', marginLeft: '10px' }}
        />


        <input type="file" ref={fileInputRef} onChange={handleLogoUpload} style={{ display: 'none' }} accept="image/*" />
        <button onClick={() => fileInputRef.current.click()} style={{ background: '#fff', border: 'none', padding: '6px 12px', borderRadius: '4px', cursor: 'pointer', fontSize: '12px', marginLeft: '10px' }}>Logo</button>
       
        {logo && (
          <button onClick={() => setShowLogo(!showLogo)} style={{ background: showLogo ? '#f59e0b' : '#64748b', color: '#fff', border: 'none', padding: '6px 12px', borderRadius: '4px', cursor: 'pointer', fontSize: '12px' }}>
            {showLogo ? "Hide Logo" : "Show Logo"}
          </button>
        )}


        <div style={{ display: 'flex', gap: '5px', marginLeft: '10px' }}>
          {["Table", "Charts", "Combined"].map(tab => (
            <button key={tab} onClick={() => setActiveTab(tab)} style={{ padding: '7px 14px', borderRadius: '4px', border: 'none', background: activeTab === tab ? '#fff' : '#3b82f6', color: activeTab === tab ? '#1e3a8a' : '#fff', cursor: 'pointer', fontSize: '12px', fontWeight: 'bold' }}>{tab}</button>
          ))}
        </div>
        <button onClick={exportPDF} disabled={isExporting} style={{ marginLeft: 'auto', background: '#059669', color: '#fff', padding: '8px 20px', borderRadius: '4px', border: 'none', cursor: 'pointer', fontWeight: 'bold' }}>
          {isExporting ? "Rendering PDF..." : "Export Multi-Page PDF"}
        </button>
      </div>


      <div style={{ padding: '24px' }}>
        {!isExporting && (
          <div style={{ marginBottom: '20px' }}>
            {logo && showLogo && <img src={logo} alt="Logo" style={{ maxHeight: '50px', display: 'block', marginBottom: '10px' }} />}
            <h1 style={{ color: '#1e3a8a', margin: 0, fontSize: '24px' }}>{reportTitle}</h1>
          </div>
        )}


       <div
  id="chart-dash"
  style={{
    background: '#f1f5f9',
    padding: isExporting ? '30px' : '0px', // Adds buffer room only during PDF generation
    borderRadius: '8px'
  }}
>
  {(activeTab === "Charts" || activeTab === "Combined") && (
    <ChartDashboard rows={rows} filteredRows={filteredRows} />
  )}
</div>




        <div id="table-container" style={{ background: '#fff', padding: '20px', borderRadius: '8px', marginTop: '20px' }}>
          {(activeTab === "Table" || activeTab === "Combined") && (
            <>
              <h3 style={{ color: '#1e3a8a', marginTop: 0, marginBottom: '15px' }}>Ranking Report</h3>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                <thead>
                  <tr style={{ background: '#1e3a8a', color: '#fff' }}>
                    {columnHeaders.map(h => (
                      <th key={h} style={{ padding: '10px', border: '1px solid #1e40af', textAlign: 'left', position: 'relative', cursor: 'pointer' }} onClick={() => setOpenFilter(openFilter === h ? null : h)}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span>{h}</span>
                          <span style={{ fontSize: '10px' }}>{filter[h]?.length > 0 ? `(${filter[h].length})` : '▼'}</span>
                        </div>
                        {openFilter === h && (
                          <div className="export-hidden" style={{ position: 'absolute', top: '100%', left: 0, background: '#fff', color: '#333', padding: '10px', border: '1px solid #ddd', zIndex: 100, minWidth: '180px', fontWeight: 'normal' }} onClick={(e) => e.stopPropagation()}>
                            <div style={{ maxHeight: '180px', overflowY: 'auto', fontSize: '11px' }}>
                              {[...new Set(rows.map(r => String(r[h])))].sort().map(val => (
                                <label key={val} style={{ display: 'flex', alignItems: 'center', padding: '4px' }}>
                                  <input type="checkbox" checked={(filter[h] || []).includes(val)} onChange={() => toggleFilterValue(h, val)} />
                                  <span style={{ marginLeft: '6px' }}>{val}</span>
                                </label>
                              ))}
                            </div>
                            <div style={{ display: 'flex', gap: '5px', marginTop: '10px' }}>
                              <button onClick={() => setFilter({...filter, [h]: []})} style={{ flex: 1, fontSize: '10px', padding: '4px' }}>Clear</button>
                              <button onClick={() => setOpenFilter(null)} style={{ flex: 1, background: '#1e3a8a', color: '#fff', fontSize: '10px', padding: '4px' }}>Apply</button>
                            </div>
                          </div>
                        )}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filteredRows.map((r, i) => (
                    <tr key={r._uid} style={{ background: i % 2 === 0 ? '#fff' : '#f8fafc' }}>
                      {columnHeaders.map(h => <td key={h} style={{ padding: '8px', border: '1px solid #eee' }}>{typeof r[h] === 'number' ? formatValue(r[h], h) : r[h]}</td>)}
                    </tr>
                  ))}
                  <tr style={{ background: '#f1f5f9', fontWeight: 'bold' }}>
                    {columnHeaders.map((h, i) => <td key={i} style={{ padding: '10px' }}>{i === 0 ? "TOTALS" : (typeof rows[0][h] === "number" ? formatValue(total(h), h) : "")}</td>)}
                  </tr>
                </tbody>
              </table>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

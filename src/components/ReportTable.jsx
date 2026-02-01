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

  // Numeric cleaning logic to prevent NaN in Charts/Math
  const cleanNumericValue = (val) => {
    if (val === null || val === undefined) return 0;
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

  const total = (key) => filteredRows.reduce((sum, r) => sum + (Number(r[key]) || 0), 0);

  // --- PDF EXPORT LOGIC WITH COMPONENT STAMPING ---
  const exportPDF = async () => {
    const el = document.getElementById("report-table-full-export");
    if (!el) return;
    
    setIsExporting(true);
    setOpenFilter(null);

    const pdf = new jsPDF("l", "pt", "a4");
    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = pdf.internal.pageSize.getHeight();
    const margin = 40;

    // Helper: Stamping Branding on every page
    const stampHeader = (pdfInstance, pageNum) => {
      if (logo && showLogo) {
        pdfInstance.addImage(logo, 'PNG', margin, 20, 60, 30); // x, y, w, h
      }
      pdfInstance.setFontSize(18);
      pdfInstance.setTextColor(30, 58, 138); // #1e3a8a
      pdfInstance.text(reportTitle, margin, (logo && showLogo) ? 70 : 40);
      
      pdfInstance.setFontSize(10);
      pdfInstance.setTextColor(100);
      pdfInstance.text(`Page ${pageNum}`, pdfWidth - margin - 40, pdfHeight - 20);
    };

    try {
      const canvas = await html2canvas(el, {
        scale: 2,
        useCORS: true,
        logging: false,
        ignoreElements: (node) => node.classList.contains('export-hidden')
      });

      const imgData = canvas.toDataURL("image/png");
      const imgProps = pdf.getImageProperties(imgData);
      const imgHeight = (imgProps.height * pdfWidth) / imgProps.width;
      
      let heightLeft = imgHeight;
      let position = 0;
      let pageNum = 1;

      // First Page
      stampHeader(pdf, pageNum);
      const contentOffset = (logo && showLogo) ? 80 : 50;
      pdf.addImage(imgData, 'PNG', 0, contentOffset, pdfWidth, imgHeight);
      
      heightLeft -= (pdfHeight - contentOffset);

      // Multi-page Loop
      while (heightLeft > 0) {
        pdf.addPage();
        pageNum++;
        position = heightLeft - imgHeight;
        stampHeader(pdf, pageNum);
        // We use a negative position to "scroll" the long image through the page window
        pdf.addImage(imgData, 'PNG', 0, position + contentOffset, pdfWidth, imgHeight);
        heightLeft -= (pdfHeight - contentOffset);
      }

      pdf.save(`${reportTitle.replace(/\s+/g, '_')}.pdf`);
    } catch (err) {
      console.error("PDF Export Error:", err);
    } finally {
      setIsExporting(false);
    }
  };

  // Remaining UI code (Table/Charts) continues below...
  // (Include your return statement and the rest of the component here)
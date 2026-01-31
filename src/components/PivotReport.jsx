import { useMemo, useState, useRef } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ResponsiveContainer,
  LineChart,
  Line,
  CartesianGrid,
} from "recharts";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";

// -------------------- HELPERS --------------------
function formatNumber(value, decimals = 2) {
  if (value == null) return "-";
  return Number(value).toLocaleString(undefined, {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

function buildPivot(rows, pivotBy = "PRODUCT", measure = "Amount($)") {
  const pivotMap = {};
  rows.forEach((r) => {
    const key = r[pivotBy] || "Unknown";
    if (!pivotMap[key]) {
      pivotMap[key] = {
        [pivotBy]: key,
        Export: 0,
        Import: 0,
        Country: r.Country || "Unknown",
        PRODUCT: r.PRODUCT || "Unknown",
        ...("Entity" in r ? { Entity: r.Entity } : {}),
        ...("Date" in r ? { Date: r.Date } : {}),
      };
    }
    const type = r.Type?.toLowerCase() === "export" ? "Export" : "Import";
    pivotMap[key][type] += Number(r[measure] || 0);
  });

  return Object.values(pivotMap).map((r) => {
    const grandTotal = r.Export + r.Import;
    const difference = Math.abs(r.Export - r.Import);
    const importPercent = grandTotal ? (r.Import / grandTotal) * 100 : 0;
    const exportPercent = grandTotal ? (r.Export / grandTotal) * 100 : 0;
    return {
      ...r,
      "Grand Total": grandTotal,
      Difference: difference,
      "Import %": importPercent,
      "Export %": exportPercent,
    };
  });
}

function downloadCSV(data, filename = "pivot_export.csv") {
  if (!data || !data.length) return;
  const headers = Object.keys(data[0]);
  const csvContent =
    [headers.join(",")]
      .concat(data.map((row) => headers.map((h) => row[h]).join(",")))
      .join("\n");
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.setAttribute("download", filename);
  link.click();
}

// -------------------- COMPONENT --------------------
export default function PivotReport({ rows = [], reportName = "Pivot Report" }) {
  const [pivotBy, setPivotBy] = useState("PRODUCT");
  const [measure, setMeasure] = useState("Amount($)");
  const [sortField, setSortField] = useState("Grand Total");
  const [sortDesc, setSortDesc] = useState(true);
  const [filters, setFilters] = useState({ PRODUCT: "All", Country: "All" });
  const [editableTitle, setEditableTitle] = useState(reportName);
  const topN = 5;
  const reportRef = useRef(null);

  // -------------------- PIVOT DATA --------------------
  const pivot = useMemo(() => buildPivot(rows, pivotBy, measure), [rows, pivotBy, measure]);

  const filteredPivot = useMemo(() => {
    return pivot.filter(
      (r) =>
        (filters.PRODUCT === "All" || r.PRODUCT === filters.PRODUCT) &&
        (filters.Country === "All" || r.Country === filters.Country)
    );
  }, [pivot, filters]);

  const sortedPivot = useMemo(() => {
    return [...filteredPivot].sort((a, b) => {
      const va = a[sortField] ?? 0;
      const vb = b[sortField] ?? 0;
      return sortDesc ? vb - va : va - vb;
    });
  }, [filteredPivot, sortField, sortDesc]);

  const totalRow = useMemo(() => {
    return sortedPivot.slice(0, topN).reduce(
      (acc, r) => {
        acc.Export += r.Export;
        acc.Import += r.Import;
        acc["Grand Total"] += r["Grand Total"];
        acc.Difference += r.Difference;
        acc["Import %"] += r["Import %"];
        acc["Export %"] += r["Export %"];
        return acc;
      },
      { Export: 0, Import: 0, "Grand Total": 0, Difference: 0, "Import %": 0, "Export %": 0 }
    );
  }, [sortedPivot, topN]);

  const uniqueProducts = useMemo(
    () => ["All", ...Array.from(new Set(rows.map((r) => r.PRODUCT).filter(Boolean)))],
    [rows]
  );

  const uniqueCountries = useMemo(
    () => ["All", ...Array.from(new Set(rows.map((r) => r.Country).filter(Boolean)))],
    [rows]
  );

  const barColors = { Export: "#4a90e2", Import: "#d9534f" };

  // -------------------- PDF EXPORT --------------------
  const exportPDF = async () => {
    if (!reportRef.current) return;
    const pdf = new jsPDF("p", "mm", "a4");
    const pageWidth = pdf.internal.pageSize.getWidth() - 20;
    const canvas = await html2canvas(reportRef.current, { scale: 2 });
    const imgData = canvas.toDataURL("image/png");
    const imgProps = pdf.getImageProperties(imgData);
    const pdfHeight = (imgProps.height * pageWidth) / imgProps.width;
    pdf.addImage(imgData, "PNG", 10, 10, pageWidth, pdfHeight);
    pdf.save("pivot_report.pdf");
  };

  // -------------------- RENDER --------------------
  return (
    <div ref={reportRef}>
      {/* ---------------- Top Editable Report Title ---------------- */}
      <div style={{ textAlign: "center", marginBottom: 16 }}>
        <input
          value={editableTitle}
          onChange={(e) => setEditableTitle(e.target.value)}
          style={{
            fontSize: 24,
            fontWeight: "bold",
            textAlign: "center",
            border: "none",
            borderBottom: "2px solid #ccc",
            outline: "none",
            width: "60%",
            padding: "4px",
          }}
        />
      </div>

      {/* ---------------- Controls ---------------- */}
      <div style={{ display: "flex", gap: 12, marginBottom: 12 }}>
        <div>
          Pivot By:{" "}
          <select value={pivotBy} onChange={(e) => setPivotBy(e.target.value)}>
            <option value="PRODUCT">PRODUCT</option>
            <option value="Country">Country</option>
          </select>
        </div>
        <div>
          Measure:{" "}
          <select value={measure} onChange={(e) => setMeasure(e.target.value)}>
            <option value="Amount($)">Amount ($)</option>
            <option value="Weight(Kg)">Weight (Kg)</option>
            <option value="Quantity">Quantity</option>
          </select>
        </div>
        <div>
          <button onClick={() => downloadCSV(sortedPivot)}>Export CSV</button>
        </div>
        <div>
          <button onClick={exportPDF}>Export PDF</button>
        </div>
      </div>

      {/* ---------------- Table ---------------- */}
      <div style={{ maxHeight: 400, overflowY: "auto", border: "1px solid #ccc", marginBottom: 24 }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead style={{ position: "sticky", top: 0, background: "#f4f4f4" }}>
            <tr>
              <th>{pivotBy === "PRODUCT" ? "PRODUCT" : "Country"}</th>
              {rows[0]?.Entity && <th>Entity</th>}
              {rows[0]?.Date && <th>Date</th>}
              <th style={{ textAlign: "right" }}>Export</th>
              <th style={{ textAlign: "right" }}>Import</th>
              <th style={{ textAlign: "right" }}>Grand Total</th>
              <th style={{ textAlign: "right" }}>Difference</th>
              <th style={{ textAlign: "right" }}>Import %</th>
              <th style={{ textAlign: "right" }}>Export %</th>
            </tr>
          </thead>
          <tbody>
            {sortedPivot.map((r, i) => {
              const threshold = 0.05;
              const maxVal = Math.max(r.Export, r.Import);
              const isClose = maxVal > 0 && Math.abs(r.Export - r.Import) / maxVal <= threshold;
              return (
                <tr key={i} style={{ background: isClose ? "#e0f7fa" : undefined }}>
                  <td>{pivotBy === "PRODUCT" ? r.PRODUCT : r.Country}</td>
                  {r.Entity && <td>{r.Entity}</td>}
                  {r.Date && <td>{r.Date}</td>}
                  <td style={{ textAlign: "right" }}>{formatNumber(r.Export)}</td>
                  <td style={{ textAlign: "right" }}>{formatNumber(r.Import)}</td>
                  <td style={{ textAlign: "right" }}>{formatNumber(r["Grand Total"])}</td>
                  <td style={{ textAlign: "right" }}>{formatNumber(r.Difference)}</td>
                  <td style={{ textAlign: "right" }}>{formatNumber(r["Import %"])}%</td>
                  <td style={{ textAlign: "right" }}>{formatNumber(r["Export %"])}%</td>
                </tr>
              );
            })}
            <tr style={{ fontWeight: "bold", background: "#eee" }}>
              <td>Total</td>
              {rows[0]?.Entity && <td>-</td>}
              {rows[0]?.Date && <td>-</td>}
              <td style={{ textAlign: "right" }}>{formatNumber(totalRow.Export)}</td>
              <td style={{ textAlign: "right" }}>{formatNumber(totalRow.Import)}</td>
              <td style={{ textAlign: "right" }}>{formatNumber(totalRow["Grand Total"])}</td>
              <td style={{ textAlign: "right" }}>{formatNumber(totalRow.Difference)}</td>
              <td style={{ textAlign: "right" }}>{formatNumber(totalRow["Import %"])}%</td>
              <td style={{ textAlign: "right" }}>{formatNumber(totalRow["Export %"])}%</td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* ---------------- Charts ---------------- */}
      <div style={{ width: "100%", height: 300, marginBottom: 24 }}>
        <ResponsiveContainer>
          <BarChart data={sortedPivot}>
            <XAxis dataKey={pivotBy} />
            <YAxis />
            <Tooltip formatter={(val) => formatNumber(val)} />
            <Legend />
            <Bar dataKey="Export" fill={barColors.Export} />
            <Bar dataKey="Import" fill={barColors.Import} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div style={{ width: "100%", height: 200, marginBottom: 24 }}>
        <ResponsiveContainer>
          <LineChart data={sortedPivot}>
            <XAxis dataKey={pivotBy} />
            <YAxis />
            <CartesianGrid strokeDasharray="3 3" />
            <Tooltip formatter={(val) => formatNumber(val)} />
            <Legend />
            <Line type="monotone" dataKey="Difference" stroke="#ff9900" strokeWidth={2} />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* ---------------- Summary ---------------- */}
      <div style={{ marginTop: 12, padding: 12, border: "1px solid #ccc", background: "#f9f9f9" }}>
        <strong>Summary Report:</strong>
        <div>Total Export: {formatNumber(totalRow.Export)}</div>
        <div>Total Import: {formatNumber(totalRow.Import)}</div>
        <div>Total Grand Total: {formatNumber(totalRow["Grand Total"])}</div>
        <div>Total Difference: {formatNumber(totalRow.Difference)}</div>
        <div>
          Average Import %:{" "}
          {formatNumber(totalRow["Import %"] / Math.min(topN, sortedPivot.length))}%
        </div>
        <div>
          Average Export %:{" "}
          {formatNumber(totalRow["Export %"] / Math.min(topN, sortedPivot.length))}%
        </div>
      </div>
    </div>
  );
}

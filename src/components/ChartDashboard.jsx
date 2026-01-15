import { useEffect, useMemo, useRef, useState } from "react";
import Papa from "papaparse";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  ScatterChart,
  Scatter,
  CartesianGrid,
  ZAxis,
} from "recharts";

/**
 * SAFE CHART DASHBOARD
 * - Reads filteredRows if provided
 * - Falls back to CSV
 * - Never mutates table state
 */
export default function ChartDashboard({ report, filteredRows }) {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const exportRef = useRef(null);

  /* ---------------- DATA SOURCE ---------------- */
  useEffect(() => {
    if (filteredRows && filteredRows.length) {
      setRows(filteredRows);
      setLoading(false);
      return;
    }

    if (!report?.csv) {
      setRows([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    Papa.parse(report.csv, {
      download: true,
      header: true,
      skipEmptyLines: true,
      complete: (res) => {
        const cleaned = res.data.map((r) => {
          ["Transactions", "Weight(Kg)", "Amount($)", "Quantity"].forEach(
            (k) => (r[k] = Number(String(r[k] || 0).replace(/,/g, "")))
          );
          return r;
        });
        setRows(cleaned);
        setLoading(false);
      },
      error: () => {
        setRows([]);
        setLoading(false);
      },
    });
  }, [report, filteredRows]);

  if (loading) return <div>Loading charts…</div>;
  if (!rows.length) return <div>No chart data available</div>;

  /* ---------------- HELPERS ---------------- */
  const zScore = (arr, val) => {
    const mean = arr.reduce((a, b) => a + b, 0) / arr.length;
    const sd = Math.sqrt(
      arr.reduce((a, b) => a + (b - mean) ** 2, 0) / arr.length
    );
    return sd === 0 ? 0 : (val - mean) / sd;
  };

  /* ---------------- SCATTER DATA ---------------- */
  const scatterData = useMemo(() => {
    const amounts = rows.map((r) => r["Amount($)"]);
    return rows.map((r) => ({
      weight: r["Weight(Kg)"],
      amount: r["Amount($)"],
      outlier: Math.abs(zScore(amounts, r["Amount($)"])) > 2,
    }));
  }, [rows]);

  /* ---------------- COUNTRY HEATMAP ---------------- */
  const countryHeat = useMemo(() => {
    const map = {};
    rows.forEach((r) => {
      const c = r.Country || "Unknown";
      map[c] = (map[c] || 0) + (r.Transactions || 0);
    });
    return Object.entries(map)
      .map(([country, value]) => ({ country, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 15);
  }, [rows]);

  /* ---------------- TOP VALUE BAR ---------------- */
  const topValue = useMemo(() => {
    return [...rows]
      .sort((a, b) => b["Amount($)"] - a["Amount($)"])
      .slice(0, 10)
      .map((r) => ({
        name: r.Exporter || r.Importer || "Unknown",
        value: r["Amount($)"],
      }));
  }, [rows]);

  /* ---------------- PDF EXPORT ---------------- */
  const exportPDF = async () => {
    const canvas = await html2canvas(exportRef.current, { scale: 2 });
    const img = canvas.toDataURL("image/png");
    const pdf = new jsPDF("p", "mm", "a4");
    const w = pdf.internal.pageSize.getWidth();
    const h = (canvas.height * w) / canvas.width;
    pdf.addImage(img, "PNG", 0, 10, w, h);
    pdf.save(`${report.title}-charts.pdf`);
  };

  /* ---------------- UI ---------------- */
  return (
    <>
      <button onClick={exportPDF} style={{ marginBottom: 12 }}>
        Export Charts (PDF)
      </button>

      <div ref={exportRef}>
        {/* TOP VALUE */}
        <h3>Top 10 by Amount ($)</h3>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={topValue}>
            <XAxis dataKey="name" hide />
            <YAxis />
            <Tooltip />
            <Bar dataKey="value" />
          </BarChart>
        </ResponsiveContainer>

        {/* SCATTER */}
        <h3>Fraud Lens: Weight vs Amount</h3>
        <ResponsiveContainer width="100%" height={320}>
          <ScatterChart>
            <CartesianGrid />
            <XAxis dataKey="weight" name="Weight (Kg)" />
            <YAxis dataKey="amount" name="Amount ($)" />
            <ZAxis range={[60, 60]} />
            <Tooltip cursor={{ strokeDasharray: "3 3" }} />
            <Scatter
              data={scatterData.filter((d) => !d.outlier)}
              fill="#8884d8"
            />
            <Scatter
              data={scatterData.filter((d) => d.outlier)}
              fill="#ff4d4f"
            />
          </ScatterChart>
        </ResponsiveContainer>

        {/* COUNTRY HEATMAP */}
        <h3>Country Transaction Intensity</h3>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={countryHeat} layout="vertical">
            <XAxis type="number" />
            <YAxis type="category" dataKey="country" width={100} />
            <Tooltip />
            <Bar dataKey="value" />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </>
  );
}
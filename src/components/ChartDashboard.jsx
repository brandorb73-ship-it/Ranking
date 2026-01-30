import { useMemo, useRef, useState } from "react";
import {
  ResponsiveContainer,
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  Tooltip,
  BarChart,
  Bar,
  Cell,
  PieChart,
  Pie,
  Legend,
  LineChart,
  Line,
} from "recharts";

import {
  ComposableMap,
  Geographies,
  Geography,
  Marker,
} from "react-simple-maps";

import jsPDF from "jspdf";
import html2canvas from "html2canvas";

/* ===================== CONSTANTS ===================== */

const geoUrl =
  "https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json";

/* -------- PROFESSIONAL COLOR PALETTE -------- */
const COLORS = {
  low: "#4b6f44",        // muted green
  medium: "#b0892f",     // amber
  high: "#8b3a2e",       // dark rust
  neutral: "#4b6b9a",    // muted blue
  bar: "#5b7c99",
  line: "#8b5e34",
};

/* -------- COUNTRY COORDS (EXTENDED SAFE SET) -------- */
const COUNTRY_COORDS = {
  "United States": [-98, 38],
  China: [104, 35],
  Singapore: [103.8, 1.35],
  India: [78, 21],
  Japan: [138, 37],
  Germany: [10, 51],
  France: [2, 46],
  "United Kingdom": [0, 54],
  Netherlands: [5.3, 52],
  Belgium: [4.5, 50.8],
  Italy: [12.5, 42.5],
  Spain: [-3.7, 40.4],
  Australia: [134, -25],
  Brazil: [-51, -10],
  Mexico: [-102, 23],
  Canada: [-106, 56],
  Vietnam: [108, 14],
  Thailand: [101, 15],
  Malaysia: [102, 4],
  Indonesia: [113, -2],
  SouthKorea: [127.8, 36.5],
};

/* ===================== FORMATTERS ===================== */

const formatNumber = (v) =>
  typeof v === "number"
    ? v.toLocaleString(undefined, { maximumFractionDigits: 2 })
    : v;

const formatInteger = (v) =>
  typeof v === "number"
    ? v.toLocaleString(undefined, { maximumFractionDigits: 0 })
    : v;

/* ===================== RISK ENGINE ===================== */

function computeRiskScore(row, stats) {
  let score = 0;

  if (row.amount > stats.p90Amount) score += 3;
  if (row.weight > stats.p90Weight) score += 2;
  if (row.txnCount < stats.p20Txn) score += 2;
  if (row.countryCount === 1) score += 1;

  return Math.min(score, 10);
}

function riskBand(score) {
  if (score >= 7) return "high";
  if (score >= 4) return "medium";
  return "low";
}

/* ===================== COMPONENT ===================== */

export default function ChartDashboard({ rows = [], filteredRows = [] }) {
  const chartRef = useRef(null);

  const data = filteredRows.length ? filteredRows : rows;

  /* ===================== STATE ===================== */

  const [valueRange, setValueRange] = useState([0, Infinity]);
  const [weightRange, setWeightRange] = useState([0, Infinity]);
  const [txnRange, setTxnRange] = useState([0, Infinity]);

  const [hoverCountry, setHoverCountry] = useState(null);
  const [pieDimension, setPieDimension] = useState("Country");

  /* ===================== STATS ===================== */

  const stats = useMemo(() => {
    const amounts = data.map((d) => Number(d.Amount || 0)).sort((a, b) => a - b);
    const weights = data.map((d) => Number(d.Weight || 0)).sort((a, b) => a - b);
    const txns = data.map((d) => Number(d.txnCount || 1)).sort((a, b) => a - b);

    const p = (arr, q) => arr[Math.floor(arr.length * q)] || 0;

    return {
      p90Amount: p(amounts, 0.9),
      p90Weight: p(weights, 0.9),
      p20Txn: p(txns, 0.2),
    };
  }, [data]);

  /* ===================== SCATTER DATA ===================== */

  const scatterData = useMemo(() => {
    return data
      .map((r) => {
        const amount = Number(r.Amount || 0);
        const weight = Number(r.Weight || 0);
        const txnCount = Number(r.txnCount || 1);
        const country = r.Country || "Unknown";

        const riskScore = computeRiskScore(
          {
            amount,
            weight,
            txnCount,
            countryCount: r.countryCount || 1,
          },
          stats
        );

        return {
          entity: r.Entity,
          amount: Number(amount.toFixed(2)),
          weight: Number(weight.toFixed(2)),
          txnCount,
          country,
          riskScore,
          riskBand: riskBand(riskScore),
        };
      })
      .filter(
        (d) =>
          d.amount >= valueRange[0] &&
          d.amount <= valueRange[1] &&
          d.weight >= weightRange[0] &&
          d.weight <= weightRange[1] &&
          d.txnCount >= txnRange[0] &&
          d.txnCount <= txnRange[1]
      );
  }, [data, stats, valueRange, weightRange, txnRange]);

  /* ===================== BAR DATA ===================== */

  const barData = useMemo(() => {
    const agg = {};
    data.forEach((r) => {
      const c = r.Country || "Unknown";
      agg[c] = (agg[c] || 0) + Number(r.Amount || 0);
    });
    return Object.entries(agg).map(([k, v]) => ({
      country: k,
      value: Number(v.toFixed(2)),
    }));
  }, [data]);

  /* ===================== COMBO DATA ===================== */

  const comboData = useMemo(() => {
    const agg = {};
    data.forEach((r) => {
      const c = r.Country || "Unknown";
      if (!agg[c]) agg[c] = { country: c, value: 0, txn: 0 };
      agg[c].value += Number(r.Amount || 0);
      agg[c].txn += Number(r.txnCount || 1);
    });
    return Object.values(agg).map((d) => ({
      ...d,
      value: Number(d.value.toFixed(2)),
    }));
  }, [data]);

  /* ===================== PIE DATA ===================== */

  const pieData = useMemo(() => {
    const agg = {};
    data.forEach((r) => {
      const key = r[pieDimension] || "Unknown";
      agg[key] = (agg[key] || 0) + Number(r.Amount || 0);
    });
    return Object.entries(agg).map(([k, v]) => ({
      name: k,
      value: Number(v.toFixed(2)),
    }));
  }, [data, pieDimension]);

  /* ===================== EXPORT ===================== */

  const exportPDF = async () => {
    if (!chartRef.current) return;
    const canvas = await html2canvas(chartRef.current, { scale: 2 });
    const img = canvas.toDataURL("image/png");
    const pdf = new jsPDF("p", "mm", "a4");
    pdf.addImage(img, "PNG", 10, 10, 190, 0);
    pdf.save("charts.pdf");
  };
  /* ===================== RENDER ===================== */

  return (
    <div ref={chartRef} style={{ padding: 20 }}>
      {/* ---------- ACTIONS ---------- */}
      <div style={{ marginBottom: 16 }}>
        <button className="btn secondary" onClick={exportPDF}>
          Export PDF
        </button>
      </div>

      {/* ===================== SLIDERS ===================== */}
      <div style={{ display: "flex", gap: 20, marginBottom: 20 }}>
        <label>
          Amount
          <input
            type="range"
            min={0}
            max={stats.p90Amount || 1}
            step={stats.p90Amount / 50 || 1}
            onChange={(e) =>
              setValueRange([0, Number(e.target.value)])
            }
          />
        </label>

        <label>
          Weight
          <input
            type="range"
            min={0}
            max={stats.p90Weight || 1}
            step={stats.p90Weight / 50 || 1}
            onChange={(e) =>
              setWeightRange([0, Number(e.target.value)])
            }
          />
        </label>

        <label>
          Transactions
          <input
            type="range"
            min={0}
            max={stats.p20Txn * 5 || 10}
            step={1}
            onChange={(e) =>
              setTxnRange([0, Number(e.target.value)])
            }
          />
        </label>
      </div>

      {/* ===================== RISK LEGEND ===================== */}
      <div style={{ display: "flex", gap: 20, marginBottom: 12 }}>
        <span style={{ color: COLORS.low }}>● Low Risk</span>
        <span style={{ color: COLORS.medium }}>● Medium Risk</span>
        <span style={{ color: COLORS.high }}>● High Risk</span>
      </div>

      {/* ===================== SCATTER ===================== */}
      <h3>Weight vs Amount (Risk Highlighted)</h3>
      <ResponsiveContainer width="100%" height={320}>
        <ScatterChart>
          <XAxis dataKey="weight" tickFormatter={formatNumber} />
          <YAxis dataKey="amount" tickFormatter={formatNumber} />
          <Tooltip
            formatter={(v) => formatNumber(v)}
            labelFormatter={(l) => `Weight: ${formatNumber(l)}`}
          />
          <Scatter
            data={scatterData}
            shape={({ cx, cy, payload }) => (
              <g
                onMouseEnter={() => setHoverCountry(payload.country)}
                onMouseLeave={() => setHoverCountry(null)}
              >
                <circle
                  cx={cx}
                  cy={cy}
                  r={4}
                  fill={COLORS[payload.riskBand]}
                  opacity={
                    hoverCountry &&
                    hoverCountry !== payload.country
                      ? 0.2
                      : 0.9
                  }
                />
                {payload.riskBand !== "low" && (
                  <circle
                    cx={cx}
                    cy={cy}
                    r={9}
                    fill="none"
                    stroke={COLORS[payload.riskBand]}
                    strokeDasharray="3,2"
                  />
                )}
              </g>
            )}
          />
        </ScatterChart>
      </ResponsiveContainer>

      {/* ===================== BAR ===================== */}
      <h3 style={{ marginTop: 30 }}>Transaction Value by Country</h3>
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={barData}>
          <XAxis dataKey="country" />
          <YAxis tickFormatter={formatNumber} />
          <Tooltip formatter={(v) => formatNumber(v)} />
          <Bar dataKey="value">
            {barData.map((_, i) => (
              <Cell key={i} fill={COLORS.bar} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>

      {/* ===================== COMBO ===================== */}
      <h3 style={{ marginTop: 30 }}>Value vs Transactions (Combo)</h3>
      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={comboData}>
          <XAxis dataKey="country" />
          <YAxis
            yAxisId="left"
            orientation="left"
            tickFormatter={formatNumber}
          />
          <YAxis
            yAxisId="right"
            orientation="right"
            tickFormatter={formatInteger}
          />
          <Tooltip />
          <Legend />
          <Bar
            yAxisId="left"
            dataKey="value"
            fill={COLORS.bar}
            name="Value"
          />
          <Line
            yAxisId="right"
            dataKey="txn"
            stroke={COLORS.line}
            name="Transactions"
          />
        </LineChart>
      </ResponsiveContainer>

      {/* ===================== PIE ===================== */}
      <h3 style={{ marginTop: 30 }}>Distribution (Dynamic)</h3>
      <select
        value={pieDimension}
        onChange={(e) => setPieDimension(e.target.value)}
      >
        <option value="Country">Country</option>
        <option value="Entity">Entity</option>
      </select>

      <ResponsiveContainer width="100%" height={300}>
        <PieChart>
          <Pie
            data={pieData}
            dataKey="value"
            nameKey="name"
            outerRadius={100}
            label={({ value }) => formatNumber(value)}
          />
          <Tooltip formatter={(v) => formatNumber(v)} />
        </PieChart>
      </ResponsiveContainer>

      {/* ===================== HEATMAP ===================== */}
      <h3 style={{ marginTop: 30 }}>Country Activity Heatmap</h3>
      <ComposableMap projectionConfig={{ scale: 140 }}>
        <Geographies geography={geoUrl}>
          {({ geographies }) =>
            geographies.map((geo) => {
              const name = geo.properties.NAME;
              const count = scatterData.filter(
                (d) => d.country === name
              ).length;
              return (
                <Geography
                  key={geo.rsmKey}
                  geography={geo}
                  fill={
                    count
                      ? `rgba(140,85,60,${Math.min(count / 10, 0.8)})`
                      : "#EEE"
                  }
                  stroke="#CCC"
                />
              );
            })
          }
        </Geographies>

        {Object.entries(COUNTRY_COORDS).map(([c, coords]) => (
          <Marker key={c} coordinates={coords}>
            <circle r={3} fill="#333" />
          </Marker>
        ))}
      </ComposableMap>

      {/* ===================== SUMMARY ===================== */}
      <h3 style={{ marginTop: 30 }}>Selection Summary</h3>
      <ul>
        {scatterData
          .filter((d) => d.riskBand === "high")
          .slice(0, 5)
          .map((d, i) => (
            <li key={i}>
              {d.entity} — {d.country} — Risk {d.riskScore}
            </li>
          ))}
      </ul>
    </div>
  );
}

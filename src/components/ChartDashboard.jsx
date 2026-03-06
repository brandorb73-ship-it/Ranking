import React, { useMemo, useState } from "react";
import {
  ResponsiveContainer,
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  Legend
} from "recharts";

import { ComposableMap, Geographies, Geography } from "react-simple-maps";

const geoUrl =
  "https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json";

const RISK_COLORS = {
  low: "#10b981",
  med: "#f59e0b",
  high: "#ef4444"
};

const formatNum = (v) =>
  Number(v || 0).toLocaleString("en-US", { maximumFractionDigits: 0 });

export default function ChartDashboard({ rows = [], filteredRows = [] }) {

  const [basis, setBasis] = useState("Amount");

  const data =
    filteredRows && filteredRows.length ? filteredRows : rows;

  if (!data.length) {
    return <div style={{ padding: 40 }}>No chart data detected</div>;
  }

  const headers = Object.keys(data[0]);

  const detect = (patterns) =>
    headers.find((k) =>
      patterns.some((p) => new RegExp(p, "i").test(k))
    );

  const importerKey = detect([
    "importer",
    "consignee",
    "buyer"
  ]);

  const exporterKey = detect([
    "exporter",
    "shipper",
    "seller"
  ]);

  const entityKey =
    importerKey || exporterKey || detect(["company","name"]);

  const txnKey = detect(["transaction","txn","count"]);
  const weightKey = detect(["weight","kg"]);
  const amountKey = detect(["amount","value","usd"]);

  const countryKey = detect([
    "country",
    "origin",
    "nation"
  ]);

  const entityType =
    importerKey ? "Importer" : exporterKey ? "Exporter" : "Entity";

  const processed = useMemo(() => {

    return data.map((r) => {

      const label =
        r[entityKey] ||
        r[importerKey] ||
        r[exporterKey] ||
        "Unknown";

      const txns = Number(r[txnKey] || 0);
      const weight = Number(r[weightKey] || 0);
      const amount = Number(r[amountKey] || 0);

      const metric =
        basis === "Amount"
          ? amount
          : basis === "Weight"
          ? weight
          : txns;

      let riskScore = 0;

      riskScore += Math.min(txns * 1.5, 40);
      riskScore += Math.min(amount / 40000, 30);
      riskScore += Math.min(weight / 20000, 30);

      riskScore = Math.min(Math.round(riskScore), 100);

      let risk = "low";

      if (riskScore > 70) risk = "high";
      else if (riskScore > 40) risk = "med";

      return {
        label,
        txns,
        weight,
        amount,
        metric,
        risk,
        riskScore,
        country: (r[countryKey] || "").toUpperCase()
      };

    });

  }, [data, basis]);

  const topEntities = [...processed]
    .sort((a, b) => b.metric - a.metric)
    .slice(0, 5);

  const spikes = processed.filter(
    (r) => r.txns > 50 || r.amount > 1000000
  );

  const riskTotals = useMemo(() => {

    const totals = { low: 0, med: 0, high: 0 };

    processed.forEach((r) => {
      totals[r.risk] += r.metric;
    });

    const sum =
      totals.low + totals.med + totals.high;

    return [
      {
        name: "Low",
        value: totals.low,
        pct: ((totals.low / sum) * 100).toFixed(0)
      },
      {
        name: "Medium",
        value: totals.med,
        pct: ((totals.med / sum) * 100).toFixed(0)
      },
      {
        name: "High",
        value: totals.high,
        pct: ((totals.high / sum) * 100).toFixed(0)
      }
    ];

  }, [processed]);

  const countryCounts = {};

  processed.forEach((r) => {
    if (!r.country) return;
    countryCounts[r.country] =
      (countryCounts[r.country] || 0) + 1;
  });

  const maxCountry = Math.max(
    ...Object.values(countryCounts),
    1
  );

  const aiSummary = `
Investigation dataset analysed ${processed.length} ${entityType.toLowerCase()}s.

${spikes.length} abnormal shipment spikes were detected.

Top ${entityType.toLowerCase()} concentration:
${topEntities.map((e) => e.label).join(", ")}.

${processed.filter((r) => r.risk === "high").length}
high-risk ${entityType.toLowerCase()}s require investigation.
`;

  return (

    <div style={{ display: "flex", flexDirection: "column", gap: 25 }}>

      <div style={{ display: "flex", gap: 10 }}>
        {["Amount", "Weight", "Transactions"].map((t) => (
          <button
            key={t}
            onClick={() => setBasis(t)}
            style={{
              padding: "8px 16px",
              borderRadius: 6,
              border: "none",
              cursor: "pointer",
              background: basis === t ? "#1e3a8a" : "#e2e8f0",
              color: basis === t ? "#fff" : "#334155",
              fontWeight: "bold"
            }}
          >
            {t}
          </button>
        ))}
      </div>

      <div
        style={{
          background: "#f8fafc",
          border: "1px solid #e2e8f0",
          padding: 15,
          borderRadius: 10,
          fontSize: 13
        }}
      >
        <b>AI Investigation Summary</b>
        <div style={{ marginTop: 6 }}>{aiSummary}</div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>

        <div style={{ background: "#fff", padding: 20, borderRadius: 12 }}>

          <h4>Risk Matrix (Weight vs Value)</h4>

          <ResponsiveContainer width="100%" height={320}>

            <ScatterChart>

              <CartesianGrid strokeDasharray="3 3" />

              <XAxis
                type="number"
                dataKey="weight"
                tickFormatter={(v) => formatNum(v)}
              />

              <YAxis
                type="number"
                dataKey="amount"
                tickFormatter={(v) => formatNum(v)}
              />

              <Tooltip formatter={(v) => formatNum(v)} />

              <Scatter data={processed}>

                {processed.map((entry, i) => {

                  const color = RISK_COLORS[entry.risk];

                  return (
                    <Cell
                      key={i}
                      fill={color}
                      shape={(props) => (
                        <g>

                          {entry.risk === "high" && (
                            <circle
                              cx={props.cx}
                              cy={props.cy}
                              r={14}
                              fill="none"
                              stroke={color}
                              strokeDasharray="3 2"
                            />
                          )}

                          <circle
                            cx={props.cx}
                            cy={props.cy}
                            r={6}
                            fill={color}
                          />

                        </g>
                      )}
                    />
                  );
                })}

              </Scatter>

            </ScatterChart>

          </ResponsiveContainer>

        </div>

        <div style={{ background: "#fff", padding: 20, borderRadius: 12 }}>

          <h4>Top {entityType}s</h4>

          <ResponsiveContainer width="100%" height={320}>

            <BarChart data={topEntities}>

              <XAxis
                dataKey="label"
                angle={-35}
                textAnchor="end"
                interval={0}
              />

              <YAxis tickFormatter={(v) => formatNum(v)} />

              <Tooltip formatter={(v) => formatNum(v)} />

              <Bar dataKey="metric" fill="#1e3a8a" />

            </BarChart>

          </ResponsiveContainer>

        </div>

      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 25 }}>

        <div style={{ background: "#fff", padding: 20, borderRadius: 12 }}>

          <h4>Risk Distribution</h4>

          <ResponsiveContainer width="100%" height={260}>

            <PieChart>

              <Pie
                data={riskTotals}
                dataKey="value"
                innerRadius={60}
                outerRadius={90}
                label={(d) => `${d.name} ${d.pct}%`}
              >

                <Cell fill={RISK_COLORS.low} />
                <Cell fill={RISK_COLORS.med} />
                <Cell fill={RISK_COLORS.high} />

              </Pie>

              <Legend />

            </PieChart>

          </ResponsiveContainer>

        </div>

        <div style={{ background: "#fff", padding: 20, borderRadius: 12 }}>

          <h4>Global Shipment Heatmap</h4>

          <ComposableMap projectionConfig={{ scale: 120 }}>

            <Geographies geography={geoUrl}>
              {({ geographies }) =>
                geographies.map((geo) => {

                  const name =
                    geo.properties.NAME?.toUpperCase() || "";

                  const count =
                    countryCounts[name] || 0;

                  return (
                    <Geography
                      key={geo.rsmKey}
                      geography={geo}
                      fill={
                        count
                          ? `rgba(30,58,138,${
                              0.2 + count / maxCountry
                            })`
                          : "#e2e8f0"
                      }
                      stroke="#fff"
                    />
                  );

                })
              }
            </Geographies>

          </ComposableMap>

        </div>

      </div>

    </div>

  );
}
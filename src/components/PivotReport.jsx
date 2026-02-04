import { useMemo, useState, useRef } from "react";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer,
  LineChart, Line, CartesianGrid, ReferenceLine, ComposedChart,
  PieChart, Pie, Cell, AreaChart, Area
} from "recharts";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";

// -------------------- HELPERS --------------------
function fNum(val) {
  if (val == null || isNaN(val)) return "0.00";
  return Number(val).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

const PIE_COLORS = ["#1d3557", "#e63946", "#457b9d", "#f4a261", "#a8dadc", "#2a9d8f", "#8d99ae", "#52b788", "#b5179e"];

export default function PivotReport({ rows = [], reportName = "Master Trade Hub Audit" }) {
  const [pivotBy, setPivotBy] = useState("PRODUCT");
  const [measure, setMeasure] = useState("Amount($)");
  const [editableTitle, setEditableTitle] = useState(reportName);
  const [selectedItems, setSelectedItems] = useState([]); 
  const [logo, setLogo] = useState(null);
  const [showLogo, setShowLogo] = useState(true);
  
  const p1 = useRef(null); const p2 = useRef(null); const p3 = useRef(null);
  const fileInputRef = useRef(null);

  const COLORS = { primary: "#1d3557", secondary: "#e63946", accent: "#f4a261", highlight: "#e0f7fa", footer: "#f1f3f5", warning: "#fff3e0" };

  // 1. Build Base Pivot Data
const allPivotData = useMemo(() => {
    const pivotMap = {};
    rows.forEach((r) => {
      const key = r[pivotBy] || "Unknown";
      if (!pivotMap[key]) {
        pivotMap[key] = { [pivotBy]: key, Export: 0, Import: 0, ExpQty: 0, ImpQty: 0, ExpWgt: 0, ImpWgt: 0 };
      }
      
      const type = r.Type?.toLowerCase() === "export" ? "Export" : "Import";
      const val = Number(r[measure] || 0);
      const q = Number(r["Quantity"] || 0);
      const w = Number(r["Weight(Kg)"] || 0);

      pivotMap[key][type] += val;
      if (type === "Export") {
        pivotMap[key].ExpQty += q;
        pivotMap[key].ExpWgt += w;
      } else {
        pivotMap[key].ImpQty += q;
        pivotMap[key].ImpWgt += w;
      }
    });

    return Object.values(pivotMap).map(r => {
      const grandTotal = r.Export + r.Import;
      
      // Calculate Ratio: If it's a destination, we show it as 100% pass-thru 
      // of its own value to ensure the line chart has data points.
      const wgtRatio = r.ImpWgt > 0 ? (r.ExpWgt / r.ImpWgt) : (r.ExpWgt > 0 ? 1 : 0);
      const qtyRatio = r.ImpQty > 0 ? (r.ExpQty / r.ImpQty) : (r.ExpQty > 0 ? 1 : 0);
      
      // Difference: Total value gap for that specific entity
      const diff = Math.abs(r.Export - r.Import);

      // Leakage: Only calculated if there's an import to lose from
      let leakageLoss = 0;
      if (r.Import > 0 && r.Export < r.Import) {
        leakageLoss = r.Import - r.Export;
      }

      return {
        ...r,
        "Grand Total": grandTotal,
        Difference: diff,
        "Import %": grandTotal ? (r.Import / grandTotal) * 100 : 0,
        "Export %": grandTotal ? (r.Export / grandTotal) * 100 : 0,
        "Wgt Ratio": wgtRatio,
        "Qty Ratio": qtyRatio,
        "Leakage Loss": leakageLoss,
        "Is Anomaly": (r.Import > 0 && r.Export > 0) && (wgtRatio < 0.85 || wgtRatio > 1.15)
      };
    }).sort((a, b) => b.Export - a.Export);
  }, [rows, pivotBy, measure]);

const [hubMode, setHubMode] = useState(false);

const filteredPivot = useMemo(() => {
    let data = selectedItems.length === 0 
      ? allPivotData 
      : allPivotData.filter(item => selectedItems.includes(item[pivotBy]));

    if (hubMode) {
      // Hub Mode: Only show items that have BOTH Import and Export records
      data = data.filter(item => item.Import > 0 && item.Export > 0);
    }

    return data;
  }, [allPivotData, selectedItems, pivotBy, hubMode]);

const grandTotals = useMemo(() => {
    // 1. Sum raw numeric values across all pivoted rows
    const totals = filteredPivot.reduce((acc, curr) => ({
      Export: acc.Export + (Number(curr.Export) || 0),
      Import: acc.Import + (Number(curr.Import) || 0),
      ExpWgt: acc.ExpWgt + (Number(curr.ExpWgt) || 0),
      ImpWgt: acc.ImpWgt + (Number(curr.ImpWgt) || 0),
      LeakageLoss: acc.LeakageLoss + (Number(curr["Leakage Loss"]) || 0)
    }), { Export: 0, Import: 0, ExpWgt: 0, ImpWgt: 0, LeakageLoss: 0 });

    const totalSystemValue = totals.Export + totals.Import;
    
    // 2. Calculate the system-wide percentages
    // We use these specific keys to match what the table footer expects
    const impPercent = totalSystemValue > 0 ? (totals.Import / totalSystemValue) * 100 : 0;
    const expPercent = totalSystemValue > 0 ? (totals.Export / totalSystemValue) * 100 : 0;

    return {
      ...totals,
      "Import %": impPercent,
      "Export %": expPercent,
      Difference: Math.abs(totals.Export - totals.Import),
      // Weight ratio for the top cards
      systemWgtRatio: totals.ImpWgt > 0 ? (totals.ExpWgt / totals.ImpWgt) : (totals.ExpWgt > 0 ? 1 : 0)
    };
  }, [filteredPivot]);

  const exportCSV = () => {
    const headers = [pivotBy, "Export", "Import", "Difference", "Imp %", "Exp %", "Qty Ratio", "Wgt Ratio", "Leakage Loss"];
    const csvData = filteredPivot.map(r => [
      `"${r[pivotBy]}"`, r.Export, r.Import, r.Difference, r["Import %"], r["Export %"], r["Qty Ratio"], r["Wgt Ratio"], r["Leakage Loss"]
    ].join(","));
    const blob = new Blob([[headers.join(","), ...csvData].join("\n")], { type: "text/csv" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.setAttribute("download", `${editableTitle}.csv`);
    link.click();
  };

  const exportPDF = async () => {
    const pdf = new jsPDF("p", "mm", "a4");
    const refs = [p1, p2, p3];
    for (let i = 0; i < refs.length; i++) {
      const canvas = await html2canvas(refs[i].current, { scale: 2 });
      pdf.addImage(canvas.toDataURL("image/png"), "PNG", 10, 10, 190, (canvas.height * 190) / canvas.width);
      if (i < refs.length - 1) pdf.addPage();
    }
    pdf.save(`${editableTitle}.pdf`);
  };

  return (
    <div style={{ padding: "20px", background: "#f8f9fa" }}>
      
      {/* PAGE 1: CORE DATA & TABLE */}
      <div ref={p1} style={{ background: "#fff", padding: "50px", marginBottom: "30px", border: "1px solid #ddd" }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          {showLogo && logo && <img src={logo} style={{ maxHeight: 60 }} alt="logo" />}
          <h1 contentEditable style={{ color: COLORS.primary, flex: 1, marginLeft: logo ? 20 : 0 }}>{editableTitle}</h1>
        </div>
        
        <div data-html2canvas-ignore style={{ display: "flex", flexWrap: 'wrap', gap: 15, margin: "20px 0", padding: "15px", background: "#eee", borderRadius: 8 }}>
          <select value={pivotBy} onChange={e => {setPivotBy(e.target.value); setSelectedItems([]);}}><option value="PRODUCT">PRODUCT</option><option value="Country">Country</option></select>
          <select value={measure} onChange={e => setMeasure(e.target.value)}><option value="Amount($)">Amount ($)</option><option value="Weight(Kg)">Weight (Kg)</option><option value="Quantity">Quantity</option></select>
          <button onClick={() => fileInputRef.current.click()}>Upload Logo</button>
          <input type="file" ref={fileInputRef} hidden onChange={e => { const r = new FileReader(); r.onload = ev => setLogo(ev.target.result); r.readAsDataURL(e.target.files[0]); }} />
          <button onClick={() => setShowLogo(!showLogo)}>Toggle Logo</button>
          <button onClick={() => setSelectedItems([])}>Clear Filter</button>
          <button onClick={exportCSV} style={{ background: '#2a9d8f', color: '#fff' }}>Export CSV</button>
          <button onClick={exportPDF} style={{ background: COLORS.primary, color: "#fff" }}>Download PDF</button>
          <button 
  onClick={() => setHubMode(!hubMode)} 
  style={{ background: hubMode ? COLORS.primary : "#ccc", color: "#fff" }}
>
  {hubMode ? "Showing: Hubs Only" : "Showing: All Trade"}
</button>
        </div>

        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "14px" }}>
          <thead>
            <tr style={{ background: COLORS.primary, color: "#fff" }}>
              <th style={{ textAlign: "left", padding: "12px" }}>Select</th>
              <th style={{ textAlign: "left" }}>{pivotBy}</th>
              <th style={{ textAlign: "right" }}>Export ({measure})</th>
              <th style={{ textAlign: "right" }}>Import ({measure})</th>
              <th style={{ textAlign: "right" }}>Difference</th>
              <th style={{ textAlign: "right" }}>Imp %</th>
              <th style={{ textAlign: "right", padding: "12px" }}>Exp %</th>
            </tr>
          </thead>
          <tbody>
            {allPivotData.map((r, i) => {
              const isChecked = selectedItems.includes(r[pivotBy]);
              const isClose = Math.max(r.Export, r.Import) > 0 && Math.abs(r.Export - r.Import) / Math.max(r.Export, r.Import) <= 0.05;
              return (
                <tr key={i} style={{ borderBottom: "1px solid #eee", background: isChecked ? COLORS.warning : isClose ? COLORS.highlight : "transparent" }}>
                  <td style={{ padding: "12px" }}><input type="checkbox" checked={isChecked} onChange={() => setSelectedItems(prev => prev.includes(r[pivotBy]) ? prev.filter(x => x !== r[pivotBy]) : [...prev, r[pivotBy]])} /></td>
                  <td style={{ fontWeight: "bold" }}>{r[pivotBy]}</td>
                  <td style={{ textAlign: "right" }}>{fNum(r.Export)}</td>
                  <td style={{ textAlign: "right" }}>{fNum(r.Import)}</td>
                  <th style={{ textAlign: "right" }}>{fNum(r.Difference)}</th>
                  <td style={{ textAlign: "right" }}>{fNum(r["Import %"])}%</td>
                  <td style={{ textAlign: "right", padding: "12px" }}>{fNum(r["Export %"])}%</td>
                </tr>
              );
            })}
          </tbody>
          {/* --- THE ALIGNMENT FIX IS HERE --- */}
          <tfoot>
            <tr style={{ background: "#f1f4f9", fontWeight: "bold", borderTop: "2px solid #457b9d" }}>
              <td style={{ padding: "10px" }}>GRAND TOTAL</td>
              <td></td> {/* This empty cell pushes the numbers to the correct columns */}
              <td style={{ textAlign: "right", padding: "10px" }}>{fNum(grandTotals.Export)}</td>
              <td style={{ textAlign: "right", padding: "10px" }}>{fNum(grandTotals.Import)}</td>
              <td style={{ textAlign: "right", padding: "10px" }}>{fNum(grandTotals.Difference)}</td>
              <td style={{ textAlign: "right", padding: "10px" }}>{fNum(grandTotals["Import %"])}%</td>
              <td style={{ textAlign: "right", padding: "12px" }}>{fNum(grandTotals["Export %"])}%</td>
            </tr>
          </tfoot>
        </table>

        <div style={{ height: 250, marginTop: 40 }}>
          <ResponsiveContainer><BarChart data={filteredPivot.slice(0, 10)} margin={{ left: 60 }}><XAxis dataKey={pivotBy}/><YAxis tickFormatter={fNum}/><Tooltip formatter={fNum}/><Legend/><Bar dataKey="Export" fill={COLORS.primary}/><Bar dataKey="Import" fill={COLORS.secondary}/></BarChart></ResponsiveContainer>
        </div>
        <div style={{ height: 200, marginTop: 20 }}>
          <ResponsiveContainer><LineChart data={filteredPivot.slice(0, 10)} margin={{ left: 60 }}><XAxis dataKey={pivotBy}/><YAxis tickFormatter={fNum}/><CartesianGrid strokeDasharray="3 3"/><Tooltip formatter={fNum}/><Line type="monotone" dataKey="Difference" stroke={COLORS.accent} strokeWidth={3}/></LineChart></ResponsiveContainer>
        </div>
      </div>

{/* PAGE 2: HUB ANALYSIS */}
<div ref={p2} style={{ background: "#fff", padding: "50px", border: "1px solid #ddd" }}>
  
  {/* --- SYSTEM BALANCE BAR --- */}
  <div style={{ 
    background: grandTotals.systemWgtRatio > 0.95 && grandTotals.systemWgtRatio < 1.05 ? "#2a9d8f" : COLORS.secondary, 
    color: '#fff', padding: '15px 25px', borderRadius: '8px', marginBottom: '20px', display: 'flex', justifyContent: 'space-between' 
  }}>
    <div>
      <span style={{ fontSize: '10px', textTransform: 'uppercase' }}>System Mass Balance (Source vs Global)</span>
      <div style={{ fontSize: '22px', fontWeight: 'bold' }}>
        {fNum(grandTotals.systemWgtRatio)}x 
        <span style={{ fontSize: '12px', marginLeft: '10px', fontWeight: 'normal' }}>
          {grandTotals.systemWgtRatio >= 1 ? "(Surplus/Value Add)" : "(System Leakage)"}
        </span>
      </div>
    </div>
    <div style={{ textAlign: 'right' }}>
      <span style={{ fontSize: '10px', textTransform: 'uppercase' }}>Net Difference</span>
      <div style={{ fontSize: '22px', fontWeight: 'bold' }}>
        {fNum(Math.abs(grandTotals.ExpWgt - grandTotals.ImpWgt))} Kg
      </div>
    </div>
  </div>
<div style={{ 
  padding: '10px 20px', 
  borderRadius: '4px', 
  background: grandTotals.systemWgtRatio === 1 ? '#e6fffa' : '#fff5f5',
  border: `1px solid ${grandTotals.systemWgtRatio === 1 ? '#38b2ac' : '#feb2b2'}`,
  marginBottom: '20px',
  fontSize: '13px'
}}>
  <strong>System Balance Check:</strong> {grandTotals.systemWgtRatio === 1 
    ? "✅ Total destination weight perfectly matches source weight." 
    : `⚠️ Discrepancy detected: System is operating at ${fNum(grandTotals.systemWgtRatio)}x capacity.`}
</div>
  {/* Metric Cards - Fixed to show 1.00x if system is balanced */}
  <div style={{ display: "flex", gap: "20px", background: COLORS.footer, padding: "25px", marginBottom: "30px", borderRadius: "8px" }}>
     <div style={{ flex: 1, textAlign: "center" }}>
       <strong>Global Weight Pass-thru</strong>
       <div style={{ fontSize: "24px" }}>{fNum(grandTotals.systemWgtRatio)}x</div>
     </div>
     <div style={{ flex: 1, textAlign: "center", color: COLORS.secondary }}>
       <strong>Financial Leakage</strong>
       <div style={{ fontSize: "24px" }}>${fNum(grandTotals.Leakage)}</div>
     </div>
  </div>

     {/* Header with Tooltip Pop-up */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <h2 style={{ color: COLORS.primary, margin: 0 }}>HUB THROUGHPUT & AUDIT INTERPRETATION</h2>
          <button 
            onClick={() => alert(
              "HUB ANALYSIS CALCULATIONS:\n\n" +
              "1. PASS-THRU RATIO (Qty/Wgt):\n" +
              "Formula: Export Mass ÷ Import Mass\n" +
              "Audits if physical goods are being diverted or unrecorded.\n\n" +
              "2. LEAKAGE LOSS ($):\n" +
              "Formula: Import Value - Export Value\n" +
              "Calculates the financial 'Value at Risk' for goods that entered the hub but did not exit.\n\n" +
              "3. ORIGIN ONLY:\n" +
              "Indicates the entity is the primary source; no Import records exist for this item."
            )}
            style={{ 
              background: COLORS.accent, 
              border: 'none', 
              borderRadius: '50%', 
              width: "28px", 
              height: "28px", 
              cursor: 'help', 
              color: '#fff', 
              fontWeight: 'bold',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            ?
          </button>
        </div>

      {/* --- EXECUTIVE SUMMARY BAR --- */}
        <div style={{ background: COLORS.primary, color: '#fff', padding: '20px 30px', borderRadius: '8px', marginBottom: '30px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <span style={{ opacity: 0.8, fontSize: '12px', letterSpacing: '1px' }}>TOTAL SYSTEM LEAKAGE (FINANCIAL RISK)</span>
            <div style={{ fontSize: '28px', fontWeight: 'bold' }}>${fNum(grandTotals.LeakageLoss)}</div>
          </div>
          <div style={{ height: '40px', width: '1px', background: 'rgba(255,255,255,0.3)' }}></div>
          <div style={{ textAlign: 'right' }}>
            <span style={{ opacity: 0.8, fontSize: '12px', letterSpacing: '1px' }}>AVG SYSTEM WEIGHT PASS-THRU</span>
            <div style={{ fontSize: '28px', fontWeight: 'bold' }}>
              {/* FIXED: Now correctly displays the ratio (e.g., 1.00x) */}
              {fNum(grandTotals.systemWgtRatio)}x
            </div>
          </div>
        </div>

        {/* Secondary Metric Cards */}
        <div style={{ display: "flex", gap: "20px", background: COLORS.footer, padding: "25px", marginBottom: "30px", borderRadius: "8px" }}>
           <div style={{ flex: 1, textAlign: "center" }}>
             <strong>Qty Pass-thru</strong>
             <div style={{ fontSize: "24px" }}>{grandTotals.ImpQty > 0 ? fNum(grandTotals.ExpQty / grandTotals.ImpQty) : "0.00"}x</div>
           </div>
           <div style={{ flex: 1, textAlign: "center" }}>
             <strong>Weight Pass-thru</strong>
             <div style={{ fontSize: "24px" }}>{grandTotals.ImpWgt > 0 ? fNum(grandTotals.ExpWgt / grandTotals.ImpWgt) : "0.00"}x</div>
           </div>
           <div style={{ flex: 1, textAlign: "center", color: COLORS.secondary }}>
             <strong>Leakage Items</strong>
             <div style={{ fontSize: "24px" }}>{filteredPivot.filter(r => r["Leakage Loss"] > 0).length}</div>
           </div>
        </div>

  {/* Data Table */}
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "14px", marginBottom: "40px" }}>
          <thead>
            <tr style={{ background: "#457b9d", color: "#fff" }}>
              <th style={{ textAlign: "left", padding: "12px" }}>{pivotBy.toUpperCase()}</th>
              <th style={{ textAlign: "right", padding: "12px" }}>Flow Type</th>
              <th style={{ textAlign: "right", padding: "12px" }}>Wgt Ratio</th>
              <th style={{ textAlign: "right", padding: "12px" }}>Leakage ({measure})</th>
            </tr>
          </thead>
          <tbody>
            {filteredPivot.map((r, i) => {
              // 1. Label Logic
              let flowLabel = "";
              if (pivotBy === "PRODUCT") {
                if (r.Import > 0 && r.Export > 0) flowLabel = "Active Trade";
                else if (r.Import > 0 && r.Export === 0) flowLabel = "Stock Piling";
                else if (r.Export > 0 && r.Import === 0) flowLabel = "Outbound Only";
              } else {
                if (r.Import > 0 && r.Export > 0) flowLabel = "Transit Hub";
                else if (r.Import > 0 && r.Export === 0) flowLabel = "Source (China)";
                else if (r.Export > 0 && r.Import === 0) flowLabel = "Destination Market";
              }

              // 2. Row Rendering
              return (
                <tr key={`hub-row-${pivotBy}-${i}`} style={{ borderBottom: "1px solid #eee" }}>
                  <td style={{ padding: "12px", fontWeight: "bold" }}>{r[pivotBy]}</td>
                  <td style={{ textAlign: "right", padding: "12px", color: "#666" }}>{flowLabel}</td>
                  <td style={{ textAlign: "right", padding: "12px" }}>
                    {r.ImpWgt > 0 ? `${fNum(r["Wgt Ratio"])}x` : "1.00x (Source)"}
                  </td>
                  <td style={{ 
  textAlign: "right", 
  padding: "12px", 
  color: r["Leakage Loss"] > 0 ? COLORS.secondary : "inherit",
  fontWeight: r["Leakage Loss"] > 0 ? "bold" : "normal"
}}>
  {measure === "Amount($)" && `$`}
  {fNum(r["Leakage Loss"])}
  {measure === "Weight(Kg)" && ` Kg`}
  {measure === "Quantity" && ` units`}
</td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {/* Comparison Chart */}
        <div style={{ height: 320, marginBottom: "40px" }}>
          <h4 style={{ color: "#666", marginBottom: "10px", fontSize: "12px" }}>TOP 10 HUB THROUGHPUT RATIOS</h4>
          <ResponsiveContainer key={`hub-chart-main-${pivotBy}-${hubMode}`}>
            <ComposedChart data={filteredPivot.slice(0, 10)} margin={{ left: 40, right: 20 }}>
              <XAxis dataKey={pivotBy} tick={{ fontSize: 10 }} />
              <YAxis tickFormatter={fNum} />
              <Tooltip formatter={fNum} />
              <Legend verticalAlign="top" height={36}/>
              <Bar dataKey="Qty Ratio" name="Qty Ratio" fill={COLORS.accent} barSize={30} />
              <Line type="monotone" dataKey="Wgt Ratio" name="Wgt Ratio" stroke={COLORS.primary} strokeWidth={3} dot={{ r: 4 }} />
              <ReferenceLine y={1} stroke="red" strokeDasharray="3 3" label={{ value: "1.0 Equilibrium", position: 'insideTopRight', fontSize: 10, fill: 'red' }} />
            </ComposedChart>
          </ResponsiveContainer>
        </div>

        {/* Leakage Area Chart */}
        <div style={{ height: 220, marginBottom: "30px" }}>
          <h4 style={{ color: "#666", marginBottom: "10px", fontSize: "12px" }}>LEAKAGE LOSS TREND BY {pivotBy.toUpperCase()}</h4>
          <ResponsiveContainer key={`hub-chart-leak-${pivotBy}-${hubMode}`}>
            <AreaChart data={filteredPivot.slice(0, 10)} margin={{ left: 40, right: 20 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey={pivotBy} tick={{ fontSize: 10 }} />
              <YAxis tickFormatter={fNum} />
              <Tooltip formatter={fNum} />
              <Area type="monotone" dataKey="Leakage Loss" name="Leakage ($)" stroke={COLORS.secondary} fill={COLORS.secondary} fillOpacity={0.15} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Audit Guide Footer */}
        <div style={{ marginTop: "25px", padding: "20px", background: "#fdfdfd", borderLeft: `5px solid ${COLORS.primary}`, fontSize: "13px", lineHeight: "1.6" }}>
          <strong>DETAILED HUB AUDIT GUIDE:</strong><br/>
          • <strong>Ratio = 1.00 (Perfect Transit):</strong> The hub is acting as a pure pass-thru; mass in equals mass out perfectly.<br/>
          • <strong>Ratio &gt; 1.00 (Value Addition):</strong> Mass increased during transit. Common if packaging or liquids were added at the hub.<br/>
          • <strong>Ratio &lt; 1.00 (Physical Leakage):</strong> Mass lost in transit. Indicates shrinkage, damage, or unrecorded inventory drift.<br/>
          • <strong>Leakage Value ($):</strong> The calculated financial value of the missing throughput based on current price/amount.
        </div>
      </div>

      {/* PAGE 3: PIE CHART & ANOMALIES */}
      <div ref={p3} style={{ background: "#fff", padding: "50px", border: "1px solid #ddd" }}>
        <h2 style={{ color: COLORS.secondary }}>MARKET SHARE & ANOMALY ANALYSIS</h2>
        <div style={{ display: "grid", gridTemplateColumns: "1.1fr 0.9fr", gap: 30 }}>
          <div style={{ height: 500 }}>
            <h4 style={{textAlign:'center', marginBottom: 10}}>Dominance by {measure}</h4>
            <ResponsiveContainer>
              <PieChart margin={{ bottom: 40 }}>
                <Pie data={filteredPivot} dataKey="Export" nameKey={pivotBy} cx="50%" cy="40%" outerRadius={90} labelLine label={({name, percent}) => `${name.substring(0,8)} (${(percent*100).toFixed(0)}%)`}>
                  {filteredPivot.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                </Pie>
                <Tooltip formatter={fNum}/>
                <Legend verticalAlign="bottom" align="center" layout="horizontal" wrapperStyle={{ fontSize: '10px', bottom: 10 }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div>
            <h4 style={{color: COLORS.secondary}}>Anomaly & Risk Detection Guide</h4>
            <div style={{fontSize: 12, background: COLORS.warning, padding: 15, borderRadius: 8, lineHeight: 1.6}}>
              <strong>Red Flag Threshold:</strong> Items below 0.85x ratio (15% loss) represent severe risk outliers requiring audit.
            </div>
            <table style={{width:'100%', fontSize: 13, borderCollapse:'collapse', marginTop: 15}}>
              <thead>
                <tr style={{background:COLORS.secondary, color:'#fff'}}><th style={{padding:8, textAlign:'left'}}>Outlier Item</th><th style={{padding:8, textAlign:'right'}}>Ratio</th></tr>
              </thead>
              <tbody>
                {filteredPivot.filter(r => r["Is Anomaly"]).map((r, i) => (
                  <tr key={i} style={{background: '#fff3f3', borderBottom:'1px solid #ddd'}}>
                    <td style={{padding:8}}>{r[pivotBy]}</td><td style={{padding:8, textAlign:'right'}}>{fNum(r["Wgt Ratio"])}x</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>




      <div data-html2canvas-ignore style={{ 
        marginTop: "50px", 
        padding: "20px", 
        background: "#2d2d2d", 
        color: "#00ff00", 
        fontFamily: "monospace", 
        fontSize: "12px", 
        borderRadius: "8px",
        overflow: "auto" 
      }}>
        <h3 style={{ color: "#fff", borderBottom: "1px solid #555" }}>🛠 Data Debugger</h3>
        <div style={{ display: "flex", gap: "20px" }}>
          <div style={{ flex: 1 }}>
            <strong>RAW DATA SAMPLE (1st Row):</strong>
            <pre>{JSON.stringify(rows[0], null, 2)}</pre>
          </div>
          <div style={{ flex: 1 }}>
            <strong>PIVOTED SAMPLE (1st Row):</strong>
            <pre>{JSON.stringify(filteredPivot[0], null, 2)}</pre>
          </div>
        </div>
      </div>
    </div>
  );
}

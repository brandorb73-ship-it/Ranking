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
      pivotMap[key][type] += Number(r[measure] || 0);
      if (type === "Export") {
        pivotMap[key].ExpQty += Number(r["Quantity"] || 0);
        pivotMap[key].ExpWgt += Number(r["Weight(Kg)"] || 0);
      } else {
        pivotMap[key].ImpQty += Number(r["Quantity"] || 0);
        pivotMap[key].ImpWgt += Number(r["Weight(Kg)"] || 0);
      }
    });

    return Object.values(pivotMap).map(r => {
      const grandTotal = r.Export + r.Import;
      const wgtRatio = r.ImpWgt > 0 ? (r.ExpWgt / r.ImpWgt) : 0;
      const qtyRatio = r.ImpQty > 0 ? (r.ExpQty / r.ImpQty) : 0;
      const leakageLoss = qtyRatio < 1 ? r.Import * (1 - qtyRatio) : 0;

      return {
        ...r,
        "Grand Total": grandTotal,
        Difference: Math.abs(r.Export - r.Import),
        "Import %": grandTotal ? (r.Import / grandTotal) * 100 : 0,
        "Export %": grandTotal ? (r.Export / grandTotal) * 100 : 0,
        "Wgt Ratio": wgtRatio,
        "Qty Ratio": qtyRatio,
        "Leakage Loss": leakageLoss,
        "Is Anomaly": wgtRatio < 0.85 || wgtRatio > 1.15 || qtyRatio < 0.85
      };
    }).sort((a, b) => b.Export - a.Export);
  }, [rows, pivotBy, measure]);

  const filteredPivot = useMemo(() => {
    if (selectedItems.length === 0) return allPivotData;
    return allPivotData.filter(item => selectedItems.includes(item[pivotBy]));
  }, [allPivotData, selectedItems, pivotBy]);

  const grandTotals = useMemo(() => {
    return filteredPivot.reduce((acc, r) => {
      acc.Export += r.Export; acc.Import += r.Import; acc.GrandTotal += r["Grand Total"];
      acc.ExpQty += r.ExpQty; acc.ImpQty += r.ImpQty; acc.ExpWgt += r.ExpWgt; acc.ImpWgt += r.ImpWgt;
      acc.Difference += r.Difference; acc.LeakageLoss += r["Leakage Loss"];
      return acc;
    }, { Export: 0, Import: 0, GrandTotal: 0, ExpQty: 0, ImpQty: 0, ExpWgt: 0, ImpWgt: 0, Difference: 0, LeakageLoss: 0 });
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
                  <td style={{ textAlign: "right" }}>{fNum(r.Difference)}</td>
                  <td style={{ textAlign: "right" }}>{fNum(r["Import %"])}%</td>
                  <td style={{ textAlign: "right", padding: "12px" }}>{fNum(r["Export %"])}%</td>
                </tr>
              );
            })}
          </tbody>
          <tfoot style={{ background: COLORS.footer, fontWeight: "bold" }}>
            <tr><td colSpan={2} style={{ padding: "12px" }}>TOTAL</td><td style={{ textAlign: "right" }}>{fNum(grandTotals.Export)}</td><td style={{ textAlign: "right" }}>{fNum(grandTotals.Import)}</td><td style={{ textAlign: "right" }}>{fNum(grandTotals.Difference)}</td><td style={{ textAlign: "right" }}>{fNum((grandTotals.Import / grandTotals.GrandTotal) * 100)}%</td><td style={{ textAlign: "right", padding: "12px" }}>{fNum((grandTotals.Export / grandTotals.GrandTotal) * 100)}%</td></tr>
          </tfoot>
        </table>

        <div style={{ height: 250, marginTop: 40 }}>
          <ResponsiveContainer><BarChart data={filteredPivot.slice(0, 10)} margin={{ left: 60 }}><XAxis dataKey={pivotBy}/><YAxis tickFormatter={fNum}/><Tooltip formatter={fNum}/><Legend/><Bar dataKey="Export" fill={COLORS.primary}/><Bar dataKey="Import" fill={COLORS.secondary}/></BarChart></ResponsiveContainer>
        </div>
        <div style={{ height: 200, marginTop: 20 }}>
          <ResponsiveContainer><LineChart data={filteredPivot.slice(0, 10)} margin={{ left: 60 }}><XAxis dataKey={pivotBy}/><YAxis tickFormatter={fNum}/><CartesianGrid strokeDasharray="3 3"/><Tooltip formatter={fNum}/><Line type="monotone" dataKey="Difference" stroke={COLORS.accent} strokeWidth={3}/></LineChart></ResponsiveContainer>
        </div>
      </div>

      {/* PAGE 2: HUB WEIGHT ANALYSIS & TREND */}
      <div ref={p2} style={{ background: "#fff", padding: "50px", marginBottom: "30px", border: "1px solid #ddd" }}>
        <h2 style={{ color: COLORS.primary }}>HUB THROUGHPUT & AUDIT INTERPRETATION</h2>
        <div style={{ display: "flex", gap: 20, background: COLORS.footer, padding: 25, marginBottom: 30, borderRadius: 8 }}>
           <div style={{flex:1, textAlign:'center'}}><strong>Qty Pass-thru</strong><div style={{fontSize:24}}>{fNum(grandTotals.ExpQty/grandTotals.ImpQty)}x</div></div>
           <div style={{flex:1, textAlign:'center'}}><strong>Weight Pass-thru</strong><div style={{fontSize:24}}>{fNum(grandTotals.ExpWgt/grandTotals.ImpWgt)}x</div></div>
           <div style={{flex:1, textAlign:'center', color: COLORS.secondary}}><strong>Leakage Loss ($)</strong><div style={{fontSize:24}}>${fNum(grandTotals.LeakageLoss)}</div></div>
        </div>

        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "14px", marginBottom: 40 }}>
          <thead>
            <tr style={{ background: "#457b9d", color: "#fff" }}>
              <th style={{ textAlign: "left", padding: "10px" }}>{pivotBy}</th>
              <th style={{ textAlign: "right" }}>Qty Ratio</th>
              <th style={{ textAlign: "right" }}>Wgt Ratio</th>
              <th style={{ textAlign: "right", padding: "10px" }}>Leakage Loss ($)</th>
            </tr>
          </thead>
          <tbody>
            {filteredPivot.map((r, i) => (
              <tr key={i} style={{ borderBottom: "1px solid #eee" }}>
                <td style={{ padding: "10px" }}>{r[pivotBy]}</td>
                <td style={{ textAlign: "right" }}>{fNum(r["Qty Ratio"])}x</td>
                <td style={{ textAlign: "right" }}>{fNum(r["Wgt Ratio"])}x</td>
                <td style={{ textAlign: "right", padding: "10px", color: COLORS.secondary }}>${fNum(r["Leakage Loss"])}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <div style={{ height: 300, marginBottom: 40 }}>
          <ResponsiveContainer>
            <ComposedChart data={filteredPivot.slice(0, 10)} margin={{ left: 60 }}>
              <XAxis dataKey={pivotBy}/><YAxis tickFormatter={fNum}/><Tooltip formatter={fNum}/><Legend/><Bar dataKey="Qty Ratio" fill={COLORS.accent}/><Line type="monotone" dataKey="Wgt Ratio" stroke={COLORS.primary} strokeWidth={2}/><ReferenceLine y={1} stroke="red" label="1.0 Equil."/></ComposedChart>
          </ResponsiveContainer>
        </div>

        <div style={{ height: 200, marginBottom: 20 }}>
          <ResponsiveContainer>
            <AreaChart data={filteredPivot.slice(0, 10)} margin={{ left: 60 }}>
              <CartesianGrid strokeDasharray="3 3"/><XAxis dataKey={pivotBy}/><YAxis tickFormatter={fNum}/><Tooltip formatter={fNum}/><Area type="monotone" dataKey="Leakage Loss" stroke={COLORS.secondary} fill={COLORS.secondary} fillOpacity={0.1}/></AreaChart>
          </ResponsiveContainer>
        </div>

        <div style={{ marginTop: 25, padding: 20, background: "#fdfdfd", borderLeft: `5px solid ${COLORS.primary}`, fontSize: 13, lineHeight: 1.6 }}>
          <strong>DETAILED HUB AUDIT GUIDE:</strong><br/>
          • <strong>Ratio = 1.00 (Perfect Transit):</strong> The hub is acting as a pure pass-thru; mass in equals mass out perfectly.<br/>
          • <strong>Ratio &gt; 1.00 (Value Addition):</strong> Mass has increased during transit. This is expected if packaging or pallets were added at the hub.<br/>
          • <strong>Ratio &lt; 1.00 (Physical Leakage):</strong> Mass has been lost in transit. Indicates shrinkage, damage, or unrecorded inventory drift.<br/>
          • <strong>Leakage Value ($):</strong> The financial cost of the units lost between import and export.
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
    </div>
  );
}
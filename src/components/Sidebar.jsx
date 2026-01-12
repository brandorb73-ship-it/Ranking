export default function Sidebar({ reports, onSelect }) {
  return (
    <div className="sidebar">
      <h3>Reports</h3>

      <h4>Exporter Ranking</h4>
      {reports
        .filter(r => r.type === "Exporter")
        .map(r => (
          <div key={r.title} onClick={() => onSelect(r)}>
            {r.title}
          </div>
        ))}

      <h4>Importer Ranking</h4>
      {reports
        .filter(r => r.type === "Importer")
        .map(r => (
          <div key={r.title} onClick={() => onSelect(r)}>
            {r.title}
          </div>
        ))}
    </div>
  );
}

export default function Header({ clients, setClients, onAddReport }) {
  const [newClient, setNewClient] = useState("");

  const handleAddClient = () => {
    if (newClient && !clients.includes(newClient)) {
      setClients([...clients, newClient]);
      setNewClient("");
    }
  };

  return (
    <div className="header">
      <input className="search-input" placeholder="Search reports..." />
      <div className="header-buttons">
        <input
          className="client-input"
          placeholder="New Client"
          value={newClient}
          onChange={(e) => setNewClient(e.target.value)}
        />
        <button className="btn" onClick={handleAddClient}>Add Client</button>
        <button className="btn primary" onClick={onAddReport}>Add Report</button>
      </div>
    </div>
  );
}

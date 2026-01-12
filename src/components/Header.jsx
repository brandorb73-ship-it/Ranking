import React from "react";

export default function Header({ clients, setClients, onAddReport }) {
  return (
    <div className="header">
      <div>
        <button onClick={onAddReport}>Add Report</button>
        <button onClick={() => {
          const name = prompt("Enter new client name:");
          if (name) setClients([...clients, name]);
        }}>Add Client</button>
      </div>
      <div>Total Clients: {clients.length}</div>
    </div>
  );
}

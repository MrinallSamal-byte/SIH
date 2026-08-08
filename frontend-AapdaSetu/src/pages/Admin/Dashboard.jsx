const AdminDashboard = () => {
  // Mock data - in a real app, this would come from an API via a context or hook.
  const stats = {
    activeSOS: 12,
    volunteersAvailable: 45,
    shelterOccupancy: 75, // percentage
  };

  const recentSOS = [
    { id: "SOS-001", location: "Sector 5", priority: "High", time: "2m ago" },
    {
      id: "SOS-002",
      location: "Greenwood Park",
      priority: "High",
      time: "5m ago",
    },
    {
      id: "SOS-003",
      location: "Downtown Bridge",
      priority: "Medium",
      time: "15m ago",
    },
  ];

  const activeVolunteers = [
    { id: "VOL-101", name: "Anjali Sharma", task: "Medical Supply Delivery" },
    { id: "VOL-102", name: "Raj Patel", task: "Debris Clearance" },
    { id: "VOL-103", name: "Priya Singh", task: "Standby" },
  ];

  // --- Basic Styling ---
  const dashboardStyle = {
    fontFamily: "sans-serif",
    color: "#333",
  };

  const statsGridStyle = {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(250px, 1fr))",
    gap: "1.5rem",
    marginBottom: "2rem",
  };

  const statCardStyle = {
    backgroundColor: "white",
    padding: "1.5rem",
    borderRadius: "8px",
    boxShadow: "0 4px 8px rgba(0,0,0,0.05)",
  };

  const statValueStyle = {
    fontSize: "2.5rem",
    fontWeight: "bold",
    color: "#007bff",
    margin: 0,
  };

  const statLabelStyle = {
    fontSize: "1rem",
    color: "#666",
    margin: "0.25rem 0 0 0",
  };

  const columnsContainerStyle = {
    display: "flex",
    gap: "2rem",
    flexWrap: "wrap",
  };

  const columnStyle = {
    flex: 1,
    minWidth: "300px",
  };

  const listStyle = {
    listStyle: "none",
    padding: 0,
    margin: 0,
    backgroundColor: "white",
    borderRadius: "8px",
    boxShadow: "0 4px 8px rgba(0,0,0,0.05)",
  };

  const listItemStyle = {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "1rem 1.5rem",
    borderBottom: "1px solid #f0f0f0",
  };

  return (
    <div style={dashboardStyle}>
      <header style={{ marginBottom: "2rem" }}>
        <h1>Admin Dashboard</h1>
        <p>Overview of the current disaster response status.</p>
      </header>

      {/* Statistics Cards */}
      <section style={statsGridStyle}>
        <div style={statCardStyle}>
          <p style={statValueStyle}>{stats.activeSOS}</p>
          <p style={statLabelStyle}>Active SOS Alerts</p>
        </div>
        <div style={statCardStyle}>
          <p style={statValueStyle}>{stats.volunteersAvailable}</p>
          <p style={statLabelStyle}>Available Volunteers</p>
        </div>
        <div style={statCardStyle}>
          <p style={statValueStyle}>{stats.shelterOccupancy}%</p>
          <p style={statLabelStyle}>Shelter Occupancy</p>
        </div>
      </section>

      {/* Columns for Recent Activity */}
      <section style={columnsContainerStyle}>
        <div style={columnStyle}>
          <h2>Recent SOS Alerts</h2>
          <ul style={listStyle}>
            {recentSOS.map((sos) => (
              <li key={sos.id} style={listItemStyle}>
                <div>
                  <strong>{sos.id}</strong> ({sos.location})
                </div>
                <span
                  style={{
                    color: sos.priority === "High" ? "#dc3545" : "#ffc107",
                  }}
                >
                  {sos.priority}
                </span>
              </li>
            ))}
          </ul>
        </div>

        <div style={columnStyle}>
          <h2>Active Volunteers</h2>
          <ul style={listStyle}>
            {activeVolunteers.map((vol) => (
              <li key={vol.id} style={listItemStyle}>
                <div>
                  <strong>{vol.name}</strong>
                  <p style={{ margin: 0, fontSize: "0.9rem", color: "#666" }}>
                    {vol.task}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </section>
    </div>
  );
};

export default AdminDashboard;

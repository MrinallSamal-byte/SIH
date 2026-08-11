const VolunteerDashboard = () => {
  // Mock data for assigned tasks - in a real app, this would come from an API.
  const mockTasks = [
    {
      id: 1,
      title: "Deliver Medical Supplies",
      location: "Shelter B, Sector 7",
      priority: "High",
      status: "Assigned",
    },
    {
      id: 2,
      title: "Assist in Debris Clearance",
      location: "Greenwood Park, Sector 5",
      priority: "Medium",
      status: "Assigned",
    },
    {
      id: 3,
      title: "Distribute Food Packets",
      location: "Community Hall",
      priority: "Low",
      status: "Completed",
    },
  ];

  // --- Basic Styling ---
  const dashboardStyle = {
    fontFamily: "sans-serif",
  };

  const headerStyle = {
    paddingBottom: "1rem",
    borderBottom: "1px solid #eee",
    marginBottom: "2rem",
  };

  const tasksContainerStyle = {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))",
    gap: "1.5rem",
  };

  const cardStyle = {
    backgroundColor: "white",
    padding: "1.5rem",
    borderRadius: "8px",
    boxShadow: "0 4px 8px rgba(0,0,0,0.1)",
    borderLeft: "5px solid #007bff",
  };

  const cardHeaderStyle = {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "1rem",
  };

  const priorityStyle = (priority) => ({
    backgroundColor: priority === "High" ? "#dc3545" : priority === "Medium" ? "#ffc107" : "#28a745",
    color: "white",
    padding: "0.25rem 0.75rem",
    borderRadius: "12px",
    fontSize: "0.8rem",
    fontWeight: "bold",
  });

  return (
    <div style={dashboardStyle}>
      <header style={headerStyle}>
        <h1>Volunteer Dashboard</h1>
        <p>Welcome back! Here are your tasks for today.</p>
      </header>

      <section>
        <h2>Your Assigned Tasks</h2>
        <div style={tasksContainerStyle}>
          {mockTasks.map((task) => (
            <div key={task.id} style={{...cardStyle, opacity: task.status === 'Completed' ? 0.6 : 1}}>
              <div style={cardHeaderStyle}>
                <h3 style={{ margin: 0 }}>{task.title}</h3>
                <span style={priorityStyle(task.priority)}>{task.priority}</span>
              </div>
              <p style={{ margin: 0, color: "#555" }}>Location: {task.location}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
};

export default VolunteerDashboard;

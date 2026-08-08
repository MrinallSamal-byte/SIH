const CitizenSOS = () => {
  return (
    <div>
      <h1>Emergency SOS</h1>
      <p>
        If you are in danger, press the button below to send an alert to the
        authorities.
      </p>
      <button
        style={{
          padding: "2rem",
          fontSize: "1.5rem",
          backgroundColor: "red",
          color: "white",
          border: "none",
          borderRadius: "50%",
        }}
      >
        SOS
      </button>
    </div>
  );
};

export default CitizenSOS;

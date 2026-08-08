import { useEffect, useRef } from "react";
import { Outlet } from "react-router-dom";
import "leaflet/dist/leaflet.css";
import Navbar from "../components/common/Navbar.jsx";
import Footer from "../components/common/Footer.jsx";

const MainLayout = () => {
  const mapRef = useRef(null);

  useEffect(() => {
    let map;
    // Dynamically import Leaflet to avoid SSR issues
    import("leaflet")
      .then((L) => {
        if (mapRef.current && !mapRef.current._leaflet_id) {
          map = L.map(mapRef.current, {
            center: [22.5937, 78.9629], // Centered on India
            zoom: 4.5,
            zoomControl: false,
            dragging: false,
            scrollWheelZoom: false,
            attributionControl: false,
          });

          L.tileLayer(
            "https://{s}.basemaps.cartocdn.com/dark_nolabels/{z}/{x}/{y}{r}.png",
            { maxZoom: 19 },
          ).addTo(map);

          const majorCities = [
            { name: "Delhi", coords: [28.6139, 77.209] },
            { name: "Mumbai", coords: [19.076, 72.8777] },
            { name: "Kolkata", coords: [22.5726, 88.3639] },
            { name: "Chennai", coords: [13.0827, 80.2707] },
            { name: "Bengaluru", coords: [12.9716, 77.5946] },
            { name: "Hyderabad", coords: [17.385, 78.4867] },
          ];

          const disasterHotspots = [
            { name: "Uttarakhand", coords: [30.0668, 79.0193] },
            { name: "Odisha Coast", coords: [19.8135, 85.8312] },
          ];

          const glowIcon = L.divIcon({
            className: "leaflet-div-icon",
            html: `<div class="w-2 h-2 bg-blue-400 rounded-full shadow-[0_0_8px_2px_#2563EB]"></div>`,
            iconSize: [8, 8],
            iconAnchor: [4, 4],
          });

          const pulseIcon = L.divIcon({
            className: "leaflet-div-icon pulse-marker",
            html: `<div class="w-3 h-3 bg-red-500 rounded-full"></div>`,
            iconSize: [12, 12],
            iconAnchor: [6, 6],
          });

          majorCities.forEach((city) =>
            L.marker(city.coords, { icon: glowIcon }).addTo(map),
          );
          disasterHotspots.forEach((spot) =>
            L.marker(spot.coords, { icon: pulseIcon }).addTo(map),
          );
        }
      })
      .catch((e) => console.error("Error loading Leaflet:", e));

    return () => {
      if (map) map.remove();
    };
  }, []);

  return (
    <div className="relative w-full text-white font-sans">
      {/* Common Map Background */}
      <div
        ref={mapRef}
        className="fixed inset-0 z-0 h-full w-full"
        style={{ zIndex: -1 }}
      />
      <div className="fixed inset-0 z-0 bg-black/60" style={{ zIndex: -1 }} />

      {/* Main Content */}
      <div className="relative z-10">
        <Navbar />
        <main>
          <Outlet />
        </main>
        <Footer />
      </div>
    </div>
  );
};

export default MainLayout;

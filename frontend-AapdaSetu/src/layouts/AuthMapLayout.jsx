import { useEffect, useRef } from "react";
import { Outlet } from "react-router-dom";
import "leaflet/dist/leaflet.css";

const AuthMapLayout = () => {
  const mapRef = useRef(null);

  useEffect(() => {
    let map;
    import("leaflet")
      .then((L) => {
        if (mapRef.current && !mapRef.current._leaflet_id) {
          map = L.map(mapRef.current, {
            center: [22.5937, 78.9629],
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
          ];

          const glowIcon = L.divIcon({
            className: "leaflet-div-icon",
            html: `<div class="w-2 h-2 bg-blue-400 rounded-full shadow-[0_0_8px_2px_#2563EB]"></div>`,
            iconSize: [8, 8],
            iconAnchor: [4, 4],
          });

          majorCities.forEach((city) =>
            L.marker(city.coords, { icon: glowIcon }).addTo(map),
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

      {/* Page content will be rendered here */}
      <main className="relative z-10">
        <Outlet />
      </main>
    </div>
  );
};

export default AuthMapLayout;

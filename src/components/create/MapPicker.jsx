import { GoogleMap, useLoadScript, Marker } from "@react-google-maps/api";
import { useState, useCallback, useEffect } from "react";

const containerStyle = {
  width: "100%",
  height: "400px",
};

export default function MapPicker({ 
  defaultLocation = null, 
  onSelectLocation, 
  editable = true 
}) {
  const { isLoaded } = useLoadScript({
    googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_KEY,
  });

  const [marker, setMarker] = useState(defaultLocation);

  useEffect(() => {
    if (defaultLocation) setMarker(defaultLocation);
  }, [defaultLocation]);

  const onMapClick = useCallback((e) => {
    if (!editable) return; // ← Disable clicking if map is read-only

    const lat = e.latLng.lat();
    const lng = e.latLng.lng();

    const newMarker = { lat, lng };
    setMarker(newMarker);
    if (onSelectLocation) onSelectLocation(newMarker);
  }, [editable]);

  if (!isLoaded) return <div>Loading Map...</div>;

  return (
    <GoogleMap
      zoom={14}
      center={marker || {lat: 13.0724, lng: 80.2460}}
      mapContainerStyle={containerStyle}
      onClick={onMapClick}
      options={{
        draggableCursor: editable ? "pointer" : "default",
        disableDefaultUI: !editable,    // optional (hides controls)
        gestureHandling: editable ? "auto" : "none", // stop dragging map
      }}
    >
      {marker && <Marker position={marker} />}
    </GoogleMap>
  );
}
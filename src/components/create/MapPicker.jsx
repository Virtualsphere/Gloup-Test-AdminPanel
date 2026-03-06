import {
  GoogleMap,
  Marker,
  Circle,
  useLoadScript,
  Autocomplete,
} from "@react-google-maps/api";
import { useState, useCallback, useEffect } from "react";

const containerStyle = {
  width: "100%",
  height: "400px",
};

const fallbackCenter = { lat: 13.0724, lng: 80.2460 };

export default function MapPicker({
  defaultLocation = null,
  radiusKm = 0,
  onSelectLocation,
  editable = true,
}) {
  const { isLoaded } = useLoadScript({
    googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_KEY,
    libraries: ["places"],
  });

  const [marker, setMarker] = useState(defaultLocation);
  const [autocomplete, setAutocomplete] = useState(null);

  useEffect(() => {
    if (defaultLocation) setMarker(defaultLocation);
  }, [defaultLocation]);

  useEffect(() => {
    if (
      defaultLocation &&
      !isNaN(defaultLocation.lat) &&
      !isNaN(defaultLocation.lng)
    ) {
      setMarker({
        lat: Number(defaultLocation.lat),
        lng: Number(defaultLocation.lng),
      });
    }
  }, [defaultLocation]);

  const onMapClick = useCallback(
    (e) => {
      if (!editable) return;
      const lat = e.latLng.lat();
      const lng = e.latLng.lng();
      const loc = { lat, lng };
      setMarker(loc);
      onSelectLocation(loc);
    },
    [editable, onSelectLocation]
  );

  const onPlaceChanged = () => {
    if (!autocomplete) return;
    const place = autocomplete.getPlace();
    if (!place.geometry) return;

    const loc = {
      lat: place.geometry.location.lat(),
      lng: place.geometry.location.lng(),
    };

    setMarker(loc);
    onSelectLocation(loc);
  };

  if (!isLoaded) return <div>Loading Map...</div>;

  return (
    <>
      {/* 🔍 Search */}
      {editable && (
        <Autocomplete onLoad={setAutocomplete} onPlaceChanged={onPlaceChanged}>
          <input
            type="text"
            placeholder="Search location"
            className="border border-gray-300 px-3 py-2 rounded-md w-full mb-2"
          />
        </Autocomplete>
      )}

      <GoogleMap
        zoom={14}
        center={marker ?? fallbackCenter}
        mapContainerStyle={containerStyle}
        onClick={onMapClick}
      >
        {marker && <Marker position={marker} />}

        {/* 🔵 Radius Circle */}
        {marker && radiusKm > 0 && (
          <Circle
            center={marker}
            radius={radiusKm * 1000}
            options={{
              fillColor: "#3B82F6",
              fillOpacity: 0.15,
              strokeColor: "#3B82F6",
              strokeOpacity: 0.6,
              strokeWeight: 2,
            }}
          />
        )}
      </GoogleMap>
    </>
  );
}

// The one options object for every useLoadScript() call in the app.
//
// The loader re-injects the Maps script (and logs a warning) whenever the
// options differ from what is already on the page, so every map - MapPicker,
// the Deep User Insights heat map - must pass exactly this. Keep `libraries` a
// module-level array: a new array per render also counts as "different".
export const GOOGLE_MAPS_LOADER = {
  googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_KEY,
  libraries: ["places"],
};

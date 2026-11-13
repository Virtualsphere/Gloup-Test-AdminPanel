// The one options object for every useLoadScript() call in the app.
//
// The loader re-injects the Maps script (and logs a warning) whenever the
// options differ from what is already on the page, so every map - MapPicker,
// the Deep User Insights heat map - must pass exactly this. Keep `libraries` a
// module-level array: a new array per render also counts as "different".
const KEY = (import.meta.env.VITE_GOOGLE_MAPS_KEY || "").trim();

export const GOOGLE_MAPS_LOADER = {
  googleMapsApiKey: KEY,
  libraries: ["places"],
};

// A real Maps key is URL-safe ([A-Za-z0-9_-]). Anything else, such as a
// placeholder like "<your key here>", is URL-encoded in the script tag. The
// loader then sees its own tag as a different script and loads Maps a second
// time, the two copies break each other, and the map stays blank instead of
// failing visibly. Pages check this and show "Map unavailable" instead.
export const HAS_MAPS_KEY = /^[\w-]+$/.test(KEY);

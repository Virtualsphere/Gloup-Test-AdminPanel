import { useEffect, useRef } from "react";
import { useDispatch } from "react-redux";
import { toast } from "react-hot-toast";
import {
  applyLiveStatsFromSSE,
  setLiveStatsRealtime,
} from "../../redux/slices/dashboardSlice";

/**
 * Admin SSE: new bookings + real-time LIVE_STATS presence counts.
 * Falls back to reconnect every 5s on error.
 */
const UseBookingSSE = () => {
  const esRef = useRef(null);
  const dispatch = useDispatch();

  useEffect(() => {
    const token = localStorage.getItem("token");
    const base = import.meta.env.VITE_API_BASE_URL;
    if (!token || !base) return undefined;

    const url = `${base}/admin/app/bookings/sse?adminauth=${encodeURIComponent(token)}`;
    let closed = false;

    const connect = () => {
      if (closed) return;
      console.log("SSE connecting to:", url);
      const es = new EventSource(url);
      esRef.current = es;

      es.onopen = () => {
        console.log("SSE connection opened ✅");
        dispatch(setLiveStatsRealtime(true));
      };

      es.onmessage = (e) => {
        try {
          const data = JSON.parse(e.data);

          if (data.type === "LIVE_STATS") {
            dispatch(
              applyLiveStatsFromSSE({
                active_users_now: data.active_users_now,
                active_partners_now: data.active_partners_now,
                ts: data.ts,
              })
            );
            return;
          }

          if (data.type === "NEW_BOOKING") {
            if (Notification.permission === "granted") {
              const notification = new Notification("New Booking Received!", {
                body: `Booking #${data.booking.id} — ₹${data.booking.payable_amount}`,
                icon: "/logo.png",
              });
              notification.onclick = () => {
                window.focus();
                window.location.href = "/bookings";
              };
            }

            toast.success(`New booking #${data.booking.id} received!`, {
              duration: 5000,
            });
          }
        } catch (err) {
          console.error("SSE parse error:", err);
        }
      };

      es.onerror = (err) => {
        console.error("SSE error:", err);
        dispatch(setLiveStatsRealtime(false));
        es.close();
        if (!closed) setTimeout(connect, 5000);
      };
    };

    connect();

    return () => {
      closed = true;
      dispatch(setLiveStatsRealtime(false));
      esRef.current?.close();
    };
  }, [dispatch]);
};

export default UseBookingSSE;

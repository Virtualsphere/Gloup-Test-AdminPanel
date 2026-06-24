import { useEffect, useRef } from "react";
import { toast } from "react-hot-toast";

const UseBookingSSE = () => {
  const esRef = useRef(null);

  useEffect(() => {
    const token = localStorage.getItem("token");
    const base = import.meta.env.VITE_API_BASE_URL;
    const url = `${base}/admin/app/bookings/sse?adminauth=${encodeURIComponent(token)}`;

    const connect = () => {
      console.log("SSE connecting to:", url);
      const es = new EventSource(url);
      esRef.current = es;

      es.onopen = () => {
        console.log("SSE connection opened ✅");
      };

      es.onmessage = (e) => {
        console.log("SSE message received:", e.data);
        try {
          const data = JSON.parse(e.data);

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
        es.close();
        setTimeout(connect, 5000);
      };
    };

    connect();

    return () => {
      esRef.current?.close();
    };
  }, []);
};

export default UseBookingSSE;
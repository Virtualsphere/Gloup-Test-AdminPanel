import { useEffect, useRef } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Activity, Store, UserPlus, Users, RefreshCw, Wifi, WifiOff } from "lucide-react";
import { getLiveStats } from "../../redux/slices/dashboardSlice";

/** Fallback poll when SSE is disconnected; keep light when realtime is up. */
const POLL_FALLBACK_MS = 30_000;
const POLL_NO_SSE_MS = 10_000;

const LiveStatsSection = () => {
  const dispatch = useDispatch();
  const intervalRef = useRef(null);
  const {
    liveStats,
    liveStatsLoading,
    liveStatsError,
    liveStatsLastUpdated,
    livePolling,
    liveStatsRealtime,
  } = useSelector((state) => state.dashboard);

  useEffect(() => {
    dispatch(getLiveStats());
  }, [dispatch]);

  useEffect(() => {
    clearInterval(intervalRef.current);
    if (!livePolling) return undefined;

    const ms = liveStatsRealtime ? POLL_FALLBACK_MS : POLL_NO_SSE_MS;
    intervalRef.current = setInterval(() => {
      dispatch(getLiveStats());
    }, ms);

    return () => clearInterval(intervalRef.current);
  }, [dispatch, livePolling, liveStatsRealtime]);

  const cards = [
    {
      title: "Active Users Now",
      value: liveStats?.active_users_now,
      icon: Activity,
      color: "#10B981",
      pulse: true,
    },
    {
      title: "Active Partners Now",
      value: liveStats?.active_partners_now,
      icon: Store,
      color: "#3B82F6",
      pulse: true,
    },
    {
      title: "New Users Today",
      value: liveStats?.new_users_today,
      icon: UserPlus,
      color: "#8B5CF6",
    },
    {
      title: "New Partners Today",
      value: liveStats?.new_partners_today,
      icon: Users,
      color: "#F59E0B",
    },
  ];

  const liveLabel = !livePolling
    ? "Paused"
    : liveStatsRealtime
      ? "Realtime"
      : "Polling";

  return (
    <div className="mb-6">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <div>
          <h3 className="text-lg font-semibold text-gray-800">Live Activity</h3>
          <p className="text-xs text-gray-500 mt-0.5">
            {liveStatsLastUpdated
              ? `Updated ${new Date(liveStatsLastUpdated).toLocaleTimeString()}`
              : "Fetching real-time stats..."}
            {liveStats?.presence_source
              ? ` · source: ${liveStats.presence_source}`
              : ""}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border ${
              livePolling && liveStatsRealtime
                ? "bg-green-50 text-green-700 border-green-200"
                : livePolling
                  ? "bg-amber-50 text-amber-700 border-amber-200"
                  : "bg-gray-50 text-gray-500 border-gray-200"
            }`}
          >
            {livePolling ? <Wifi size={14} /> : <WifiOff size={14} />}
            {liveLabel}
          </span>
          <button
            type="button"
            onClick={() => dispatch(getLiveStats())}
            disabled={liveStatsLoading}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50"
          >
            <RefreshCw size={14} className={liveStatsLoading ? "animate-spin" : ""} />
            Refresh
          </button>
        </div>
      </div>

      {liveStatsError && (
        <div className="mb-4 text-red-600 bg-red-50 border border-red-200 p-3 rounded-lg text-sm">
          {liveStatsError}
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {cards.map((card) => (
          <div
            key={card.title}
            className="relative bg-white rounded-2xl p-4 sm:p-5 shadow-sm border border-gray-100"
          >
            {card.pulse && Number(card.value) > 0 && (
              <span className="absolute top-4 right-4 w-2.5 h-2.5 rounded-full bg-green-500 animate-pulse" />
            )}
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs sm:text-sm text-gray-500">{card.title}</p>
                <p className="text-xl sm:text-2xl font-bold text-gray-900 mt-1">
                  {card.value == null ? "—" : Number(card.value).toLocaleString("en-IN")}
                </p>
              </div>
              <div
                className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl flex items-center justify-center"
                style={{ backgroundColor: `${card.color}20` }}
              >
                <card.icon size={20} style={{ color: card.color }} />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default LiveStatsSection;

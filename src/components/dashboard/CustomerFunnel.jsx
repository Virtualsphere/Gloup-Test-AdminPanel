import { useNavigate } from "react-router-dom";
import { TrendingUp, Calendar, Wallet, Heart } from "lucide-react";

// Left/right inset (%) at each of the 6 boundaries between/around the 5
// bands, stepping inward so the stack reads as one continuous tapering
// funnel silhouette (fixed visual taper, not proportional to real counts —
// real ratios here would make the later bands nearly invisible).
const BOUNDARY_INSETS = [0, 7, 15, 24, 34, 45];

const STAGE_COLORS = ["#8B5CF6", "#3B82F6", "#10B981", "#F59E0B", "#EF4444"];

const CustomerFunnel = ({ data }) => {
  const navigate = useNavigate();

  if (!data || !Array.isArray(data.stages) || data.stages.length === 0) {
    return null;
  }

  const goToStage = (minBookings) => {
    navigate(`/allusers?min_bookings=${minBookings}`);
  };

  const statTiles = [
    {
      label: "Avg Bookings / User",
      value: data.avg_bookings_per_user ?? 0,
      icon: TrendingUp,
      color: "#8B5CF6",
    },
    {
      label: "Avg Days Between Visits",
      value: data.avg_days_between_visits ?? 0,
      icon: Calendar,
      color: "#10B981",
    },
    {
      label: "Avg Order Value",
      value: `₹${data.avg_order_value ?? 0}`,
      icon: Wallet,
      color: "#F59E0B",
    },
    {
      label: "Customer Lifetime Value",
      value: `₹${data.avg_clv ?? 0}`,
      icon: Heart,
      color: "#EF4444",
    },
  ];

  return (
    <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
      <div className="mb-4">
        <h3 className="text-base sm:text-lg font-bold text-gray-900">Customer Funnel</h3>
        <p className="text-xs sm:text-sm text-gray-500">From first visit to loyalty — click a stage to see those users</p>
      </div>

      <div className="flex flex-col">
        {data.stages.map((stage, index) => {
          const topInset = BOUNDARY_INSETS[index];
          const bottomInset = BOUNDARY_INSETS[index + 1];
          const color = STAGE_COLORS[index % STAGE_COLORS.length];

          return (
            <button
              key={stage.key}
              type="button"
              onClick={() => goToStage(stage.min_bookings)}
              className="relative w-full h-16 sm:h-20 flex items-center justify-center text-white transition hover:brightness-110 cursor-pointer"
              style={{
                backgroundColor: color,
                clipPath: `polygon(${topInset}% 0%, ${100 - topInset}% 0%, ${100 - bottomInset}% 100%, ${bottomInset}% 100%)`,
              }}
            >
              <div className="flex items-center gap-3 sm:gap-4 px-4">
                <span className="text-xs sm:text-sm font-medium opacity-90">{stage.label}</span>
                <span className="text-base sm:text-xl font-bold">{stage.count.toLocaleString()}</span>
                <span className="text-xs sm:text-sm font-medium opacity-90">{stage.percentage}%</span>
              </div>
            </button>
          );
        })}
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mt-5">
        {statTiles.map((tile) => (
          <div
            key={tile.label}
            className="flex items-center gap-3 border border-gray-100 rounded-xl p-3"
          >
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
              style={{ backgroundColor: `${tile.color}20` }}
            >
              <tile.icon size={16} style={{ color: tile.color }} />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-bold text-gray-900 truncate">{tile.value}</p>
              <p className="text-[11px] text-gray-500 truncate">{tile.label}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default CustomerFunnel;

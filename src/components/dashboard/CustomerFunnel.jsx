import { useNavigate } from "react-router-dom";
import { Users, CalendarCheck, Repeat, Heart, Crown } from "lucide-react";

// Left/right inset (%) at each of the 6 boundaries between/around the 5
// bands, stepping inward so the stack reads as one continuous tapering
// funnel silhouette (fixed visual taper, not proportional to real counts —
// real ratios here would make the later bands nearly invisible).
const BOUNDARY_INSETS = [0, 7, 15, 24, 34, 45];

const STAGE_COLORS = ["#8B5CF6", "#3B82F6", "#10B981", "#F59E0B", "#EF4444"];
const STAGE_ICONS = [Users, CalendarCheck, Repeat, Heart, Crown];

const CustomerFunnel = ({ data }) => {
  const navigate = useNavigate();

  if (!data || !Array.isArray(data.stages) || data.stages.length === 0) {
    return null;
  }

  const goToStage = (minBookings) => {
    navigate(`/allusers?min_bookings=${minBookings}`);
  };

  return (
    <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 h-full">
      <div className="mb-4">
        <h3 className="text-base sm:text-lg font-bold text-gray-900">Booking Funnel</h3>
        <p className="text-xs sm:text-sm text-gray-500">Click a stage to see those users</p>
      </div>

      <div className="flex flex-col gap-1">
        {data.stages.map((stage, index) => {
          const topInset = BOUNDARY_INSETS[index];
          const bottomInset = BOUNDARY_INSETS[index + 1];
          const color = STAGE_COLORS[index % STAGE_COLORS.length];
          const StageIcon = STAGE_ICONS[index % STAGE_ICONS.length];

          return (
            <button
              key={stage.key}
              type="button"
              onClick={() => goToStage(stage.min_bookings)}
              className="w-full flex items-center gap-3 group cursor-pointer text-left"
            >
              {/* Numbered badge + icon + label */}
              <div className="flex items-center gap-2 w-36 sm:w-44 shrink-0">
                <span
                  className="w-6 h-6 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0"
                  style={{ backgroundColor: color }}
                >
                  {index + 1}
                </span>
                <StageIcon size={16} style={{ color }} className="shrink-0" />
                <span className="text-xs sm:text-sm font-medium text-gray-700 truncate">
                  {stage.label}
                </span>
              </div>

              {/* Trapezoid band */}
              <div
                className="relative flex-1 h-10 sm:h-12 transition group-hover:brightness-110"
                style={{
                  backgroundColor: color,
                  clipPath: `polygon(${topInset}% 0%, ${100 - topInset}% 0%, ${100 - bottomInset}% 100%, ${bottomInset}% 100%)`,
                }}
              />

              {/* Value + percentage */}
              <div className="flex items-center gap-2 w-28 sm:w-32 shrink-0 justify-end">
                <span className="text-sm sm:text-base font-bold text-gray-900">
                  {stage.count.toLocaleString()}
                </span>
                <span
                  className="text-[11px] font-semibold px-1.5 py-0.5 rounded"
                  style={{ backgroundColor: `${color}20`, color }}
                >
                  {stage.percentage}%
                </span>
              </div>
            </button>
          );
        })}
      </div>

      <div className="grid grid-cols-2 gap-3 mt-5 pt-4 border-t border-gray-100">
        <StatMini label="Avg Bookings / User" value={data.avg_bookings_per_user ?? 0} />
        <StatMini label="Avg Days Between Visits" value={data.avg_days_between_visits ?? 0} />
        <StatMini label="Avg Order Value" value={`₹${data.avg_order_value ?? 0}`} />
        <StatMini label="Lifetime Value" value={`₹${data.avg_clv ?? 0}`} />
      </div>
    </div>
  );
};

const StatMini = ({ label, value }) => (
  <div className="border border-gray-100 rounded-xl p-3">
    <p className="text-sm font-bold text-gray-900 truncate">{value}</p>
    <p className="text-[11px] text-gray-500 truncate">{label}</p>
  </div>
);

export default CustomerFunnel;

import { useNavigate } from "react-router-dom";
import { PieChart, Pie, Cell, ResponsiveContainer } from "recharts";
import { Users2 } from "lucide-react";

// min_bookings filter for segments that map cleanly onto the funnel's
// existing threshold filter; New User / Inactive have no clean single
// threshold today, so they link to the unfiltered user list.
const SEGMENT_FILTERS = {
  repeat_user: 2,
  loyal_user: 5,
  vip_user: 10,
};

const CustomerSegments = ({ data }) => {
  const navigate = useNavigate();

  if (!data || !Array.isArray(data.segments) || data.segments.length === 0) {
    return null;
  }

  const goToSegment = (key) => {
    const minBookings = SEGMENT_FILTERS[key];
    navigate(minBookings != null ? `/allusers?min_bookings=${minBookings}` : "/allusers");
  };

  return (
    <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 h-full">
      <div className="mb-4">
        <h3 className="text-base sm:text-lg font-bold text-gray-900">Customer Segments</h3>
        <p className="text-xs sm:text-sm text-gray-500">{data.total?.toLocaleString() ?? 0} total customers</p>
      </div>

      <div className="flex flex-col sm:flex-row items-center gap-4">
        <div className="relative w-40 h-40 shrink-0">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data.segments}
                dataKey="count"
                nameKey="label"
                innerRadius={48}
                outerRadius={72}
                paddingAngle={2}
                stroke="none"
              >
                {data.segments.map((segment) => (
                  <Cell
                    key={segment.key}
                    fill={segment.color}
                    className="cursor-pointer"
                    onClick={() => goToSegment(segment.key)}
                  />
                ))}
              </Pie>
            </PieChart>
          </ResponsiveContainer>
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="w-14 h-14 rounded-full bg-gray-50 flex items-center justify-center">
              <Users2 size={24} className="text-gray-400" />
            </div>
          </div>
        </div>

        <div className="flex-1 w-full space-y-2">
          {data.segments.map((segment) => (
            <button
              key={segment.key}
              type="button"
              onClick={() => goToSegment(segment.key)}
              className="w-full flex items-center justify-between text-left hover:bg-gray-50 rounded-lg px-2 py-1 transition cursor-pointer"
            >
              <div className="flex items-center gap-2 min-w-0">
                <span
                  className="w-2.5 h-2.5 rounded-full shrink-0"
                  style={{ backgroundColor: segment.color }}
                />
                <span className="text-sm text-gray-700 truncate">{segment.label}</span>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <span className="text-sm font-semibold text-gray-900">
                  {segment.count.toLocaleString()}
                </span>
                <span className="text-xs text-gray-400 w-12 text-right">{segment.percentage}%</span>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default CustomerSegments;

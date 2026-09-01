import { LineChart, Line, ResponsiveContainer } from "recharts";

const SparklineStatCard = ({ title, icon: Icon, color, series = [], suffix = "" }) => {
  const values = series.map((p) => Number(p.value) || 0);
  const latest = values[values.length - 1] ?? 0;
  const previous = values.length > 1 ? values[values.length - 2] : null;

  let changeLabel = null;
  let changeColor = "text-gray-400";
  if (previous != null) {
    if (previous === 0) {
      changeLabel = latest > 0 ? "New" : null;
      changeColor = latest > 0 ? "text-green-600" : "text-gray-400";
    } else {
      const pct = ((latest - previous) / previous) * 100;
      changeLabel = `${pct >= 0 ? "↑" : "↓"} ${Math.abs(pct).toFixed(1)}% vs last month`;
      changeColor = pct >= 0 ? "text-green-600" : "text-red-500";
    }
  }

  return (
    <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
      <div className="flex items-center justify-between mb-2">
        <div
          className="w-9 h-9 rounded-xl flex items-center justify-center"
          style={{ backgroundColor: `${color}20` }}
        >
          <Icon size={18} style={{ color }} />
        </div>
      </div>

      <p className="text-xs text-gray-500">{title}</p>
      <p className="text-xl sm:text-2xl font-bold text-gray-900">
        {latest.toLocaleString()}
        {suffix}
      </p>
      {changeLabel && <p className={`text-xs font-medium mt-0.5 ${changeColor}`}>{changeLabel}</p>}

      <div className="h-10 mt-2 -mx-1">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={series}>
            <Line
              type="monotone"
              dataKey="value"
              stroke={color}
              strokeWidth={2}
              dot={false}
              isAnimationActive={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default SparklineStatCard;

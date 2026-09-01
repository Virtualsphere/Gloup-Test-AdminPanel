import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, LabelList } from "recharts";

const formatMonthLabel = (month) => {
  if (!month) return "";
  const [, m] = month.split("-");
  return ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"][
    Number(m) - 1
  ] || month;
};

const RepeatBookingsChart = ({ data }) => {
  if (!Array.isArray(data) || data.length === 0) return null;

  const chartData = data.map((d) => ({
    month: formatMonthLabel(d.month),
    rate: d.repeat_rate,
  }));

  return (
    <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
      <div className="mb-4">
        <h3 className="text-base sm:text-lg font-bold text-gray-900">Repeat Bookings by Month</h3>
        <p className="text-xs sm:text-sm text-gray-500">% of each month's customers who had booked before</p>
      </div>

      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} margin={{ top: 20, right: 10, left: -20, bottom: 0 }}>
            <XAxis dataKey="month" tick={{ fontSize: 12, fill: "#6B7280" }} axisLine={false} tickLine={false} />
            <YAxis
              tick={{ fontSize: 12, fill: "#6B7280" }}
              axisLine={false}
              tickLine={false}
              tickFormatter={(v) => `${v}%`}
              domain={[0, (max) => Math.max(60, Math.ceil((max + 10) / 10) * 10)]}
            />
            <Tooltip formatter={(value) => [`${value}%`, "Repeat rate"]} />
            <Bar dataKey="rate" fill="#8B5CF6" radius={[6, 6, 0, 0]} maxBarSize={48}>
              <LabelList dataKey="rate" position="top" formatter={(v) => `${v}%`} fontSize={11} fill="#6B7280" />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default RepeatBookingsChart;

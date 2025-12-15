import { TrendingUp, TrendingDown } from 'lucide-react';

const StatsCard = ({ stat }) => {
  // Color styles based on color prop
  const colorStyles = {
    blue: {
      iconBg: 'bg-blue-100',
      iconText: 'text-blue-600',
      trendUpText: 'text-green-600',
      trendDownText: 'text-red-600',
    },
    green: {
      iconBg: 'bg-green-100',
      iconText: 'text-green-600',
      trendUpText: 'text-green-600',
      trendDownText: 'text-red-600',
    },
    purple: {
      iconBg: 'bg-purple-100',
      iconText: 'text-purple-600',
      trendUpText: 'text-green-600',
      trendDownText: 'text-red-600',
    },
    amber: {
      iconBg: 'bg-amber-100',
      iconText: 'text-amber-600',
      trendUpText: 'text-green-600',
      trendDownText: 'text-red-600',
    },
  };

  const styles = colorStyles[stat.color];

  return (
    <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
      <div className="flex justify-between items-start">
        <div>
          <p className="text-sm font-medium text-gray-500">{stat.title}</p>
          <h3 className="text-2xl font-bold mt-2 text-gray-800">{stat.value}</h3>
          
          {/* Trend indicator */}
          {stat.trend && (
            <div className="flex items-center mt-2">
              {stat.trendUp === true && (
                <TrendingUp size={16} className="text-green-600 mr-1" />
              )}
              {stat.trendUp === false && (
                <TrendingDown size={16} className="text-red-600 mr-1" />
              )}
              <span className={`text-xs font-medium ${
                stat.trendUp === true ? styles.trendUpText : 
                stat.trendUp === false ? styles.trendDownText : 
                'text-gray-500'
              }`}>
                {stat.trend}
              </span>
              <span className="text-xs text-gray-400 ml-1">vs last month</span>
            </div>
          )}
        </div>
        <div className={`p-3 rounded-lg ${styles.iconBg} ${styles.iconText}`}>
          {stat.icon}
        </div>
      </div>
    </div>
  );
};

export default StatsCard;
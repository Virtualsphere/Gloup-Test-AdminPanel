const EventsCard = ({ events }) => {
    return (
      <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-lg font-semibold text-gray-800">Upcoming Events</h3>
          <button className="text-sm text-blue-600 hover:text-blue-700 font-medium">
            View Calendar
          </button>
        </div>
        
        <div className="space-y-4">
          {events.map((event) => (
            <div key={event.id} className="flex items-start pb-4 border-b border-gray-100 last:border-0 last:pb-0">
              <div className="flex-shrink-0 w-10 h-11 bg-blue-50 border border-blue-100 rounded-lg flex flex-col items-center justify-center text-blue-700">
                <span className="text-xs font-medium">MAY</span>
                <span className="text-base font-bold">{event.day}</span>
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-800">{event.title}</p>
                <p className="text-xs text-gray-500 mt-0.5">{event.description}</p>
                <div className="flex items-center mt-1">
                  <span className="text-xs text-gray-400">{event.time}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };
  
  export default EventsCard;
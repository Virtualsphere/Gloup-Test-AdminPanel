import { useState } from 'react';
import DataForm from './DataForm';
import DataTable from './DataTable';

const DataPage = ({ title }) => {
  // Sample data for the table (would come from an API in a real app)
  const sampleData = Array.from({ length: 100 }, (_, i) => ({
    id: i + 1,
    name: `${title} ${i + 1}`,
    email: `${title.toLowerCase().replace(/\s+/g, '')}${i + 1}@school.edu`,
    department: ['Science', 'Arts', 'Commerce', 'Technology'][i % 4],
    status: ['Active', 'Inactive'][i % 2],
    joinDate: `${2020 + (i % 5)}-${String(i % 12 + 1).padStart(2, '0')}-${String(i % 28 + 1).padStart(2, '0')}`
  }));
  
  // State for form data (new or edit)
  const [formData, setFormData] = useState({
    id: null,
    name: '',
    email: '',
    department: '',
    status: 'Active'
  });

  // New state to track active tab
  const [activeTab, setActiveTab] = useState('table');
  
  // Function to handle adding new data
  const handleAddData = (data) => {
    console.log('Adding new data:', data);
    // In a real app, you would call an API to add the data
    // and then refresh the table data
    setActiveTab('table'); // Switch to table view after adding
  };
  
  // Function to handle updating existing data
  const handleUpdateData = (data) => {
    console.log('Updating data:', data);
    // In a real app, you would call an API to update the data
    // and then refresh the table data
    setActiveTab('table'); // Switch to table view after updating
  };
  
  // Function to handle deleting data
  const handleDeleteData = (id) => {
    console.log('Deleting data with id:', id);
    // In a real app, you would call an API to delete the data
    // and then refresh the table data
  };
  
  // Function to handle edit button click
  const handleEditClick = (data) => {
    setFormData({ ...data });
    setActiveTab('form'); // Switch to form tab when editing
  };
  
  // Function to handle add new button click
  const handleAddNewClick = () => {
    clearForm();
    setActiveTab('form'); // Switch to form tab when adding new
  };
  
  // Function to clear form (for cancel or after submit)
  const clearForm = () => {
    setFormData({
      id: null,
      name: '',
      email: '',
      department: '',
      status: 'Active'
    });
  };

  // Tab click handler
  const handleTabClick = (tab) => {
    setActiveTab(tab);
  };
  
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-800 mb-6">{title}</h2>
        
        {/* Tab Navigation */}
        <div className="flex border-b border-gray-200 mb-6">
          <button
            className={`px-4 py-2 font-medium text-sm rounded-t-lg mr-2 ${
              activeTab === 'table' 
                ? 'bg-white border border-gray-200 border-b-white text-blue-600' 
                : 'bg-gray-50 border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-100'
            }`}
            onClick={() => handleTabClick('table')}
          >
             {title}
          </button>
          <button
            className={`px-4 py-2 font-medium text-sm rounded-t-lg ${
              activeTab === 'form' 
                ? 'bg-white border border-gray-200 border-b-white text-blue-600' 
                : 'bg-gray-50 border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-100'
            }`}
            onClick={() => handleTabClick('form')}
          >
            {formData.id ? `Edit ${title}` : `Add New ${title}`}
          </button>
        </div>
        
        {/* Tab Content */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100">
          {activeTab === 'form' ? (
            <div className="p-6">
              <h3 className="text-lg font-semibold text-gray-800 mb-4">
                {formData.id ? `Edit ${title}` : `Add New ${title}`}
              </h3>
              <DataForm 
                formData={formData}
                onSubmit={formData.id ? handleUpdateData : handleAddData}
                onCancel={() => {
                  clearForm();
                  setActiveTab('table');
                }}
              />
            </div>
          ) : (
            <div>
              <div className="p-4 border-b border-gray-100">
                <button
                  className="px-4 py-2 bg-black text-white rounded-lg text-sm font-medium hover:bg-black"
                  onClick={handleAddNewClick}
                >
                  Add New {title}
                </button>
              </div>
              <DataTable 
                data={sampleData} 
                title={title} 
                onEdit={handleEditClick}
                onDelete={handleDeleteData}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default DataPage;
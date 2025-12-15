import { useState, useEffect } from 'react';
import { Save, X } from 'lucide-react';

const DataForm = ({ formData: initialFormData, onSubmit, onCancel }) => {
  const [formData, setFormData] = useState(initialFormData);
  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState({});
  
  // Update form data when initialFormData changes (for edit)
  useEffect(() => {
    setFormData(initialFormData);
    // Clear errors and touched states when form data changes
    setErrors({});
    setTouched({});
  }, [initialFormData]);
  
  // Validation function
  const validateField = (name, value) => {
    let error = '';
    
    switch (name) {
      case 'name':
        if (!value.trim()) {
          error = 'Name is required';
        } else if (value.trim().length < 3) {
          error = 'Name must be at least 3 characters';
        }
        break;
        
      case 'email':
        if (!value.trim()) {
          error = 'Email is required';
        } else if (!/^\S+@\S+\.\S+$/.test(value)) {
          error = 'Email is invalid';
        }
        break;
        
      case 'department':
        if (!value) {
          error = 'Please select a department';
        }
        break;
        
      default:
        break;
    }
    
    return error;
  };
  
  // Validate the entire form
  const validateForm = () => {
    const newErrors = {};
    let isValid = true;
    
    Object.entries(formData).forEach(([name, value]) => {
      const error = validateField(name, value);
      if (error) {
        newErrors[name] = error;
        isValid = false;
      }
    });
    
    setErrors(newErrors);
    return isValid;
  };
  
  const handleChange = (e) => {
    const { name, value } = e.target;
    
    // Update form data
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    
    // Mark field as touched
    setTouched(prev => ({
      ...prev,
      [name]: true
    }));
    
    // Validate field on change
    const error = validateField(name, value);
    setErrors(prev => ({
      ...prev,
      [name]: error
    }));
  };
  
  const handleBlur = (e) => {
    const { name } = e.target;
    
    // Mark field as touched on blur
    setTouched(prev => ({
      ...prev,
      [name]: true
    }));
  };
  
  const handleSubmit = (e) => {
    e.preventDefault();
    
    // Mark all fields as touched
    const allTouched = Object.keys(formData).reduce((acc, key) => {
      acc[key] = true;
      return acc;
    }, {});
    setTouched(allTouched);
    
    // Validate all fields before submission
    if (validateForm()) {
      onSubmit(formData);
      // Don't clear form here, let the parent component decide
    }
  };
  
  return (
    <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-6">
      <div>
        <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
          Name
        </label>
        <input
          type="text"
          id="name"
          name="name"
          value={formData.name}
          onChange={handleChange}
          onBlur={handleBlur}
          className={`w-full px-3 py-2 border ${touched.name && errors.name ? 'border-red-500' : 'border-gray-300'} rounded-md focus:outline-none focus:ring-2 ${touched.name && errors.name ? 'focus:ring-red-500' : 'focus:ring-blue-500'} text-gray-900`}
        />
        {touched.name && errors.name && (
          <p className="mt-1 text-sm text-red-500">{errors.name}</p>
        )}
      </div>
      
      <div>
        <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
          Email
        </label>
        <input
          type="email"
          id="email"
          name="email"
          value={formData.email}
          onChange={handleChange}
          onBlur={handleBlur}
          className={`w-full px-3 py-2 border ${touched.email && errors.email ? 'border-red-500' : 'border-gray-300'} rounded-md focus:outline-none focus:ring-2 ${touched.email && errors.email ? 'focus:ring-red-500' : 'focus:ring-blue-500'} text-gray-900`}
        />
        {touched.email && errors.email && (
          <p className="mt-1 text-sm text-red-500">{errors.email}</p>
        )}
      </div>
      
      <div>
        <label htmlFor="department" className="block text-sm font-medium text-gray-700 mb-1">
          Department
        </label>
        <select
          id="department"
          name="department"
          value={formData.department}
          onChange={handleChange}
          onBlur={handleBlur}
          className={`w-full px-3 py-2 border ${touched.department && errors.department ? 'border-red-500' : 'border-gray-300'} rounded-md focus:outline-none focus:ring-2 ${touched.department && errors.department ? 'focus:ring-red-500' : 'focus:ring-blue-500'} text-gray-900`}
        >
          <option value="">Select Department</option>
          <option value="Science">Science</option>
          <option value="Arts">Arts</option>
          <option value="Commerce">Commerce</option>
          <option value="Technology">Technology</option>
        </select>
        {touched.department && errors.department && (
          <p className="mt-1 text-sm text-red-500">{errors.department}</p>
        )}
      </div>
      
      <div>
        <label htmlFor="status" className="block text-sm font-medium text-gray-700 mb-1">
          Status
        </label>
        <select
          id="status"
          name="status"
          value={formData.status}
          onChange={handleChange}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
        >
          <option value="Active">Active</option>
          <option value="Inactive">Inactive</option>
        </select>
      </div>
      
      <div className="md:col-span-2 flex justify-end space-x-3">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 flex items-center border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 transition-colors"
        >
          <X size={16} className="mr-1" />
          Cancel
        </button>
        <button
          type="submit"
          className="px-4 py-2 flex items-center bg-black text-white rounded-md hover:bg-black transition-colors"
        >
          <Save size={16} className="mr-1" />
          {formData.id ? 'Update' : 'Save'}
        </button>
      </div>
    </form>
  );
};

export default DataForm;
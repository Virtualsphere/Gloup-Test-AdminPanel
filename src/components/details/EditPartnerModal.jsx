import React, { useState, useEffect } from 'react';
import { XCircle, Upload, Trash2, AlertCircle } from 'lucide-react';
import { useDispatch, useSelector } from 'react-redux';
import { useParams } from 'react-router-dom';
import { getPartnerDetail, updatePartnerStatus } from '../../redux/slices/partnersSlice';

// Edit modal component with enhanced image upload and preview
const EditPartnerModal = ({ isOpen, onClose, partnerData, onSave }) => {
  const [name, setName] = useState(partnerData?.store_details?.name || '');
  const [city, setCity] = useState(partnerData?.store_details?.city || '');
  const [imageFile, setImageFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState('');
  const [imageError, setImageError] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [location, setLocation] = useState(null);

  useEffect(() => {
    if (isOpen) {
      setName(partnerData?.store_details?.name || '');
      setCity(partnerData?.store_details?.city || '');
      
      // Set preview to existing image if any
      if (partnerData?.store_details?.images && partnerData.store_details.images.length > 0) {
        setPreviewUrl(`${import.meta.env.VITE_API_BASE_URL}/images/${partnerData.store_details.images[0]}`);
      } else {
        setPreviewUrl('');
      }
      
      setImageFile(null);
      setImageError('');
    }
  }, [partnerData, isOpen]);

  const validateImage = (file) => {
    // Check file type
    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
    if (!validTypes.includes(file.type)) {
      return 'Please upload a valid image file (JPEG, PNG, GIF, or WebP)';
    }

    // Check file size (max 5MB)
    const maxSize = 5 * 1024 * 1024; // 5MB in bytes
    if (file.size > maxSize) {
      return 'Image size must be less than 5MB';
    }

    return null;
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const error = validateImage(file);
    if (error) {
      setImageError(error);
      setImageFile(null);
      setPreviewUrl(partnerData?.store_details?.images?.[0] 
        ? `${import.meta.env.VITE_API_BASE_URL}/images/${partnerData.store_details.images[0]}`
        : '');
      return;
    }

    setImageError('');
    setImageFile(file);
    
    // Create preview URL
    const objectUrl = URL.createObjectURL(file);
    setPreviewUrl(objectUrl);

    // Clean up the URL when component unmounts or new image is selected
    return () => URL.revokeObjectURL(objectUrl);
  };

  const handleRemoveImage = () => {
    setImageFile(null);
    setPreviewUrl('');
    setImageError('');
    // Reset file input
    const fileInput = document.getElementById('image-upload');
    if (fileInput) fileInput.value = '';
  };

  const handleSave = async () => {
    // Validate required fields
    if (!name.trim()) {
      alert('Name is required');
      return;
    }
    if (!city.trim()) {
      alert('City is required');
      return;
    }

    setIsSaving(true);
    try {
      await onSave({ name: name.trim(), city: city.trim(), imageFile });
    } catch (error) {
      console.error('Save failed:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleClose = () => {
    if (!isSaving) {
      // Clean up preview URL if it's a blob URL
      if (previewUrl && previewUrl.startsWith('blob:')) {
        URL.revokeObjectURL(previewUrl);
      }
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
      <div className="bg-white rounded-lg shadow-lg w-full max-w-md p-6 relative max-h-screen overflow-y-auto">
        <button 
          onClick={handleClose} 
          disabled={isSaving}
          className="absolute top-3 right-3 text-gray-600 hover:text-gray-900 disabled:opacity-50"
          aria-label="Close edit modal"
        >
          <XCircle size={24} />
        </button>
        
        <h3 className="text-xl font-semibold mb-6 text-gray-900">Edit Partner</h3>
        
        <div className="space-y-5">
          {/* Image Upload Section */}
          <div className="flex flex-col space-y-3 pb-4 border-b border-gray-200">
            <label className="block text-sm font-semibold text-gray-700">
              Partner Image
            </label>
            
            {/* Image Preview */}
            <div className="flex items-start space-x-4">
              <div className="relative flex-shrink-0">
                {previewUrl ? (
                  <div className="relative group">
                    <img 
                      src={previewUrl} 
                      alt="Preview" 
                      className="w-24 h-24 rounded-lg object-cover border-2 border-gray-300"
                    />
                    <button
                      type="button"
                      onClick={handleRemoveImage}
                      disabled={isSaving}
                      className="absolute -top-2 -right-2 bg-red-500 text-white p-1.5 rounded-full hover:bg-red-600 disabled:opacity-50 shadow-md"
                      aria-label="Remove image"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                ) : (
                  <div className="w-24 h-24 bg-gray-100 rounded-lg flex flex-col items-center justify-center border-2 border-dashed border-gray-300">
                    <Upload size={24} className="text-gray-400 mb-1" />
                    <span className="text-xs text-gray-500">No Image</span>
                  </div>
                )}
              </div>
              
              {/* File Input */}
              <div className="flex-1 min-w-0">
                <input
                  id="image-upload"
                  type="file"
                  accept="image/jpeg,image/jpg,image/png,image/gif,image/webp"
                  onChange={handleImageChange}
                  disabled={isSaving}
                  className="block w-full text-sm text-gray-500 file:mr-3 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                />
                <p className="text-xs text-gray-500 mt-2">
                  Max 5MB • JPEG, PNG, GIF, WebP
                </p>
              </div>
            </div>

            {/* File Input */}
            <div className="w-full">
              <input
                id="image-upload"
                type="file"
                accept="image/jpeg,image/jpg,image/png,image/gif,image/webp"
                onChange={handleImageChange}
                disabled={isSaving}
                className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100 disabled:opacity-50 disabled:cursor-not-allowed"
              />
              <p className="text-xs text-gray-500 mt-1">
                Max size: 5MB. Formats: JPEG, PNG, GIF, WebP
              </p>
            </div>

            {/* File Input */}
            <div className="w-full">
              <input
                id="image-upload"
                type="file"
                accept="image/jpeg,image/jpg,image/png,image/gif,image/webp"
                onChange={handleImageChange}
                disabled={isSaving}
                className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100 disabled:opacity-50 disabled:cursor-not-allowed"
              />
              <p className="text-xs text-gray-500 mt-1">
                Max size: 5MB. Formats: JPEG, PNG, GIF, WebP
              </p>
            </div>

            {/* Image Error Message */}
            {imageError && (
              <div className="flex items-center space-x-2 text-red-600 text-sm bg-red-50 p-2 rounded-md w-full">
                <AlertCircle size={16} />
                <span>{imageError}</span>
              </div>
            )}
          </div>

          {/* Name Input */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Name <span className="text-red-500">*</span>
            </label>
            <input 
              type="text" 
              value={name} 
              onChange={(e) => setName(e.target.value)}
              disabled={isSaving}
              className="mt-1 block w-full border border-gray-300 px-3 py-2.5 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
              placeholder="Enter partner name"
            />
          </div>

          {/* City Input */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              City <span className="text-red-500">*</span>
            </label>
            <input 
              type="text" 
              value={city} 
              onChange={(e) => setCity(e.target.value)}
              disabled={isSaving}
              className="mt-1 block w-full border border-gray-300 px-3 py-2.5 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
              placeholder="Enter city"
            />
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end space-x-3 pt-4 border-t">
            <button 
              onClick={handleClose} 
              disabled={isSaving}
              className="px-4 py-2 bg-gray-200 rounded-md hover:bg-gray-300 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Cancel
            </button>
            <button 
              onClick={handleSave} 
              disabled={isSaving || !!imageError}
              className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center space-x-2"
            >
              {isSaving ? (
                <>
                  <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  <span>Saving...</span>
                </>
              ) : (
                <span>Save Changes</span>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// Main partner details component
const PartnerDetails = () => {
  const { id } = useParams();
  const dispatch = useDispatch();
  const partnerDetail = useSelector(state => state.allPartners.partnerDetail);
  const loading = useSelector(state => state.allPartners.loading);
  const error = useSelector(state => state.allPartners.error);
  const [showEditModal, setShowEditModal] = useState(false);
  const [updateError, setUpdateError] = useState('');

  useEffect(() => {
    dispatch(getPartnerDetail({ id }));
  }, [dispatch, id]);

  // Handle edit save, including image upload via FormData
  const handleSaveEdit = async ({ name, city, imageFile }) => {
    try {
      setUpdateError('');
      
      const formData = new FormData();
      formData.append('name', name);
      formData.append('city', city);
      
      if (imageFile) {
        formData.append('image', imageFile);
      }

      // Dispatch update action with FormData
      await dispatch(updatePartnerStatus({ id, data: formData })).unwrap();
      
      // Refresh partner details
      await dispatch(getPartnerDetail({ id }));
      
      // Close modal on success
      setShowEditModal(false);
    } catch (err) {
      console.error('Failed to update partner:', err);
      const errorMessage = err?.message || 'Failed to save changes. Please try again.';
      setUpdateError(errorMessage);
      alert(errorMessage);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <svg className="animate-spin h-8 w-8 text-indigo-600 mx-auto mb-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <p className="text-gray-600">Loading partner details...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center text-red-600 bg-red-50 p-6 rounded-lg">
          <AlertCircle size={48} className="mx-auto mb-2" />
          <p className="font-semibold">Error loading partner details</p>
          <p className="text-sm mt-1">{error}</p>
        </div>
      </div>
    );
  }

  if (!partnerDetail) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center text-gray-600">
          <p className="text-lg">No partner data found</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex items-start justify-between mb-6">
          <div className="flex-1">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              {partnerDetail.store_details?.name || 'Unknown Partner'}
            </h1>
            <p className="text-gray-600 flex items-center">
              <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              {partnerDetail.store_details?.city || 'Unknown City'}
            </p>
          </div>
          
          <button
            onClick={() => setShowEditModal(true)}
            className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition-colors flex items-center space-x-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
            <span>Edit Partner</span>
          </button>
        </div>

        {/* Partner Image */}
        <div className="mt-4">
          <h3 className="text-sm font-medium text-gray-700 mb-2">Partner Image</h3>
          {partnerDetail.store_details?.images?.length > 0 ? (
            <img
              src={`${import.meta.env.VITE_API_BASE_URL}/images/${partnerDetail.store_details.images[0]}`}
              alt={partnerDetail.store_details.name}
              className="w-40 h-40 rounded-xl object-cover border-2 border-gray-200 shadow-sm"
              onError={(e) => {
                e.target.onerror = null;
                e.target.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="160" height="160"%3E%3Crect fill="%23f3f4f6" width="160" height="160"/%3E%3Ctext x="50%25" y="50%25" dominant-baseline="middle" text-anchor="middle" fill="%239ca3af" font-family="sans-serif" font-size="14"%3ENo Image%3C/text%3E%3C/svg%3E';
              }}
            />
          ) : (
            <div className="w-40 h-40 bg-gray-100 flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-gray-300">
              <Upload size={32} className="text-gray-400 mb-2" />
              <span className="text-sm text-gray-500">No Image</span>
            </div>
          )}
        </div>

        {/* Update Error Message */}
        {updateError && (
          <div className="mt-4 flex items-center space-x-2 text-red-600 text-sm bg-red-50 p-3 rounded-md">
            <AlertCircle size={16} />
            <span>{updateError}</span>
          </div>
        )}
      </div>

      {/* Edit Modal */}
      <EditPartnerModal
        isOpen={showEditModal}
        onClose={() => setShowEditModal(false)}
        partnerData={partnerDetail}
        onSave={handleSaveEdit}
      />
    </div>
  );
};

export default PartnerDetails;
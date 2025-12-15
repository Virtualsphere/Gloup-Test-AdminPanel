import React from 'react';
import { X } from 'lucide-react';

const ImageModal = ({ isOpen, onClose, imageUrl }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="aspect-[16/9] w-full">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-white hover:text-gray-300 z-10 bg-black/50 rounded-full p-2"
        >
          <X size={24} />
        </button>
      
        <img
          src={imageUrl}
          alt="Full preview"
          className="w-full h-full object-contain"
        />
      </div>
    </div>
  );
};

export default ImageModal;
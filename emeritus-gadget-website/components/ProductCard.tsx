import React from 'react';
import Link from 'next/link';
import { Star } from 'lucide-react';

interface ProductCardProps {
  id: string;
  name: string;
  price: number;
  originalPrice: number;
  rating: number;
  imageFront: string;
  imageBack: string;
  colors: string[];
  description?: string;
}

export default function ProductCard({ 
  id, 
  name, 
  price, 
  originalPrice, 
  rating, 
  imageFront, 
  imageBack,
  colors,
  description
}: ProductCardProps) {
  const discount = Math.round(((originalPrice - price) / originalPrice) * 100);
  
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden transition-all duration-300 hover:shadow-lg">
      {/* Product Images */}
      <div className="relative aspect-square overflow-hidden">
        <div className="absolute inset-0 flex items-center justify-center">
          <img 
            src={imageFront} 
            alt={name}
            className="w-full h-full object-cover"
          />
          <img 
            src={imageBack} 
            alt={`${name} back view`}
            className="absolute inset-0 w-full h-full object-cover opacity-80"
          />
        </div>
      </div>

      {/* Product Info */}
      <div className="p-4">
        {/* Rating */}
        <div className="flex items-center mb-2">
          <Star className="h-4 w-4 text-yellow-400 fill-current" />
          <span className="text-sm font-medium text-gray-700 ml-1">{rating}</span>
        </div>

        {/* Product Name */}
        <h3 className="font-semibold text-gray-900 mb-2">{name}</h3>

        {/* Price */}
        <div className="flex items-center mb-4">
          <span className="text-xl font-bold text-gray-900">${price}</span>
          <span className="ml-2 text-sm text-gray-500 line-through">${originalPrice}</span>
          <span className="ml-2 bg-red-100 text-red-800 text-xs px-2 py-1 rounded-full font-medium">
            {discount}% off
          </span>
        </div>

        {/* Color Options */}
        <div className="flex gap-2 mb-4">
          {colors.map((color, index) => (
            <div
              key={index}
              className={`w-4 h-4 rounded-full border border-gray-300 ${color === 'pink' ? 'bg-pink-200' : color === 'black' ? 'bg-gray-800' : color === 'white' ? 'bg-white' : 'bg-gray-300'}`}
              title={color}
            ></div>
          ))}
        </div>

        {/* Description */}
        {description && (
          <p className="text-sm text-gray-600 mb-4 line-clamp-2">{description}</p>
        )}

        {/* Add to Cart Button */}
        <button className="w-full py-3 px-4 bg-orange-50 text-orange-600 border border-orange-200 rounded-full font-medium hover:bg-orange-100 transition-colors focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2">
          Add to Card
        </button>
      </div>
    </div>
  );
}
import React from 'react';
import Link from 'next/link';
import { getCategories } from '@/lib/data';

interface Category {
  id: string;
  name: string;
  image: string;
  count: number;
}

export default async function CategoriesSection() {
  const categories = await getCategories();
  
  return (
    <section className="max-w-7xl mx-auto px-4 py-16 sm:px-6 lg:px-8">
      <div className="flex items-center justify-between mb-8">
        <h2 className="text-3xl font-semibold text-slate-950">Shop by Categories</h2>
        <Link 
          href="/shop" 
          className="inline-flex items-center gap-2 text-sm font-semibold text-purple-700 hover:text-purple-900 transition-colors"
        >
          View All
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="m15 18-6-6 6-6"/>
          </svg>
        </Link>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-6">
        {categories.map((category) => (
          <div key={category.id} className="group flex flex-col items-center">
            <div className="relative w-20 h-20 rounded-full bg-white border border-gray-200 overflow-hidden shadow-sm mb-3 group-hover:shadow-md transition-shadow">
              <img 
                src={category.image} 
                alt={category.name}
                className="w-full h-full object-cover"
              />
            </div>
            <h3 className="text-sm font-medium text-slate-900 text-center">{category.name}</h3>
            <p className="text-xs text-slate-500 mt-1">{category.count} items</p>
          </div>
        ))}
      </div>
    </section>
  );
}
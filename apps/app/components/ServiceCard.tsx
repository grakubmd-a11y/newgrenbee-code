import React from "react";
import * as Icons from "lucide-react";
import { Service } from "@grenbee/types";

interface ServiceCardProps {
  key?: string;
  service: Service;
  onBookClick: (serviceId: string) => void;
  avgRating?: number;
  reviewsCount?: number;
}

export default function ServiceCard({ 
  service, 
  onBookClick, 
  avgRating = 4.8, 
  reviewsCount = 0 
}: ServiceCardProps) {
  // Dynamically resolve icon from list
  const IconComponent = (Icons as any)[service.iconName] || Icons.HelpCircle;

  return (
    <div id={`service-card-${service.id}`} className="group relative flex flex-col overflow-hidden rounded-2xl border border-gray-100 bg-white p-6 shadow-sm transition-all duration-300 hover:border-brand/30 hover:shadow-md hover:-translate-y-0.5">
      {/* Visual Accent Corner */}
      <div className="absolute top-0 right-0 h-24 w-24 bg-gradient-to-bl from-brand/5 to-transparent rounded-bl-full transition-all group-hover:from-brand/10"></div>
      
      {/* Header Info */}
      <div className="flex items-start justify-between">
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-brand/5 text-brand group-hover:bg-brand group-hover:text-white transition-all duration-300">
          <IconComponent size={24} strokeWidth={2} />
        </div>
        <div className="text-right">
          <span className="text-[11px] text-gray-400 font-bold uppercase tracking-wider">Starts at</span>
          <p className="text-xl font-extrabold text-gray-900 tracking-tight">
            ${service.basePrice}
          </p>
        </div>
      </div>

      {/* Title & Tagline */}
      <h3 className="mt-5 text-lg font-bold text-gray-900 tracking-tight group-hover:text-brand transition-colors">
        {service.name}
      </h3>
      <p className="mt-1 text-sm text-brand font-medium leading-relaxed">
        {service.tagline}
      </p>
      
      {/* Rating & Inclusions summary */}
      <div className="mt-3 flex items-center gap-1 text-xs text-gray-500">
        <div className="flex text-amber-400">
          {Array.from({ length: 5 }).map((_, i) => (
            <Icons.Star 
              key={i} 
              size={12} 
              fill={i < Math.floor(avgRating) ? "currentColor" : "none"} 
              className={i < Math.round(avgRating) ? "text-amber-400" : "text-gray-200"}
            />
          ))}
        </div>
        <span className="font-semibold text-gray-700">{avgRating.toFixed(1)}</span>
        <span>•</span>
        <span>{reviewsCount} verified reviews</span>
      </div>

      <p className="mt-3.5 text-xs leading-relaxed text-gray-500 line-clamp-3">
        {service.description}
      </p>

      {/* Detailed included Bullet Points */}
      <div className="mt-5 space-y-2 border-t border-gray-50 pt-4 flex-grow">
        <span className="text-[10px] text-gray-400 font-bold uppercase tracking-widest block">Service Inclusions:</span>
        <ul className="space-y-1.5">
          {service.includedSpecs.slice(0, 3).map((spec, idx) => (
            <li key={idx} className="flex items-start gap-2 text-xs text-gray-600">
              <Icons.Check size={14} className="text-brand flex-shrink-0 mt-0.5" strokeWidth={3} />
              <span className="line-clamp-1">{spec}</span>
            </li>
          ))}
          {service.includedSpecs.length > 3 && (
            <li className="text-[11px] text-gray-400 italic pl-5">
              + {service.includedSpecs.length - 3} more professional inclusions
            </li>
          )}
        </ul>
      </div>

      {/* Button Action */}
      <div className="mt-6 pt-2">
        <button
          key={`btn-book-${service.id}`}
          onClick={() => onBookClick(service.id)}
          className="w-full flex items-center justify-center gap-2 cursor-pointer rounded-xl bg-gray-50 hover:bg-brand text-gray-700 hover:text-white py-3 text-sm font-semibold border border-gray-100 hover:border-brand transition-all duration-300 shadow-sm"
        >
          <span>Calculate Estimate & Book</span>
          <Icons.ArrowRight size={15} className="transition-transform duration-300 group-hover:translate-x-1" />
        </button>
      </div>
    </div>
  );
}

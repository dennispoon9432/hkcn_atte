import React from 'react';

interface BrandLogoProps {
  size?: 'sm' | 'md' | 'lg';
  showText?: boolean;
  className?: string;
}

export const BrandLogo: React.FC<BrandLogoProps> = ({
  size = 'md',
  showText = true,
  className = '',
}) => {
  const iconSize = size === 'sm' ? 32 : size === 'lg' ? 60 : 44;

  return (
    <div className={`flex items-center gap-3 ${className}`}>
      {/* City North Rotaract Faceted Star Emblem */}
      <svg
        width={iconSize}
        height={iconSize}
        viewBox="0 0 200 200"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="shrink-0 select-none drop-shadow-sm"
      >
        {/* Background rounded subtle border for contrast */}
        <rect width="200" height="200" rx="20" fill="white" />

        {/* 
          Geometric 4-pointed faceted star reproduced accurately from Hong Kong City North Rotaract emblem:
          Emerald Green: #00A651
          Warm Orange/Amber: #F58220
          Soft Grey/White: #E2E8F0
        */}
        <g transform="translate(100, 100)">
          {/* Top-Right Quadrant */}
          <path d="M 0 0 L 10 -75 L 45 -75 Z" fill="#00A651" />
          <path d="M 0 0 L 45 -75 L 75 -45 Z" fill="#F58220" />
          <path d="M 0 0 L 75 -45 L 75 -10 Z" fill="#E2E8F0" />
          <path d="M 0 0 L 75 -10 L 75 10 Z" fill="#00A651" />

          {/* Bottom-Right Quadrant */}
          <path d="M 0 0 L 75 10 L 75 45 Z" fill="#E2E8F0" />
          <path d="M 0 0 L 75 45 L 45 75 Z" fill="#F58220" />
          <path d="M 0 0 L 45 75 L 10 75 Z" fill="#00A651" />
          <path d="M 0 0 L 10 75 L -10 75 Z" fill="#00A651" />

          {/* Bottom-Left Quadrant */}
          <path d="M 0 0 L -10 75 L -45 75 Z" fill="#00A651" />
          <path d="M 0 0 L -45 75 L -75 45 Z" fill="#E2E8F0" />
          <path d="M 0 0 L -75 45 L -75 10 Z" fill="#00A651" />
          <path d="M 0 0 L -75 10 L -75 -10 Z" fill="#F58220" />

          {/* Top-Left Quadrant */}
          <path d="M 0 0 L -75 -10 L -75 -45 Z" fill="#E2E8F0" />
          <path d="M 0 0 L -75 -45 L -45 -75 Z" fill="#00A651" />
          <path d="M 0 0 L -45 -75 L -10 -75 Z" fill="#F58220" />
          <path d="M 0 0 L -10 -75 L 10 -75 Z" fill="#00A651" />

          {/* Outer Corner Accents */}
          <polygon points="0,-82 12,-74 -12,-74" fill="#00A651" />
          <polygon points="82,0 74,12 74,-12" fill="#00A651" />
          <polygon points="0,82 -12,74 12,74" fill="#00A651" />
          <polygon points="-82,0 -74,-12 -74,12" fill="#00A651" />
        </g>
      </svg>

      {showText && (
        <div className="flex flex-col text-left leading-tight">
          <div className="font-bold text-slate-800 tracking-wide text-base flex items-center gap-0.5">
            <span>香港</span>
            <span className="text-[#F58220]">城北</span>
            <span className="text-[#00A651]">扶青社</span>
          </div>
          <div className="text-[10px] uppercase font-semibold tracking-wider text-slate-500 font-mono">
            ROTARACT <span className="text-[#F58220]">CITY</span> <span className="text-[#00A651]">NORTH</span>
          </div>
        </div>
      )}
    </div>
  );
};

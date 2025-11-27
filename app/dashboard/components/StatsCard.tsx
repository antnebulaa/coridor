'use client';

import { IconType } from "react-icons";

interface StatsCardProps {
    label: string;
    value: string | number;
    icon: IconType;
    description?: string;
}

const StatsCard: React.FC<StatsCardProps> = ({
    label,
    value,
    icon: Icon,
    description
}) => {
    return (
        <div className="
      bg-white 
      rounded-xl 
      border-[1px] 
      border-neutral-200 
      p-6 
      flex 
      flex-col 
      gap-2
      shadow-sm
    ">
            <div className="flex flex-row items-center justify-between">
                <div className="text-neutral-500 font-medium">
                    {label}
                </div>
                <Icon size={20} className="text-neutral-500" />
            </div>
            <div className="text-2xl font-medium">
                {value}
            </div>
            {description && (
                <div className="text-xs text-neutral-400">
                    {description}
                </div>
            )}
        </div>
    );
}

export default StatsCard;

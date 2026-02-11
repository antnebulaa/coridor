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
      bg-card
      rounded-xl 
      border-[1px] 
      border-border 
      p-6 
      flex 
      flex-col 
      gap-2
      shadow-sm
    ">
            <div className="flex flex-row items-center justify-between">
                <div className="text-muted-foreground font-medium">
                    {label}
                </div>
                <Icon size={20} className="text-muted-foreground" />
            </div>
            <div className="text-2xl font-medium">
                {value}
            </div>
            {description && (
                <div className="text-xs text-muted-foreground">
                    {description}
                </div>
            )}
        </div>
    );
}

export default StatsCard;

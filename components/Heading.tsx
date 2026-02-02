'use client';

interface HeadingProps {
    title: React.ReactNode;
    subtitle?: string;
    center?: boolean;
    subtitleClassName?: string;
}

const Heading: React.FC<HeadingProps> = ({ title, subtitle, center, subtitleClassName }) => {
    return (
        <div className={center ? 'text-center' : 'text-start'}>
            <div className="text-3xl font-semibold">
                {title}
            </div>
            {subtitle && (
                <div className={`font-normal text-muted-foreground whitespace-pre-wrap ${subtitleClassName || 'mt-2'}`}>
                    {subtitle}
                </div>
            )}
        </div>
    );
};

export default Heading;

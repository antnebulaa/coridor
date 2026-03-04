interface SkeletonProps {
    className?: string;
}

const Skeleton = ({ className = '' }: SkeletonProps) => (
    <div className={`animate-pulse bg-neutral-200 dark:bg-neutral-800 rounded-lg ${className}`} />
);

export default Skeleton;

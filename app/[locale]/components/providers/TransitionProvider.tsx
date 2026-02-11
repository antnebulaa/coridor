'use client';

// Transitions disabled for now - just pass through children
const TransitionProvider = ({ children }: { children: React.ReactNode }) => {
    return <>{children}</>;
};

export default TransitionProvider;

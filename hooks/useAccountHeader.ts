'use client';

import { createContext, useContext, useState, useCallback, useRef, RefObject } from 'react';

interface AccountHeaderContextValue {
    /** 0 = page title fully hidden behind bar → bar title fully visible
     *  1 = page title fully visible → bar title hidden */
    titleVisibility: number;
    setTitleVisibility: (ratio: number) => void;
    barRef: RefObject<HTMLDivElement | null>;
    scrollRef: RefObject<HTMLDivElement | null>;
}

export const AccountHeaderContext = createContext<AccountHeaderContextValue>({
    titleVisibility: 1,
    setTitleVisibility: () => {},
    barRef: { current: null },
    scrollRef: { current: null },
});

export function useAccountHeader() {
    return useContext(AccountHeaderContext);
}

export function useAccountHeaderState() {
    const [titleVisibility, setVisibility] = useState(1);
    const barRef = useRef<HTMLDivElement>(null);
    const scrollRef = useRef<HTMLDivElement>(null);
    const setTitleVisibility = useCallback((ratio: number) => {
        setVisibility(ratio);
    }, []);
    return { titleVisibility, setTitleVisibility, barRef, scrollRef };
}

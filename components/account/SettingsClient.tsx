'use client';

import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import Container from "../Container";
import Heading from "../Heading";
import { Monitor, Moon, Sun } from "lucide-react";

const SettingsClient = () => {
    const { theme, setTheme } = useTheme();
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    if (!mounted) {
        return null;
    }

    return (
        <Container>
            <Heading
                title="Préférences d'affichage"
                subtitle="Choisissez l'apparence de l'application"
            />
            <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-6 max-w-2xl">
                {/* Light Mode */}
                <div
                    onClick={() => setTheme('light')}
                    className={`
                        cursor-pointer
                        rounded-xl
                        border-2
                        p-6
                        flex
                        flex-col
                        items-center
                        gap-4
                        transition
                        hover:bg-secondary
                        ${theme === 'light' ? 'border-primary bg-secondary/50' : 'border-border'}
                    `}
                >
                    <Sun size={32} />
                    <span className="font-semibold">Clair</span>
                </div>

                {/* Dark Mode */}
                <div
                    onClick={() => setTheme('dark')}
                    className={`
                        cursor-pointer
                        rounded-xl
                        border-2
                        p-6
                        flex
                        flex-col
                        items-center
                        gap-4
                        transition
                        hover:bg-secondary
                        ${theme === 'dark' ? 'border-primary bg-secondary/50' : 'border-border'}
                    `}
                >
                    <Moon size={32} />
                    <span className="font-semibold">Sombre</span>
                </div>

                {/* System Mode */}
                <div
                    onClick={() => setTheme('system')}
                    className={`
                        cursor-pointer
                        rounded-xl
                        border-2
                        p-6
                        flex
                        flex-col
                        items-center
                        gap-4
                        transition
                        hover:bg-secondary
                        ${theme === 'system' ? 'border-primary bg-secondary/50' : 'border-border'}
                    `}
                >
                    <Monitor size={32} />
                    <span className="font-semibold">Système</span>
                </div>
            </div>
        </Container>
    );
}

export default SettingsClient;

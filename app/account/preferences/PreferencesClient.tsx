'use client';

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "react-hot-toast";
import axios from "axios";
import { SafeUser } from "@/types";
import Container from "@/components/Container";
import Heading from "@/components/Heading";
import { Button } from "@/components/ui/Button";
import CommutePreferences from "@/components/profile/CommutePreferences";

interface PreferencesClientProps {
    currentUser: SafeUser;
}

const PreferencesClient: React.FC<PreferencesClientProps> = ({
    currentUser
}) => {
    const router = useRouter();
    const [isLoading, setIsLoading] = useState(false);
    const [measurementSystem, setMeasurementSystem] = useState(currentUser.measurementSystem || 'metric');

    const onSubmit = () => {
        setIsLoading(true);

        axios.post('/api/settings', {
            measurementSystem
        })
            .then(() => {
                toast.success('Preferences updated!');
                router.refresh();
            })
            .catch(() => {
                toast.error('Something went wrong.');
            })
            .finally(() => {
                setIsLoading(false);
            });
    }

    return (
        <Container>
            <div className="max-w-2xl mx-auto pt-24 pb-10">
                <Heading
                    title="Global Preferences"
                    subtitle="Manage your global settings for the application."
                />

                <div className="mt-10 flex flex-col gap-8">
                    <div className="flex flex-col gap-4 p-6 border border-border rounded-xl bg-card">
                        <div className="flex flex-col gap-1">
                            <h3 className="text-lg font-semibold">Measurement System</h3>
                            <p className="text-muted-foreground text-sm">
                                Choose your preferred unit system for surface areas (m² vs sq ft).
                            </p>
                        </div>

                        <div className="flex flex-row gap-4 mt-2">
                            <div
                                onClick={() => setMeasurementSystem('metric')}
                                className={`
                                    flex-1 
                                    p-4 
                                    border-2 
                                    rounded-xl 
                                    cursor-pointer 
                                    transition
                                    flex
                                    items-center
                                    justify-center
                                    font-medium
                                    ${measurementSystem === 'metric'
                                        ? 'border-black dark:border-white bg-secondary'
                                        : 'border-border hover:border-neutral-300 dark:hover:border-neutral-500 bg-transparent'}
                                `}
                            >
                                Metric (m²)
                            </div>
                            <div
                                onClick={() => setMeasurementSystem('imperial')}
                                className={`
                                    flex-1 
                                    p-4 
                                    border-2 
                                    rounded-xl 
                                    cursor-pointer 
                                    transition
                                    flex
                                    items-center
                                    justify-center
                                    font-medium
                                    ${measurementSystem === 'imperial'
                                        ? 'border-black dark:border-white bg-secondary'
                                        : 'border-border hover:border-neutral-300 dark:hover:border-neutral-500 bg-transparent'}
                                `}
                            >
                                Imperial (sq ft)
                            </div>
                        </div>
                    </div>

                    <CommutePreferences currentUser={currentUser} />

                    <div className="flex justify-end">
                        <Button
                            label="Save Preferences"
                            onClick={onSubmit}
                            disabled={isLoading}
                        />
                    </div>
                </div>
            </div>
        </Container>
    );
}

export default PreferencesClient;

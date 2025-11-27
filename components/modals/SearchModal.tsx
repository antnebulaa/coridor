'use client';

import { useCallback, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Modal from './Modal';
import useSearchModal from '@/hooks/useSearchModal';
import Heading from '../Heading';
// import Calendar from '../inputs/Calendar'; // Placeholder for now
// import Counter from '../inputs/Counter'; // Placeholder for now

enum STEPS {
    LOCATION = 0,
    DATE = 1,
    INFO = 2,
}

const SearchModal = () => {
    const router = useRouter();
    const params = useSearchParams();
    const searchModal = useSearchModal();

    const [step, setStep] = useState(STEPS.LOCATION);

    // Mock state for now
    const [location, setLocation] = useState('');
    const [guestCount, setGuestCount] = useState(1);
    const [roomCount, setRoomCount] = useState(1);
    const [bathroomCount, setBathroomCount] = useState(1);
    const [dateRange, setDateRange] = useState<any>({
        startDate: new Date(),
        endDate: new Date(),
        key: 'selection',
    });

    const onBack = useCallback(() => {
        setStep((value) => value - 1);
    }, []);

    const onNext = useCallback(() => {
        setStep((value) => value + 1);
    }, []);

    const onSubmit = useCallback(async () => {
        if (step !== STEPS.INFO) {
            return onNext();
        }

        let currentQuery = {};

        if (params) {
            // currentQuery = qs.parse(params.toString());
        }

        const updatedQuery: any = {
            ...currentQuery,
            locationValue: location,
            guestCount,
            roomCount,
            bathroomCount,
        };

        if (dateRange.startDate) {
            updatedQuery.startDate = dateRange.startDate.toISOString(); // format(dateRange.startDate, 'ISO');
        }

        if (dateRange.endDate) {
            updatedQuery.endDate = dateRange.endDate.toISOString(); // format(dateRange.endDate, 'ISO');
        }

        // const url = qs.stringifyUrl({
        //   url: '/',
        //   query: updatedQuery,
        // }, { skipNull: true });

        // Simple URL construction for now to avoid qs dependency if possible, but I'll install qs.
        // Actually, I'll just use a simple string for now to avoid installing qs if I can help it, but qs is better.
        // I'll install qs in the next step.

        const url = `/?locationValue=${location}&guestCount=${guestCount}&roomCount=${roomCount}&bathroomCount=${bathroomCount}`;

        setStep(STEPS.LOCATION);
        searchModal.onClose();
        router.push(url);
    }, [
        step,
        searchModal,
        location,
        router,
        guestCount,
        roomCount,
        bathroomCount,
        dateRange,
        onNext,
        params,
    ]);

    const actionLabel = useMemo(() => {
        if (step === STEPS.INFO) {
            return 'Search';
        }

        return 'Next';
    }, [step]);

    const secondaryActionLabel = useMemo(() => {
        if (step === STEPS.LOCATION) {
            return undefined;
        }

        return 'Back';
    }, [step]);

    let bodyContent = (
        <div className="flex flex-col gap-8">
            <Heading
                title="Where do you wanna go?"
                subtitle="Find the perfect location!"
            />
            <input
                placeholder="Location (e.g. France)"
                className="border p-4 rounded-md"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
            />
        </div>
    );

    if (step === STEPS.DATE) {
        bodyContent = (
            <div className="flex flex-col gap-8">
                <Heading
                    title="When do you plan to go?"
                    subtitle="Make sure everyone is free!"
                />
                <div className="h-[300px] bg-neutral-100 flex items-center justify-center rounded-md">
                    Calendar Placeholder
                </div>
            </div>
        );
    }

    if (step === STEPS.INFO) {
        bodyContent = (
            <div className="flex flex-col gap-8">
                <Heading
                    title="More information"
                    subtitle="Find your perfect place!"
                />
                <div className="flex flex-col gap-4">
                    <div className="flex justify-between items-center">
                        <div>Guests</div>
                        <div className="flex gap-2 items-center">
                            <button onClick={() => setGuestCount(Math.max(1, guestCount - 1))}>-</button>
                            <div>{guestCount}</div>
                            <button onClick={() => setGuestCount(guestCount + 1)}>+</button>
                        </div>
                    </div>
                    <div className="flex justify-between items-center">
                        <div>Rooms</div>
                        <div className="flex gap-2 items-center">
                            <button onClick={() => setRoomCount(Math.max(1, roomCount - 1))}>-</button>
                            <div>{roomCount}</div>
                            <button onClick={() => setRoomCount(roomCount + 1)}>+</button>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <Modal
            isOpen={searchModal.isOpen}
            onClose={searchModal.onClose}
            onSubmit={onSubmit}
            title="Filters"
            actionLabel={actionLabel}
            secondaryActionLabel={secondaryActionLabel}
            secondaryAction={step === STEPS.LOCATION ? undefined : onBack}
            body={bodyContent}
        />
    );
};

export default SearchModal;

'use client';

import { Button } from '../ui/Button';

interface ListingReservationProps {
    price: number;
    totalPrice: number;
    onChangeDate: (value: any) => void;
    dateRange: any;
    onSubmit: () => void;
    disabled?: boolean;
    disabledDates: Date[];
}

const ListingReservation: React.FC<ListingReservationProps> = ({
    price,
    totalPrice,
    onChangeDate,
    dateRange,
    onSubmit,
    disabled,
    disabledDates,
}) => {
    return (
        <div className="bg-white rounded-xl border-[1px] border-[#dfdfdf] overflow-hidden">
            <div className="flex flex-row items-center gap-1 p-4">
                <div className="text-2xl font-medium">
                    $ {price}
                </div>
                <div className="font-light text-neutral-600">
                    night
                </div>
            </div>
            <hr />
            <div className="p-4">
                {/* Placeholder for Calendar */}
                <div className="w-full h-[300px] bg-neutral-100 rounded-lg flex items-center justify-center text-neutral-500 mb-4">
                    Calendar Placeholder
                </div>
                <div className="flex flex-col gap-2">
                    <label className="text-sm font-medium">Start Date</label>
                    <input type="date" className="border p-2 rounded-md w-full" />
                    <label className="text-sm font-medium">End Date</label>
                    <input type="date" className="border p-2 rounded-md w-full" />
                </div>
            </div>
            <hr />
            <div className="p-4">
                <Button
                    disabled={disabled}
                    onClick={onSubmit}
                    className="w-full"
                >
                    Reserve
                </Button>
            </div>
            <div className="p-4 flex flex-row items-center justify-between font-medium text-lg">
                <div>Total</div>
                <div>$ {totalPrice}</div>
            </div>
        </div>
    );
};

export default ListingReservation;

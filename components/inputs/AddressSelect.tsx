'use client';

import AsyncSelect from 'react-select/async';
import axios from 'axios';

export type AddressSelectValue = {
    label: string;
    latlng: number[];
    value: string;
    region: string;
}

interface AddressSelectProps {
    value?: AddressSelectValue;
    onChange: (value: AddressSelectValue) => void;
}

const AddressSelect: React.FC<AddressSelectProps> = ({
    value,
    onChange
}) => {
    const loadOptions = (inputValue: string) => {
        return new Promise<any[]>((resolve) => {
            if (inputValue.length < 3) {
                resolve([]);
                return;
            }

            setTimeout(async () => {
                try {
                    const response = await axios.get(`https://nominatim.openstreetmap.org/search?format=json&q=${inputValue}`, {
                        headers: {
                            'User-Agent': 'CoridorApp/1.0 (contact@coridor.com)'
                        }
                    });
                    const results = response.data.map((item: any) => ({
                        label: item.display_name,
                        value: item.place_id,
                        latlng: [parseFloat(item.lat), parseFloat(item.lon)],
                        region: item.address?.country || 'Unknown'
                    }));
                    resolve(results);
                } catch (error) {
                    console.error('Error fetching addresses', error);
                    resolve([]);
                }
            }, 1000);
        });
    };

    return (
        <div>
            <AsyncSelect
                placeholder="Type an address..."
                isClearable
                defaultOptions
                loadOptions={loadOptions}
                value={value}
                onChange={(value) => onChange(value as AddressSelectValue)}
                formatOptionLabel={(option: any) => (
                    <div className="flex flex-row items-center gap-3">
                        <div>
                            {option.label}
                        </div>
                    </div>
                )}
                // Fix for z-index issue with Leaflet map
                menuPortalTarget={typeof document !== 'undefined' ? document.body : null}
                styles={{
                    menuPortal: (base) => ({ ...base, zIndex: 9999 })
                }}
                classNames={{
                    control: () => 'p-3 border-2',
                    input: () => 'text-lg',
                    option: () => 'text-lg'
                }}
                theme={(theme) => ({
                    ...theme,
                    borderRadius: 6,
                    colors: {
                        ...theme.colors,
                        primary: 'black',
                    }
                })}
            />
        </div>
    );
}

export default AddressSelect;

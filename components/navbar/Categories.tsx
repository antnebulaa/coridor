'use client';

import {
    HomeModernIcon,
    BuildingOfficeIcon
} from '@heroicons/react/24/outline';
import Container from '../Container';
import CategoryBox from './CategoryBox';
import { usePathname, useSearchParams } from 'next/navigation';

export const categories = [
    {
        label: 'Maison',
        icon: HomeModernIcon,
        description: 'Une maison entière pour vous !',
    },
    {
        label: 'Appartement',
        icon: BuildingOfficeIcon,
        description: 'Un appartement cosy !',
    },
];

const Categories = () => {
    const params = useSearchParams();
    const category = params?.get('category');
    const pathname = usePathname();

    const isMainPage = pathname === '/';

    if (!isMainPage) {
        return null;
    }

    return (
        <Container>
            <div className="pt-4 flex flex-row items-center justify-between overflow-x-auto">
                {categories.map((item) => (
                    <CategoryBox
                        key={item.label}
                        label={item.label}
                        selected={category === item.label}
                        icon={item.icon}
                    />
                ))}
            </div>
        </Container>
    );
};

export default Categories;

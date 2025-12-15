'use client';

import {
    Home,
    Building2,
    Ship
} from 'lucide-react';
import Container from '../Container';
import CategoryBox from './CategoryBox';
import { usePathname, useSearchParams } from 'next/navigation';

export const categories = [
    {
        label: 'Maison',
        icon: Home,
        image: '/images/house_icon.jpg',
        description: 'Une maison entière pour vous !',
    },
    {
        label: 'Appartement',
        icon: Building2,
        image: '/images/apartment_icon.jpg',
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
                        image={item.image}
                    />
                ))}
            </div>
        </Container>
    );
};

export default Categories;

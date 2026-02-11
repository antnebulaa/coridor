'use client';

import dynamic from "next/dynamic";

const RentModal = dynamic(() => import("./RentModal"), {
    ssr: false
});

const RentModalLoader = () => {
    return <RentModal />;
}

export default RentModalLoader;

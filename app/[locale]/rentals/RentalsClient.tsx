'use client';

import { toast } from "react-hot-toast";
import axios from "axios";
import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";

import { SafeUser } from "@/types";

import Container from "@/components/Container";
import Heading from "@/components/Heading";
import ListingCard from "@/components/listings/ListingCard";

interface RentalsClientProps {
    leases: any[]; // Use any or proper type like SafeRentalApplication
    currentUser?: SafeUser | null;
}

const RentalsClient: React.FC<RentalsClientProps> = ({
    leases,
    currentUser
}) => {
    const router = useRouter();

    return (
        <Container>
            <Heading
                title="Mes locations"
                subtitle="Où vous avez été et où vous allez"
            />
            <div
                className="
          mt-10
          grid 
          grid-cols-1 
          sm:grid-cols-2 
          md:grid-cols-3 
          lg:grid-cols-4
          xl:grid-cols-5
          2xl:grid-cols-6
          gap-8
        "
            >
                {leases.map((lease) => (
                    <ListingCard
                        key={lease.id}
                        data={lease.listing}
                        actionId={lease.id}
                        onAction={() => { }}
                        disabled={false}
                        actionLabel=""
                        currentUser={currentUser}
                    />
                ))}
            </div>
        </Container>
    );
}

export default RentalsClient;

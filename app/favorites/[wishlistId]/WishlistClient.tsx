'use client';

import { SafeUser } from "@/types";
import Container from "@/components/Container";
import Heading from "@/components/Heading";
import ListingCard from "@/components/listings/ListingCard";

interface WishlistClientProps {
    wishlist: any;
    currentUser?: SafeUser | null;
}

const WishlistClient: React.FC<WishlistClientProps> = ({
    wishlist,
    currentUser
}) => {
    return (
        <Container>
            <Heading
                title={wishlist.name}
                subtitle={`${wishlist.listings.length} items`}
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
                {wishlist.listings.map((listing: any) => (
                    <ListingCard
                        currentUser={currentUser}
                        key={listing.id}
                        data={listing}
                    />
                ))}
            </div>
        </Container>
    );
}

export default WishlistClient;

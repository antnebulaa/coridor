'use client';

import axios from 'axios';
import { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import { useRouter } from 'next/navigation';
import Image from 'next/image';

import useWishlistModal from '@/hooks/useWishlistModal';
import Modal from './Modal';
import Heading from '../Heading';
import SoftInput from '../inputs/SoftInput';
import { Button } from '../ui/Button';
import { FieldValues, useForm, SubmitHandler } from 'react-hook-form';

const WishlistModal = () => {
    const router = useRouter();
    const wishlistModal = useWishlistModal();
    const [isLoading, setIsLoading] = useState(false);
    const [wishlists, setWishlists] = useState<any[]>([]);
    const [isCreating, setIsCreating] = useState(false);

    const {
        register,
        handleSubmit,
        setValue,
        watch,
        formState: {
            errors,
        },
        reset
    } = useForm<FieldValues>({
        defaultValues: {
            name: '',
        }
    });

    const name = watch('name');

    useEffect(() => {
        if (wishlistModal.isOpen) {
            setIsLoading(true);
            axios.get('/api/wishlists')
                .then((response) => {
                    setWishlists(response.data);
                })
                .catch(() => {
                    toast.error('Failed to fetch wishlists');
                })
                .finally(() => {
                    setIsLoading(false);
                });
        }
    }, [wishlistModal.isOpen]);

    const onAddToWishlist = (wishlistId: string) => {
        setIsLoading(true);
        axios.post(`/api/wishlists/${wishlistId}`, {
            listingId: wishlistModal.listingId
        })
            .then(() => {
                toast.success('Added to wishlist!');
                router.refresh();
                wishlistModal.onClose();
            })
            .catch(() => {
                toast.error('Something went wrong.');
            })
            .finally(() => {
                setIsLoading(false);
            });
    }

    const onCreateWishlist: SubmitHandler<FieldValues> = (data) => {
        setIsLoading(true);
        axios.post('/api/wishlists', {
            name: data.name,
            listingId: wishlistModal.listingId
        })
            .then(() => {
                toast.success(`Saved to ${data.name}`);
                router.refresh();
                wishlistModal.onClose();
                reset();
                setIsCreating(false);
            })
            .catch(() => {
                toast.error('Something went wrong.');
            })
            .finally(() => {
                setIsLoading(false);
            });
    }

    const bodyContent = (
        <div className="flex flex-col gap-4">
            <Heading
                title="Add to wishlist"
                subtitle="Save this property to one of your lists."
            />

            <div className="grid grid-cols-2 gap-4 max-h-[50vh] overflow-y-auto">
                {wishlists.map((wishlist) => (
                    <div
                        key={wishlist.id}
                        onClick={() => onAddToWishlist(wishlist.id)}
                        className="
              cursor-pointer 
              group 
              flex 
              flex-col 
              gap-2
            "
                    >
                        <div className="
              aspect-square 
              relative 
              overflow-hidden 
              rounded-xl
              bg-neutral-100
              border-2
              border-transparent
              group-hover:border-black
              transition
            ">
                            {/* Show last added image or placeholder */}
                            <Image
                                fill
                                alt="Wishlist"
                                src={wishlist.listings[0]?.images?.[0]?.url || "/images/placeholder.svg"}
                                className="object-cover"
                            />
                        </div>
                        <div className="font-medium text-sm">
                            {wishlist.name}
                        </div>
                        <div className="text-xs text-neutral-500">
                            {wishlist._count?.listings || 0} saved
                        </div>
                    </div>
                ))}
            </div>

            <div className="pt-4 border-t">
                {!isCreating ? (
                    <Button
                        variant="outline"
                        label="Create new wishlist"
                        onClick={() => setIsCreating(true)}
                    />
                ) : (
                    <div className="flex flex-col gap-4">
                        <SoftInput
                            id="name"
                            label="Name"
                            register={register}
                            errors={errors}
                            required
                            disabled={isLoading}
                        />
                        <div className="flex flex-row gap-4">
                            <Button
                                variant="outline"
                                label="Cancel"
                                onClick={() => setIsCreating(false)}
                                disabled={isLoading}
                            />
                            <Button
                                label="Create"
                                onClick={handleSubmit(onCreateWishlist)}
                                disabled={isLoading || !name}
                            />
                        </div>
                    </div>
                )}
            </div>
        </div >
    );

    return (
        <Modal
            isOpen={wishlistModal.isOpen}
            onClose={wishlistModal.onClose}
            onSubmit={() => { }}
            actionLabel=""
            title="Wishlists"
            body={bodyContent}
            disabled={isLoading}
        />
    );
}

export default WishlistModal;

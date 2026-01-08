'use client';

import axios from 'axios';
import { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import CustomToast from "@/components/ui/CustomToast";
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
                    toast.custom((t) => (
                        <CustomToast
                            t={t}
                            message="Failed to fetch wishlists"
                            type="error"
                        />
                    ));
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
                toast.custom((t) => (
                    <CustomToast
                        t={t}
                        message="Added to wishlist!"
                        type="success"
                    />
                ));
                router.refresh();
                wishlistModal.onClose();
            })
            .catch(() => {
                toast.custom((t) => (
                    <CustomToast
                        t={t}
                        message="Something went wrong."
                        type="error"
                    />
                ));
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
                toast.custom((t) => (
                    <CustomToast
                        t={t}
                        message={`Saved to ${data.name}`}
                        type="success"
                    />
                ));
                router.refresh();
                wishlistModal.onClose();
                reset();
                setIsCreating(false);
            })
            .catch(() => {
                toast.custom((t) => (
                    <CustomToast
                        t={t}
                        message="Something went wrong."
                        type="error"
                    />
                ));
            })
            .finally(() => {
                setIsLoading(false);
            });
    }

    const bodyContent = (
        <div className="flex flex-col gap-4">
            <Heading
                title="Ajouter aux favoris"
                subtitle="Sauvegardez cette annonce dans une de vos listes."
            />

            <div className="grid grid-cols-2 gap-x-6 gap-y-8 max-h-[50vh] overflow-y-auto p-2">
                {wishlists.map((wishlist) => (
                    <div
                        key={wishlist.id}
                        onClick={() => onAddToWishlist(wishlist.id)}
                        className="
              cursor-pointer 
              group 
              flex 
              flex-col 
              gap-3
            "
                    >
                        <div className="
              w-[160px]
              h-[160px]
              relative 
              overflow-hidden 
              rounded-[30px]
              bg-neutral-100
              shadow-sm
              transition
            ">
                            {/* Show last added image or placeholder */}
                            <Image
                                fill
                                alt="Wishlist"
                                src={wishlist.listings[0]?.images?.[0]?.url || "/images/placeholder.svg"}
                                className="object-cover group-hover:scale-110 transition duration-300"
                            />
                        </div>
                        <div className="flex flex-col gap-0.5">
                            <div className="font-semibold text-sm">
                                {wishlist.name}
                            </div>
                            <div className="text-xs text-neutral-500">
                                {wishlist._count?.listings || 0} sauvegardés
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            <div className="pt-4">
                {!isCreating ? (
                    <Button
                        label="Créer une nouvelle liste"
                        onClick={() => setIsCreating(true)}
                    />
                ) : (
                    <div className="flex flex-col gap-4">
                        <SoftInput
                            id="name"
                            label="Nom"
                            register={register}
                            errors={errors}
                            required
                            disabled={isLoading}
                        />
                        <div className="flex flex-row gap-4">
                            <Button
                                variant="outline"
                                label="Annuler"
                                onClick={() => setIsCreating(false)}
                                disabled={isLoading}
                            />
                            <Button
                                label="Créer"
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
            title="Favoris"
            body={bodyContent}
            disabled={isLoading}
        />
    );
}

export default WishlistModal;

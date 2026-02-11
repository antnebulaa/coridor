import prisma from "@/libs/prismadb";
import getCurrentUser from "./getCurrentUser";

export default async function getAllFavorites() {
    try {
        const currentUser = await getCurrentUser();

        if (!currentUser) {
            return [];
        }

        const favorites = await prisma.listing.findMany({
            where: {
                OR: [
                    {
                        id: {
                            in: [...(currentUser.favoriteIds || [])]
                        }
                    },
                    {
                        wishlists: {
                            some: {
                                userId: currentUser.id
                            }
                        }
                    }
                ]
            },
            include: {
                rentalUnit: {
                    include: {
                        property: {
                            include: {
                                owner: true,
                                images: {
                                    include: {
                                        room: true
                                    }
                                },
                                rooms: {
                                    include: {
                                        images: true
                                    }
                                }
                            }
                        },
                        images: true,
                        targetRoom: {
                            include: {
                                images: true
                            }
                        }
                    }
                }
            },
            orderBy: {
                createdAt: 'desc'
            }
        });

        const safeFavorites = favorites.map((listing: any) => {
            const unitImages = listing.rentalUnit.images || [];
            const targetRoomImages = listing.rentalUnit.targetRoom?.images || [];

            const targetRoomId = listing.rentalUnit.targetRoom?.id;
            const propertyImagesRaw = listing.rentalUnit.property.images || [];

            const propertyImages = propertyImagesRaw.filter((img: any) => {
                if (!img.roomId) return true;
                if (img.roomId === targetRoomId) return true;
                return img.room && !img.room.name.toLowerCase().startsWith('chambre');
            });

            // Aggregating images from:
            // 1. Rental Unit (Specific to this listing/unit)
            // 2. Target Room (The physical room being rented)
            // 3. Property (Common areas images directly attached to property)
            // 4. Other Rooms (Common areas like Salon/Cuisine, excluding OTHER bedrooms)

            const rooms = listing.rentalUnit.property.rooms || [];
            const roomsImages = rooms.flatMap((room: any) => {
                // Exclude OTHER bedrooms
                if (room.id !== targetRoomId && room.name.toLowerCase().startsWith('chambre')) {
                    return [];
                }
                return room.images || [];
            });

            const allImages = [...unitImages, ...targetRoomImages, ...propertyImages, ...roomsImages];
            const uniqueUrls = new Set();
            const aggregatedImages = allImages.filter(img => {
                if (uniqueUrls.has(img.url)) return false;
                uniqueUrls.add(img.url);
                return true;
            });

            const property = listing.rentalUnit.property;
            const unit = listing.rentalUnit;

            return {
                ...listing,
                createdAt: listing.createdAt.toISOString(),
                statusUpdatedAt: listing.statusUpdatedAt.toISOString(),
                availableFrom: listing.availableFrom ? listing.availableFrom.toISOString() : null,

                // Mapped Fields for Facade
                city: property.city,
                country: property.country,
                district: property.district,
                neighborhood: property.neighborhood,
                addressLine1: property.addressLine1,
                building: property.building,
                apartment: property.apartment,
                zipCode: property.zipCode,
                latitude: property.latitude,
                longitude: property.longitude,
                category: property.category,

                surface: unit.surface,
                floor: unit.floor,
                totalFloors: unit.totalFloors,
                isFurnished: unit.isFurnished,
                buildYear: property.constructionYear,

                // New Mapped Fields
                rentalUnitType: unit.type,
                heatingSystem: property.heatingSystem,
                glazingType: property.glazingType,
                dpe: property.dpe,
                ges: property.ges,
                dpe_year: property.dpe_year,
                energy_cost_min: property.energy_cost_min,
                energy_cost_max: property.energy_cost_max,

                // Amenities (Union of Property + Unit)
                hasElevator: property.hasElevator,
                isAccessible: property.isAccessible,
                hasFiber: property.hasFiber,
                hasBikeRoom: property.hasBikeRoom,
                hasPool: property.hasPool,
                isNearTransport: property.isNearTransport,
                hasDigicode: property.hasDigicode,
                hasIntercom: property.hasIntercom,
                hasCaretaker: property.hasCaretaker,
                isQuietArea: property.isQuietArea,
                isNearGreenSpace: property.isNearGreenSpace,
                isNearSchools: property.isNearSchools,
                isNearShops: property.isNearShops,
                isNearHospital: property.isNearHospital,

                isTraversant: property.isTraversant,
                hasGarden: property.hasGarden,
                isRefurbished: property.isRefurbished,
                isSouthFacing: property.isSouthFacing,
                isBright: property.isBright,
                hasNoOpposite: property.hasNoOpposite,
                hasView: property.hasView,
                isQuiet: property.isQuiet,
                hasBathtub: property.hasBathtub,
                hasAirConditioning: property.hasAirConditioning,

                hasStorage: false,
                hasLaundry: false,
                hasArmoredDoor: false,
                hasConcierge: false,
                hasAutomaticDoors: false,

                transitData: property.transitData,

                rentalUnit: {
                    ...listing.rentalUnit,
                    property: {
                        ...listing.rentalUnit.property,
                        createdAt: listing.rentalUnit.property.createdAt.toISOString(),
                        updatedAt: listing.rentalUnit.property.updatedAt.toISOString(),
                        owner: {
                            ...listing.rentalUnit.property.owner,
                            createdAt: listing.rentalUnit.property.owner.createdAt.toISOString(),
                            updatedAt: listing.rentalUnit.property.owner.updatedAt.toISOString(),
                            emailVerified: listing.rentalUnit.property.owner.emailVerified?.toISOString() || null,
                            birthDate: listing.rentalUnit.property.owner.birthDate?.toISOString() || null
                        },
                    },
                    images: listing.rentalUnit.images
                },
                images: aggregatedImages,
                user: listing.rentalUnit.property.owner
            };
        });

        return safeFavorites;
    } catch (error: any) {
        throw new Error(error);
    }
}

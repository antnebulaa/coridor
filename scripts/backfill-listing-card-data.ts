/**
 * Backfill script: Denormalized cardData for all listings
 *
 * Populates dnCity, dnZipCode, dnLatitude, dnLongitude, dnCategory,
 * dnOwnerId, dnSurface, and cardData JSON for all existing listings.
 *
 * Usage:
 *   npx ts-node scripts/backfill-listing-card-data.ts
 *   npx ts-node scripts/backfill-listing-card-data.ts --dry-run
 *
 * Safe to re-run (idempotent — overwrites with fresh data).
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const isDryRun = process.argv.includes('--dry-run');

async function backfill() {
    console.log(`\n🔄 Backfill listing card data${isDryRun ? ' (DRY RUN)' : ''}\n`);

    const listings = await prisma.listing.findMany({
        select: { id: true },
    });

    console.log(`Found ${listings.length} listings to process\n`);

    let success = 0;
    let errors = 0;

    for (const { id } of listings) {
        try {
            const listing = await prisma.listing.findUnique({
                where: { id },
                include: {
                    rentalUnit: {
                        include: {
                            property: {
                                include: {
                                    owner: {
                                        select: {
                                            id: true,
                                            name: true,
                                            image: true,
                                            createdAt: true,
                                            updatedAt: true,
                                        }
                                    },
                                    images: {
                                        include: { room: true },
                                        orderBy: { order: 'asc' },
                                    },
                                    rooms: {
                                        include: {
                                            images: { orderBy: { order: 'asc' } }
                                        }
                                    }
                                }
                            },
                            images: { orderBy: { order: 'asc' } },
                            targetRoom: {
                                include: {
                                    images: { orderBy: { order: 'asc' } }
                                }
                            }
                        }
                    }
                }
            });

            if (!listing) {
                console.log(`  ⚠ Listing ${id} not found, skipping`);
                continue;
            }

            const property = listing.rentalUnit.property;
            const unit = listing.rentalUnit;

            // Aggregate images (same logic as syncListingCardData)
            const unitImages = unit.images || [];
            const targetRoomImages = unit.targetRoom?.images || [];
            const targetRoomId = unit.targetRoom?.id;
            const propertyImagesRaw = property.images || [];

            const propertyImages = propertyImagesRaw.filter((img: any) => {
                if (!img.roomId) return true;
                if (img.roomId === targetRoomId) return true;
                return img.room && !img.room.name.toLowerCase().startsWith('chambre');
            });

            const rooms = property.rooms || [];
            const roomsImages = rooms.flatMap((room: any) => {
                if (room.id !== targetRoomId && room.name.toLowerCase().startsWith('chambre')) {
                    return [];
                }
                return room.images || [];
            });

            const allImages = [...unitImages, ...targetRoomImages, ...propertyImages, ...roomsImages];
            const uniqueUrls = new Set<string>();
            const aggregatedImages = allImages.filter((img: any) => {
                if (uniqueUrls.has(img.url)) return false;
                uniqueUrls.add(img.url);
                return true;
            });

            const cardData = {
                country: property.country,
                district: property.district,
                neighborhood: property.neighborhood,
                addressLine1: property.addressLine1,
                building: property.building,
                apartment: property.apartment,
                floor: property.floor,
                totalFloors: property.totalFloors,
                buildYear: property.constructionYear,
                heatingSystem: property.heatingSystem,
                glazingType: property.glazingType,
                dpe: property.dpe,
                ges: property.ges,
                dpe_year: property.dpe_year,
                energy_cost_min: property.energy_cost_min,
                energy_cost_max: property.energy_cost_max,
                propertySubType: property.propertySubType ?? null,
                isFurnished: unit.isFurnished,
                rentalUnitType: unit.type,
                // Amenities
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
                hasStorage: property.hasStorage ?? false,
                hasLaundry: property.hasLaundry ?? false,
                hasArmoredDoor: property.hasArmoredDoor ?? false,
                hasConcierge: property.hasConcierge ?? false,
                hasAutomaticDoors: property.hasAutomaticDoors ?? false,
                hasBalcony: property.hasBalcony ?? false,
                hasTerrace: property.hasTerrace ?? false,
                hasLoggia: property.hasLoggia ?? false,
                hasCourtyard: property.hasCourtyard ?? false,
                hasShutters: property.hasShutters ?? false,
                hasCave: property.hasCave ?? false,
                hasParking: property.hasParking ?? false,
                hasGarage: property.hasGarage ?? false,
                isKitchenEquipped: property.isKitchenEquipped ?? false,
                hasSeparateKitchen: property.hasSeparateKitchen ?? false,
                // Transit
                transitData: property.transitData,
                // Images
                images: aggregatedImages.map((img: any) => ({
                    id: img.id,
                    url: img.url,
                    label: img.room?.name || img.label || null,
                    order: img.order,
                })),
                // Owner
                owner: {
                    id: property.owner.id,
                    name: property.owner.name,
                    image: property.owner.image,
                    createdAt: property.owner.createdAt?.toISOString(),
                    updatedAt: property.owner.updatedAt?.toISOString(),
                },
                // Rooms
                rooms: rooms.map((room: any) => ({
                    id: room.id,
                    name: room.name,
                    images: (room.images || []).map((img: any) => ({
                        id: img.id,
                        url: img.url,
                        order: img.order,
                    })),
                })),
            };

            if (!isDryRun) {
                await prisma.listing.update({
                    where: { id },
                    data: {
                        dnCity: property.city,
                        dnZipCode: property.zipCode,
                        dnLatitude: property.latitude,
                        dnLongitude: property.longitude,
                        dnCategory: property.category,
                        dnOwnerId: property.ownerId,
                        dnSurface: unit.surface,
                        cardData,
                    },
                });
            }

            success++;
            const city = property.city || 'N/A';
            const imgCount = aggregatedImages.length;
            console.log(`  ✅ ${id} — ${city} — ${imgCount} images`);
        } catch (err: any) {
            errors++;
            console.error(`  ❌ ${id} — ${err.message}`);
        }
    }

    console.log(`\n📊 Done: ${success} success, ${errors} errors${isDryRun ? ' (dry run, no changes made)' : ''}\n`);
}

backfill()
    .catch(console.error)
    .finally(() => prisma.$disconnect());

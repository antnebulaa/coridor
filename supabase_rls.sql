-- ==============================================================================
-- 1. ENABLE ROW LEVEL SECURITY ON ALL TABLES
-- ==============================================================================

ALTER TABLE "User" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Account" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "TenantProfile" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Guarantor" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Income" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "Property" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "RentalUnit" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Listing" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Furniture" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Room" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "PropertyImage" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "VisitSlot" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "Visit" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Reservation" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "RentalApplication" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "TenantCandidateScope" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "Conversation" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Message" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "Wishlist" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "CommuteLocation" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Like" ENABLE ROW LEVEL SECURITY;


-- ==============================================================================
-- 2. USER SECURITY & PROFILES (STRICT PRIVATE)
-- ==============================================================================

-- User: Read/Update own profile
CREATE POLICY "Users can manage their own profile" ON "User"
    USING (id = auth.uid()::text)
    WITH CHECK (id = auth.uid()::text);

-- Account: Strictly private
CREATE POLICY "Users can manage their own account links" ON "Account"
    USING ("userId" = auth.uid()::text)
    WITH CHECK ("userId" = auth.uid()::text);

-- TenantProfile: Strictly private
CREATE POLICY "Users can manage their own tenant profile" ON "TenantProfile"
    USING ("userId" = auth.uid()::text)
    WITH CHECK ("userId" = auth.uid()::text);

-- Guarantor: Accessible via TenantProfile ownership
CREATE POLICY "Users can manage their guarantors" ON "Guarantor"
    USING (
        EXISTS (
            SELECT 1 FROM "TenantProfile"
            WHERE "TenantProfile".id = "Guarantor"."tenantProfileId"
            AND "TenantProfile"."userId" = auth.uid()::text
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM "TenantProfile"
            WHERE "TenantProfile".id = "Guarantor"."tenantProfileId"
            AND "TenantProfile"."userId" = auth.uid()::text
        )
    );

-- Income: Accessible via TenantProfile or Guarantor
CREATE POLICY "Users can manage their incomes" ON "Income"
    USING (
        -- Directed linked to TenantProfile
        EXISTS (
            SELECT 1 FROM "TenantProfile"
            WHERE "TenantProfile".id = "Income"."tenantProfileId"
            AND "TenantProfile"."userId" = auth.uid()::text
        )
        OR
        -- Linked via Guarantor
        EXISTS (
            SELECT 1 FROM "Guarantor"
            JOIN "TenantProfile" ON "Guarantor"."tenantProfileId" = "TenantProfile".id
            WHERE "Guarantor".id = "Income"."guarantorId"
            AND "TenantProfile"."userId" = auth.uid()::text
        )
    )
    WITH CHECK (
        -- Same logic for write
        EXISTS (
            SELECT 1 FROM "TenantProfile"
            WHERE "TenantProfile".id = "Income"."tenantProfileId"
            AND "TenantProfile"."userId" = auth.uid()::text
        )
        OR
        EXISTS (
            SELECT 1 FROM "Guarantor"
            JOIN "TenantProfile" ON "Guarantor"."tenantProfileId" = "TenantProfile".id
            WHERE "Guarantor".id = "Income"."guarantorId"
            AND "TenantProfile"."userId" = auth.uid()::text
        )
    );

-- TenantCandidateScope: Creator manages it
CREATE POLICY "Users can manage their candidate scopes" ON "TenantCandidateScope"
    USING ("creatorUserId" = auth.uid()::text)
    WITH CHECK ("creatorUserId" = auth.uid()::text);
    
-- CommuteLocation: Strictly private
CREATE POLICY "Users can manage their commute locations" ON "CommuteLocation"
    USING ("userId" = auth.uid()::text)
    WITH CHECK ("userId" = auth.uid()::text);

-- Wishlist: Strictly private
CREATE POLICY "Users can manage their wishlists" ON "Wishlist"
    USING ("userId" = auth.uid()::text)
    WITH CHECK ("userId" = auth.uid()::text);
    
-- Likes: Strictly private (Owner of the like)
CREATE POLICY "Users can manage their likes" ON "Like"
    USING ("userId" = auth.uid()::text)
    WITH CHECK ("userId" = auth.uid()::text);


-- ==============================================================================
-- 3. PROPERTY & LISTINGS (PRIVATE WRITE, PUBLIC/SHARED READ)
-- ==============================================================================

-- Property: Private Write (Owner). No Public Read unless necessary, but safer to keep Private.
CREATE POLICY "Owners can manage their properties" ON "Property"
    USING ("ownerId" = auth.uid()::text)
    WITH CHECK ("ownerId" = auth.uid()::text);

-- Room: Managed by Owner
CREATE POLICY "Owners can manage rooms" ON "Room"
    USING (
        EXISTS (
            SELECT 1 FROM "Property"
            WHERE "Property".id = "Room"."propertyId"
            AND "Property"."ownerId" = auth.uid()::text
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM "Property"
            WHERE "Property".id = "Room"."propertyId"
            AND "Property"."ownerId" = auth.uid()::text
        )
    );

-- RentalUnit: Managed by Owner
CREATE POLICY "Owners can manage rental units" ON "RentalUnit"
    USING (
        EXISTS (
            SELECT 1 FROM "Property"
            WHERE "Property".id = "RentalUnit"."propertyId"
            AND "Property"."ownerId" = auth.uid()::text
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM "Property"
            WHERE "Property".id = "RentalUnit"."propertyId"
            AND "Property"."ownerId" = auth.uid()::text
        )
    );

-- --- LISTING ---
-- 1. Public Read (Published only)
CREATE POLICY "Public can view published listings" ON "Listing"
    FOR SELECT
    USING (status = 'PUBLISHED' AND "isPublished" = true);

-- 2. Owner Write/Read
CREATE POLICY "Owners can manage their listings" ON "Listing"
    USING (
        EXISTS (
            SELECT 1 FROM "RentalUnit"
            JOIN "Property" ON "RentalUnit"."propertyId" = "Property".id
            WHERE "RentalUnit".id = "Listing"."rentalUnitId"
            AND "Property"."ownerId" = auth.uid()::text
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM "RentalUnit"
            JOIN "Property" ON "RentalUnit"."propertyId" = "Property".id
            WHERE "RentalUnit".id = "Listing"."rentalUnitId"
            AND "Property"."ownerId" = auth.uid()::text
        )
    );

-- Furniture: Public Read (on Published listing), Owner Write
CREATE POLICY "Public can view furniture of published listings" ON "Furniture"
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM "Listing"
            WHERE "Listing".id = "Furniture"."listingId"
            AND "Listing".status = 'PUBLISHED'
        )
    );

CREATE POLICY "Owners can manage furniture" ON "Furniture"
    USING (
        EXISTS (
            SELECT 1 FROM "Listing"
            JOIN "RentalUnit" ON "Listing"."rentalUnitId" = "RentalUnit".id
            JOIN "Property" ON "RentalUnit"."propertyId" = "Property".id
            WHERE "Listing".id = "Furniture"."listingId"
            AND "Property"."ownerId" = auth.uid()::text
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM "Listing"
            JOIN "RentalUnit" ON "Listing"."rentalUnitId" = "RentalUnit".id
            JOIN "Property" ON "RentalUnit"."propertyId" = "Property".id
            WHERE "Listing".id = "Furniture"."listingId"
            AND "Property"."ownerId" = auth.uid()::text
        )
    );

-- PropertyImage: Public Read (Always)
CREATE POLICY "Public can view images" ON "PropertyImage"
    FOR SELECT
    USING (true); 

CREATE POLICY "Owners can manage images" ON "PropertyImage"
    USING (
        EXISTS (
            SELECT 1 FROM "Property"
            WHERE "Property".id = "PropertyImage"."propertyId"
            AND "Property"."ownerId" = auth.uid()::text
        )
        OR
        EXISTS (
            SELECT 1 FROM "RentalUnit"
            JOIN "Property" ON "RentalUnit"."propertyId" = "Property".id
            WHERE "RentalUnit".id = "PropertyImage"."rentalUnitId"
            AND "Property"."ownerId" = auth.uid()::text
        )
        OR
        EXISTS (
            SELECT 1 FROM "Room"
            JOIN "Property" ON "Room"."propertyId" = "Property".id
            WHERE "Room".id = "PropertyImage"."roomId"
            AND "Property"."ownerId" = auth.uid()::text
        )
    )
    WITH CHECK (
        -- Same complex check for update/delete
        EXISTS (
            SELECT 1 FROM "Property"
            WHERE "Property".id = "PropertyImage"."propertyId"
            AND "Property"."ownerId" = auth.uid()::text
        )
        OR
        EXISTS (
            SELECT 1 FROM "RentalUnit"
            JOIN "Property" ON "RentalUnit"."propertyId" = "Property".id
            WHERE "RentalUnit".id = "PropertyImage"."rentalUnitId"
            AND "Property"."ownerId" = auth.uid()::text
        )
        OR
         EXISTS (
            SELECT 1 FROM "Room"
            JOIN "Property" ON "Room"."propertyId" = "Property".id
            WHERE "Room".id = "PropertyImage"."roomId"
            AND "Property"."ownerId" = auth.uid()::text
        )
    );


-- ==============================================================================
-- 4. INTERACTIONS (VISITS, RESERVATIONS, APPLICATIONS)
-- ==============================================================================

-- VisitSlot: Owner Manage, Public Read
CREATE POLICY "Public can view visit slots" ON "VisitSlot"
    FOR SELECT
    USING (true);

CREATE POLICY "Owners can manage visit slots" ON "VisitSlot"
    USING (
        EXISTS (
            SELECT 1 FROM "Property"
            WHERE "Property".id = "VisitSlot"."propertyId"
            AND "Property"."ownerId" = auth.uid()::text
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM "Property"
            WHERE "Property".id = "VisitSlot"."propertyId"
            AND "Property"."ownerId" = auth.uid()::text
        )
    );

-- Visit: Candidate Read, Owner Read/Update
CREATE POLICY "Candidates can view/create their visits" ON "Visit"
    USING ("candidateId" = auth.uid()::text)
    WITH CHECK ("candidateId" = auth.uid()::text); 

CREATE POLICY "Owners can manage visits" ON "Visit"
    USING (
        EXISTS (
            SELECT 1 FROM "Listing"
            JOIN "RentalUnit" ON "Listing"."rentalUnitId" = "RentalUnit".id
            JOIN "Property" ON "RentalUnit"."propertyId" = "Property".id
            WHERE "Listing".id = "Visit"."listingId"
            AND "Property"."ownerId" = auth.uid()::text
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM "Listing"
            JOIN "RentalUnit" ON "Listing"."rentalUnitId" = "RentalUnit".id
            JOIN "Property" ON "RentalUnit"."propertyId" = "Property".id
            WHERE "Listing".id = "Visit"."listingId"
            AND "Property"."ownerId" = auth.uid()::text
        )
    );

-- Reservation: User Read, Owner Read
CREATE POLICY "Users can view their reservations" ON "Reservation"
    USING ("userId" = auth.uid()::text);

CREATE POLICY "Owners can view reservations" ON "Reservation"
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM "Listing"
            JOIN "RentalUnit" ON "Listing"."rentalUnitId" = "RentalUnit".id
            JOIN "Property" ON "RentalUnit"."propertyId" = "Property".id
            WHERE "Listing".id = "Reservation"."listingId"
            AND "Property"."ownerId" = auth.uid()::text
        )
    );

-- RentalApplication: Candidate (via Scope) Read, Owner Read/Update
CREATE POLICY "Candidates can view their applications" ON "RentalApplication"
    USING (
        EXISTS (
            SELECT 1 FROM "TenantCandidateScope"
            WHERE "TenantCandidateScope".id = "RentalApplication"."candidateScopeId"
            AND "TenantCandidateScope"."creatorUserId" = auth.uid()::text
        )
    );
    
CREATE POLICY "Owners can manage applications" ON "RentalApplication"
    USING (
        EXISTS (
            SELECT 1 FROM "Listing"
            JOIN "RentalUnit" ON "Listing"."rentalUnitId" = "RentalUnit".id
            JOIN "Property" ON "RentalUnit"."propertyId" = "Property".id
            WHERE "Listing".id = "RentalApplication"."listingId"
            AND "Property"."ownerId" = auth.uid()::text
        )
    );


-- ==============================================================================
-- 5. MESSAGING (PARTICIPANTS ONLY)
-- ==============================================================================

-- Fallback: Allow authenticated users to create/read messages they own (sender).
CREATE POLICY "Users can manage messages they send" ON "Message"
    USING ("senderId" = auth.uid()::text)
    WITH CHECK ("senderId" = auth.uid()::text);

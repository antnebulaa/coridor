
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
    console.log('Checking TenantCandidateScope model...')
    // Just try to count, even if table is empty, it proves model exists on client
    const count = await prisma.tenantCandidateScope.count()
    console.log(`TenantCandidateScope count: ${count}`)

    // Check Enums
    console.log('Checking Enums...')
    const { CompositionType, CoupleLegalStatus, TargetLeaseType } = require('@prisma/client');
    console.log('CompositionType:', CompositionType ? 'Found' : 'Missing');
}

main()
    .then(async () => {
        await prisma.$disconnect()
    })
    .catch(async (e) => {
        console.error(e)
        await prisma.$disconnect()
        process.exit(1)
    })

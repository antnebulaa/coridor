
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
    const user = await prisma.user.findFirst({
        orderBy: {
            updatedAt: 'desc',
        },
    })

    if (!user) {
        console.log('No user found.')
        return
    }

    const updatedUser = await prisma.user.update({
        where: {
            id: user.id,
        },
        data: {
            plan: 'PRO',
        },
    })

    console.log(`Updated user ${updatedUser.email} (ID: ${updatedUser.id}) to PRO plan.`)
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

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
async function main() {
    const p = await prisma.peca.findUnique({
        where: { id: 'cd5b9ec8-c4d7-4d09-b6ca-12bf06968d15' },
        include: { versoes: true }
    });
    console.log(JSON.stringify(p, null, 2));
}
main().finally(() => prisma.$disconnect());

import { PrismaClient, TransactionType } from "@prisma/client";

const prisma = new PrismaClient();

export const DEFAULT_GLOBAL_CATEGORIES: Array<{
  name: string;
  type: TransactionType;
}> = [
  // Categorias Globais de Receita (INCOME)
  { name: "Salário", type: TransactionType.INCOME },
  { name: "Freelance", type: TransactionType.INCOME },
  { name: "Rendimentos", type: TransactionType.INCOME },
  { name: "Outros", type: TransactionType.INCOME },

  // Categorias Globais de Despesa (EXPENSE)
  { name: "Moradia", type: TransactionType.EXPENSE },
  { name: "Alimentação", type: TransactionType.EXPENSE },
  { name: "Transporte", type: TransactionType.EXPENSE },
  { name: "Saúde", type: TransactionType.EXPENSE },
  { name: "Educação", type: TransactionType.EXPENSE },
  { name: "Lazer", type: TransactionType.EXPENSE },
  { name: "Utilidades", type: TransactionType.EXPENSE },
  { name: "Outros", type: TransactionType.EXPENSE },
];

async function main() {
  console.log("Iniciando seed de categorias globais padrão do AlvoFin...");

  for (const cat of DEFAULT_GLOBAL_CATEGORIES) {
    const existing = await prisma.category.findFirst({
      where: {
        userId: null,
        name: { equals: cat.name, mode: "insensitive" },
        type: cat.type,
      },
    });

    if (!existing) {
      await prisma.category.create({
        data: {
          userId: null,
          name: cat.name,
          type: cat.type,
          isDefault: true,
          isActive: true,
        },
      });
      console.log(`+ Criada categoria padrão: ${cat.name} (${cat.type})`);
    } else if (!existing.isActive || !existing.isDefault) {
      await prisma.category.update({
        where: { id: existing.id },
        data: { isDefault: true, isActive: true },
      });
      console.log(`~ Atualizada categoria padrão: ${cat.name} (${cat.type})`);
    }
  }

  console.log("Seed concluído com sucesso!");
}

main()
  .catch((e) => {
    console.error("Erro no seed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

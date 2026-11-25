import Navbar from "../_components/navbar";
import { requireAuthUser } from "../_lib/auth";
import { db } from "../_lib/prisma";
import { getUserCategories } from "../_data/get-categories";
import { isFutureTransactionDate } from "../_constants/transactions";
import { SerializedTransaction } from "../transactions/_components/edit-transaction-button";
import { ReportsClient } from "./_components/reports-client";

const ReportsPage = async () => {
  const user = await requireAuthUser();
  const categories = await getUserCategories();

  let serializedTransactions: SerializedTransaction[] = [];

  try {
    const transactions = await db.transaction.findMany({
      where: {
        userId: user.userId,
        deletedAt: null,
      },
      include: {
        category: true,
      },
      orderBy: [{ date: "desc" }, { createdAt: "desc" }],
    });

    serializedTransactions = transactions.map((tx) => ({
      id: tx.id,
      userId: tx.userId,
      categoryId: tx.categoryId,
      categoryName: tx.category.name,
      type: tx.type,
      amount: Number(tx.amount),
      date: tx.date.toISOString(),
      description: tx.description,
      createdByAi: tx.createdByAi,
      isFuture: isFutureTransactionDate(tx.date),
    }));
  } catch (err) {
    console.error("Erro ao carregar relatórios:", err);
  }

  return (
    <>
      <Navbar />
      <ReportsClient
        transactions={serializedTransactions}
        categories={categories}
      />
    </>
  );
};

export default ReportsPage;

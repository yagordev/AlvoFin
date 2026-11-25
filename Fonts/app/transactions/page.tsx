import Navbar from "../_components/navbar";
import { db } from "../_lib/prisma";
import { requireAuthUser } from "../_lib/auth";
import { getUserCategories } from "../_data/get-categories";
import { isFutureTransactionDate } from "../_constants/transactions";
import { TransactionsClient } from "./_components/transactions-client";
import { SerializedTransaction } from "./_components/edit-transaction-button";

const TransactionsPage = async () => {
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
    console.error("Erro ao consultar movimentações:", err);
  }

  return (
    <>
      <Navbar />
      <TransactionsClient
        transactions={serializedTransactions}
        categories={categories}
      />
    </>
  );
};

export default TransactionsPage;

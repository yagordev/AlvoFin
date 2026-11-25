import Navbar from "../_components/navbar";
import { requireAuthUser } from "../_lib/auth";
import { db } from "../_lib/prisma";
import { FinancialGoalDTO, GoalsClient } from "./_components/goals-client";

const GoalsPage = async () => {
  const user = await requireAuthUser();
  let goalsDto: FinancialGoalDTO[] = [];

  try {
    const goals = await db.financialGoal.findMany({
      where: {
        userId: user.userId,
        deletedAt: null,
      },
      include: {
        goalTransactions: {
          where: { deletedAt: null },
          orderBy: [{ date: "desc" }, { createdAt: "desc" }],
        },
      },
      orderBy: { createdAt: "desc" },
    });

    goalsDto = goals.map((goal) => {
      let currentBalance = 0;
      for (const tx of goal.goalTransactions) {
        if (tx.type === "CONTRIBUTION") {
          currentBalance += Number(tx.amount);
        } else {
          currentBalance -= Number(tx.amount);
        }
      }

      const targetAmount = Number(goal.targetAmount);
      const percentage =
        targetAmount > 0 ? Math.round((currentBalance / targetAmount) * 100) : 0;

      return {
        id: goal.id,
        name: goal.name,
        targetAmount,
        currentBalance,
        percentage,
        deadline: goal.deadline ? goal.deadline.toISOString() : null,
        movements: goal.goalTransactions.map((m) => ({
          id: m.id,
          type: m.type,
          amount: Number(m.amount),
          date: m.date.toISOString(),
          description: m.description,
        })),
      };
    });
  } catch (err) {
    console.error("Erro ao consultar objetivos financeiros:", err);
  }

  return (
    <>
      <Navbar />
      <GoalsClient goals={goalsDto} />
    </>
  );
};

export default GoalsPage;

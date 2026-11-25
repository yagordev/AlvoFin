import { NextResponse } from "next/server";
import { getSession } from "@/app/_lib/auth";
import { db } from "@/app/_lib/prisma";

export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ user: null, alerts: [] }, { status: 401 });
  }

  try {
    const now = new Date();
    const currentMonth = now.getMonth() + 1;
    const currentYear = now.getFullYear();

    // Busca alertas de limites do mês atual (UC011 / RN030 / RN031)
    const alerts = await db.limitAlert.findMany({
      where: {
        referenceMonth: currentMonth,
        referenceYear: currentYear,
        spendingLimit: {
          userId: session.userId,
        },
      },
      include: {
        spendingLimit: {
          include: {
            category: true,
          },
        },
      },
      orderBy: [{ threshold: "desc" }, { createdAt: "desc" }],
    });

    return NextResponse.json({
      user: session,
      alerts: alerts.map((a) => ({
        id: a.id,
        threshold: a.threshold,
        referenceMonth: a.referenceMonth,
        referenceYear: a.referenceYear,
        categoryName: a.spendingLimit.category.name,
        limitAmount: Number(a.spendingLimit.amount),
      })),
    });
  } catch {
    return NextResponse.json({
      user: session,
      alerts: [],
    });
  }
}

-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "transaction_type" AS ENUM ('INCOME', 'EXPENSE');

-- CreateEnum
CREATE TYPE "goal_transaction_type" AS ENUM ('CONTRIBUTION', 'WITHDRAWAL');

-- CreateTable
CREATE TABLE "users" (
    "id" UUID NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "email" VARCHAR(255) NOT NULL,
    "password_hash" VARCHAR(255) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "categories" (
    "id" UUID NOT NULL,
    "user_id" UUID,
    "name" VARCHAR(255) NOT NULL,
    "type" "transaction_type" NOT NULL,
    "is_default" BOOLEAN NOT NULL DEFAULT false,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "transactions" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "category_id" UUID NOT NULL,
    "type" "transaction_type" NOT NULL,
    "amount" DECIMAL(15,2) NOT NULL,
    "date" DATE NOT NULL,
    "description" TEXT,
    "created_by_ai" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "transactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "spending_limits" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "category_id" UUID NOT NULL,
    "amount" DECIMAL(15,2) NOT NULL,
    "effective_from" DATE NOT NULL,
    "effective_to" DATE,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "spending_limits_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "financial_goals" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "target_amount" DECIMAL(15,2) NOT NULL,
    "deadline" DATE,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "financial_goals_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "goal_transactions" (
    "id" UUID NOT NULL,
    "goal_id" UUID NOT NULL,
    "type" "goal_transaction_type" NOT NULL,
    "amount" DECIMAL(15,2) NOT NULL,
    "date" DATE NOT NULL,
    "description" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "goal_transactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ai_analyses" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "reference_month" INTEGER NOT NULL,
    "reference_year" INTEGER NOT NULL,
    "analysis_data" JSONB NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ai_analyses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "limit_alerts" (
    "id" UUID NOT NULL,
    "spending_limit_id" UUID NOT NULL,
    "reference_month" INTEGER NOT NULL,
    "reference_year" INTEGER NOT NULL,
    "threshold" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "limit_alerts_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "categories_user_id_type_is_active_idx" ON "categories"("user_id", "type", "is_active");

-- CreateIndex
CREATE INDEX "transactions_user_id_date_deleted_at_idx" ON "transactions"("user_id", "date", "deleted_at");

-- CreateIndex
CREATE INDEX "transactions_user_id_category_id_deleted_at_idx" ON "transactions"("user_id", "category_id", "deleted_at");

-- CreateIndex
CREATE INDEX "spending_limits_user_id_category_id_effective_from_effectiv_idx" ON "spending_limits"("user_id", "category_id", "effective_from", "effective_to");

-- CreateIndex
CREATE INDEX "financial_goals_user_id_deleted_at_idx" ON "financial_goals"("user_id", "deleted_at");

-- CreateIndex
CREATE INDEX "goal_transactions_goal_id_deleted_at_idx" ON "goal_transactions"("goal_id", "deleted_at");

-- CreateIndex
CREATE INDEX "ai_analyses_user_id_reference_year_reference_month_idx" ON "ai_analyses"("user_id", "reference_year", "reference_month");

-- CreateIndex
CREATE UNIQUE INDEX "limit_alerts_spending_limit_id_reference_month_reference_ye_key" ON "limit_alerts"("spending_limit_id", "reference_month", "reference_year", "threshold");

-- AddForeignKey
ALTER TABLE "categories" ADD CONSTRAINT "categories_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "spending_limits" ADD CONSTRAINT "spending_limits_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "spending_limits" ADD CONSTRAINT "spending_limits_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "financial_goals" ADD CONSTRAINT "financial_goals_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "goal_transactions" ADD CONSTRAINT "goal_transactions_goal_id_fkey" FOREIGN KEY ("goal_id") REFERENCES "financial_goals"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ai_analyses" ADD CONSTRAINT "ai_analyses_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "limit_alerts" ADD CONSTRAINT "limit_alerts_spending_limit_id_fkey" FOREIGN KEY ("spending_limit_id") REFERENCES "spending_limits"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddCheckConstraints (Modelo de Dados AlvoFin)
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_amount_positive_chk" CHECK ("amount" > 0);
ALTER TABLE "spending_limits" ADD CONSTRAINT "spending_limits_amount_positive_chk" CHECK ("amount" > 0);
ALTER TABLE "spending_limits" ADD CONSTRAINT "spending_limits_effective_dates_chk" CHECK ("effective_to" IS NULL OR "effective_to" >= "effective_from");
ALTER TABLE "financial_goals" ADD CONSTRAINT "financial_goals_target_amount_positive_chk" CHECK ("target_amount" > 0);
ALTER TABLE "goal_transactions" ADD CONSTRAINT "goal_transactions_amount_positive_chk" CHECK ("amount" > 0);
ALTER TABLE "ai_analyses" ADD CONSTRAINT "ai_analyses_reference_month_chk" CHECK ("reference_month" BETWEEN 1 AND 12);
ALTER TABLE "limit_alerts" ADD CONSTRAINT "limit_alerts_reference_month_chk" CHECK ("reference_month" BETWEEN 1 AND 12);
ALTER TABLE "limit_alerts" ADD CONSTRAINT "limit_alerts_threshold_chk" CHECK ("threshold" IN (75, 90, 100));

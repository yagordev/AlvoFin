"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/app/_lib/prisma";
import {
  clearSessionCookie,
  createSessionCookie,
  hashPassword,
  requireAuthUser,
  verifyPassword,
} from "@/app/_lib/auth";
import { ensureDefaultCategories } from "@/app/_lib/default-categories";
import {
  LoginInput,
  loginSchema,
  RegisterInput,
  registerSchema,
  UpdateProfileInput,
  updateProfileSchema,
} from "./schema";

export async function loginAction(input: LoginInput): Promise<{
  success: boolean;
  error?: string;
}> {
  const parsed = loginSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      error:
        parsed.error.issues[0]?.message ||
        "Dados inválidos. Verifique os campos.",
    };
  }

  const { email, password, rememberMe } = parsed.data;

  try {
    const user = await db.user.findUnique({
      where: { email: email.toLowerCase() },
    });

    if (!user) {
      // UC002 - A1: Credenciais inválidas
      return {
        success: false,
        error: "E-mail ou senha incorretos.",
      };
    }

    const passwordValid = await verifyPassword(password, user.passwordHash);
    if (!passwordValid) {
      return {
        success: false,
        error: "E-mail ou senha incorretos.",
      };
    }

    await ensureDefaultCategories();

    await createSessionCookie(
      {
        userId: user.id,
        name: user.name,
        email: user.email,
      },
      rememberMe,
    );

    return { success: true };
  } catch (error) {
    console.error("Erro ao realizar login:", error);
    return {
      success: false,
      error:
        "Não foi possível conectar ao banco de dados. Verifique a configuração do DATABASE_URL no arquivo .env.",
    };
  }
}

export async function registerAction(input: RegisterInput): Promise<{
  success: boolean;
  error?: string;
}> {
  const parsed = registerSchema.safeParse(input);
  if (!parsed.success) {
    // UC001 - A2: Dados inválidos
    return {
      success: false,
      error:
        parsed.error.issues[0]?.message ||
        "Preencha todos os campos obrigatórios corretamente.",
    };
  }

  const { name, email, password } = parsed.data;
  const normalizedEmail = email.toLowerCase();

  try {
    const existingUser = await db.user.findUnique({
      where: { email: normalizedEmail },
    });

    if (existingUser) {
      // UC001 - A1: E-mail já cadastrado
      return {
        success: false,
        error: "Este endereço de e-mail já está em uso por outra conta.",
      };
    }

    const passwordHash = await hashPassword(password);

    const user = await db.user.create({
      data: {
        name,
        email: normalizedEmail,
        passwordHash,
      },
    });

    // UC001 / RN007: Garante que as categorias padrão globais estão disponíveis
    await ensureDefaultCategories();

    await createSessionCookie(
      {
        userId: user.id,
        name: user.name,
        email: user.email,
      },
      true,
    );

    return { success: true };
  } catch (error) {
    console.error("Erro ao criar conta:", error);
    return {
      success: false,
      error:
        "Não foi possível criar a conta. Verifique a conexão com o banco de dados (DATABASE_URL).",
    };
  }
}

export async function logoutAction() {
  clearSessionCookie();
}

export async function updateProfileAction(input: UpdateProfileInput): Promise<{
  success: boolean;
  error?: string;
}> {
  const session = await requireAuthUser();
  const parsed = updateProfileSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message || "Nome inválido.",
    };
  }

  try {
    const updated = await db.user.update({
      where: { id: session.userId },
      data: { name: parsed.data.name },
    });

    await createSessionCookie({
      userId: updated.id,
      name: updated.name,
      email: updated.email,
    });

    revalidatePath("/");
    return { success: true };
  } catch {
    return {
      success: false,
      error: "Não foi possível atualizar o perfil.",
    };
  }
}

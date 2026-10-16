import { NextRequest, NextResponse } from "next/server";
import { currentUser, configured } from "@/lib/auth";
import { load, save } from "@/lib/repository";
import { schemas, Entity } from "@/lib/domain";
import { z } from "zod";
export const dynamic = "force-dynamic";
const response = (body: unknown, status = 200) =>
  NextResponse.json(body, { status, headers: { "Cache-Control": "no-store" } });
export async function GET() {
  if (!configured()) return response({ configured: false });
  try {
    const user = await currentUser();
    if (!user) return response({ configured: true, authenticated: false }, 401);
    return response({
      configured: true,
      authenticated: true,
      data: await load(user.id),
    });
  } catch (e) {
    if (e instanceof Error && e.message === "ACCESS_DENIED")
      return response(
        {
          error:
            "Esta conta não está autorizada a acessar o laboratório. Entre com o email pessoal configurado.",
        },
        403,
      );
    return response(
      {
        error:
          "Não foi possível carregar o laboratório. Verifique a conexão e tente novamente.",
      },
      503,
    );
  }
}
export async function POST(req: NextRequest) {
  if (req.headers.get("origin") !== req.nextUrl.origin)
    return response({ error: "Origem da solicitação não permitida." }, 403);
  try {
    const user = await currentUser();
    if (!user)
      return response(
        {
          error:
            "Sua sessão expirou. Entre novamente; mantenha este formulário aberto.",
        },
        401,
      );
    const raw = await req.text();
    if (raw.length > 100000)
      return response({ error: "O registro excede o limite de tamanho." }, 413);
    const envelope = z
      .object({
        entity: z.enum([
          "analises",
          "causas",
          "hipoteses",
          "riscos",
          "acoes",
          "medicoes",
        ]),
        id: z.uuid(),
        version: z.number().int().positive().nullable(),
        analysis: z.string(),
        values: z.record(z.string(), z.unknown()),
      })
      .safeParse(JSON.parse(raw));
    if (!envelope.success)
      return response({ error: "Solicitação inválida." }, 422);
    const { entity, id, version, analysis, values } = envelope.data;
    const parsed = schemas[entity].safeParse(values);
    if (!parsed.success)
      return response(
        {
          error: "Revise os campos indicados.",
          fields: parsed.error.flatten().fieldErrors,
        },
        422,
      );
    await save(user.id, entity as Entity, id, version, parsed.data, analysis);
    return response({ saved: true });
  } catch (e) {
    const error = e as { message?: string; code?: string };
    if (error.message === "CONFLICT")
      return response(
        {
          error:
            "Este registro mudou em outra sessão. Copie suas alterações, atualize os dados e tente novamente.",
        },
        409,
      );
    if (["23514", "P0001", "23503"].includes(error.code ?? ""))
      return response(
        {
          error:
            "A operação não atende às regras: confira a validação da hipótese, o resultado do teste, o efeito observado e os vínculos com a análise.",
        },
        422,
      );
    if (error.code === "23505")
      return response(
        {
          error:
            "Este registro já existe. Atualize os dados antes de tentar novamente.",
        },
        409,
      );
    return response(
      {
        error:
          "Não foi possível confirmar a gravação. Atualize os dados para conferir o resultado antes de tentar novamente.",
      },
      503,
    );
  }
}

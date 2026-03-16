// @ts-nocheck
import { NextRequest, NextResponse } from "next/server";

import { auth } from "@/lib/auth";
import { isModeratorRole } from "@/lib/moderation";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Yetkişiz" }, { status: 401 });

  const post = await prisma.boardPost.findUnique({ where: { id: params.id } });
  if (!post) return NextResponse.json({ error: "Duyuru bulunamadı" }, { status: 404 });

  const canDelete = isModeratorRole(session.user.role) || post.userId === session.user.id;
  if (!canDelete) return NextResponse.json({ error: "Bu duyuruyu silme yetkin yok" }, { status: 403 });

  await prisma.boardPost.delete({ where: { id: params.id } });

  const contentType = req.headers.get("content-type") || "";
  if (contentType.includes("application/x-www-form-urlencoded") || contentType.includes("multipart/form-data")) {
    return NextResponse.redirect(new URL("/board", req.url));
  }

  return NextResponse.json({ ok: true });
}



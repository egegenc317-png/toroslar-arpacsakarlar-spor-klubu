// @ts-nocheck
import { NextRequest, NextResponse } from "next/server";

import { auth } from "@/lib/auth";
import { isModeratorRole } from "@/lib/moderation";
import { prisma } from "@/lib/prisma";

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Yetkisiz" }, { status: 401 });

  const post = await prisma.flowPost.findUnique({
    where: { id: params.id },
    include: { user: true, replies: true, reposts: true, likes: true }
  });

  if (!post) {
    return NextResponse.json({ error: "Paylaşım bulunamadı." }, { status: 404 });
  }

  if (post.userId !== session.user.id && !isModeratorRole(session.user.role)) {
    return NextResponse.json({ error: "Bu paylaşımı silme yetkin yok." }, { status: 403 });
  }

  if (post.replies?.length) {
    const replyIds = post.replies.map((reply: { id: string }) => reply.id);
    await prisma.flowPostLike.deleteMany({ where: { postId: { in: replyIds } } });
    for (const replyId of replyIds) {
      await prisma.flowPost.delete({ where: { id: replyId } });
    }
  }

  if (post.reposts?.length) {
    const repostIds = post.reposts.map((repost: { id: string }) => repost.id);
    await prisma.flowPostLike.deleteMany({ where: { postId: { in: repostIds } } });
    for (const repostId of repostIds) {
      await prisma.flowPost.delete({ where: { id: repostId } });
    }
  }

  await prisma.flowPostLike.deleteMany({ where: { postId: post.id } });
  await prisma.flowPost.delete({ where: { id: post.id } });

  return NextResponse.json({ ok: true });
}

// @ts-nocheck
import { NextRequest, NextResponse } from "next/server";

import { auth } from "@/lib/auth";
import { getConversationListItems } from "@/lib/messages-list";
import { prisma } from "@/lib/prisma";
import { conversationCreateSchema } from "@/lib/validations";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Yetkişiz" }, { status: 401 });

  const items = await getConversationListItems(session.user.id);
  const response = NextResponse.json({ items });
  response.headers.set("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
  return response;
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Yetkişiz" }, { status: 401 });

  const contentType = req.headers.get("content-type") || "";
  const isJsonRequest = contentType.includes("application/json");
  const payload = contentType.includes("application/x-www-form-urlencoded")
    ? Object.fromEntries((await req.formData()).entries())
    : await req.json();

  const parsed = conversationCreateSchema.safeParse(payload);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  let conversation = null;

  if (parsed.data.listingId) {
    const listing = await prisma.listing.findUnique({ where: { id: parsed.data.listingId } });
    if (!listing) return NextResponse.json({ error: "İlan bulunamadı" }, { status: 404 });
    if (listing.userId === session.user.id) return NextResponse.json({ error: "Kendi ilanı" }, { status: 400 });

    conversation = await prisma.conversation.findUnique({
      where: {
        listingId_buyerId_sellerId: {
          listingId: listing.id,
          buyerId: session.user.id,
          sellerId: listing.userId
        }
      }
    });

    if (!conversation) {
      conversation = await prisma.conversation.create({
        data: {
          listingId: listing.id,
          buyerId: session.user.id,
          sellerId: listing.userId,
          conversationType: "LISTING",
          contextType: "LISTING",
          contextTitle: listing.title
        }
      });
    }
  } else if (parsed.data.userId) {
    const peer = await prisma.user.findUnique({ where: { id: parsed.data.userId } });
    if (!peer) return NextResponse.json({ error: "Kullanıcı bulunamadı" }, { status: 404 });
    if (peer.id === session.user.id) return NextResponse.json({ error: "Kendinizle sohbet açamazsınız" }, { status: 400 });

    const directMatches = await prisma.conversation.findMany({
      where: {
        listingId: null,
        OR: [
          { buyerId: session.user.id, sellerId: peer.id },
          { buyerId: peer.id, sellerId: session.user.id }
        ]
      },
      orderBy: { createdAt: "desc" }
    });
    conversation = directMatches[0] || null;

    if (!conversation) {
      conversation = await prisma.conversation.create({
        data: {
          listingId: null,
          buyerId: session.user.id,
          sellerId: peer.id,
          conversationType: "DIRECT",
          contextType: "BOARD",
          contextTitle: parsed.data.contextTitle || "Mahalle Panosu Sohbeti"
        }
      });
    }
  }

  if (!conversation) return NextResponse.json({ error: "Konuşma oluşturulamadı" }, { status: 400 });

  if (!isJsonRequest) {
    return NextResponse.redirect(new URL(`/messages/${conversation.id}`, req.url));
  }

  return NextResponse.json({ id: conversation.id }, { status: 201 });
}






// @ts-nocheck
import { redirect } from "next/navigation";

import { auth } from "@/lib/auth";
import { getConversationListItems } from "@/lib/messages-list";
import { MessagesHub } from "@/components/messages-hub";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function MessagesPage() {
  const session = await auth();
  if (!session) redirect("/auth/login");

  try {
    const conversationItems = await getConversationListItems(session.user.id);
    return <MessagesHub currentUserId={session.user.id} conversations={conversationItems} />;
  } catch (error) {
    console.error("messages page failed", error);
    return <MessagesHub currentUserId={session.user.id} conversations={[]} />;
  }
}


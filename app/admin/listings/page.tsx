// @ts-nocheck
import Link from "next/link";
import { redirect } from "next/navigation";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type AdminListing = Awaited<ReturnType<typeof prisma.listing.findMany>>[number];

export default async function AdminListingsPage() {
  const session = await auth();
  if (!session || (session.user.role !== "ADMIN" && session.user.role !== "MODERATOR")) redirect("/");

  const listings = await prisma.listing.findMany({
    where: { status: "ACTIVE" },
    orderBy: { createdAt: "desc" },
    take: 50,
    include: { user: { select: { id: true, name: true } } }
  });

  return (
    <Card>
      <CardHeader><CardTitle>İlan Moderasyonu</CardTitle></CardHeader>
      <CardContent className="space-y-2">
        {listings.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Yayında olan moderasyon bekleyen ilan kalmadı.
          </p>
        ) : null}
        {listings.map((l: AdminListing) => (
          <div key={l.id} className="rounded-md border p-3 text-sm">
            <p><Link href={`/listings/${l.id}`} className="font-medium hover:underline">{l.title}</Link> - {l.status} - {l.user?.name || "Bilinmeyen kullanıcı"}</p>
            <form action={`/api/admin/listings/${l.id}/takedown`} method="post" className="mt-2 flex gap-2">
              <input name="adminNote" className="h-9 rounded border px-2" placeholder="Admin notu" />
              <Button type="submit" size="sm" variant="outline">Take Down</Button>
            </form>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}



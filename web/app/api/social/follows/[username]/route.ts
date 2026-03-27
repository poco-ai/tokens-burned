import { NextResponse } from "next/server";
import { normalizeUsername } from "@/lib/auth-username";
import { prisma } from "@/lib/prisma";
import { getOptionalSession } from "@/lib/session";

async function getTargetUser(username: string) {
  return prisma.user.findUnique({
    where: {
      username: normalizeUsername(username),
    },
    select: {
      id: true,
      usagePreference: {
        select: {
          publicProfileEnabled: true,
        },
      },
    },
  });
}

export async function POST(
  _request: Request,
  context: RouteContext<"/api/social/follows/[username]">,
) {
  const session = await getOptionalSession();

  if (!session) {
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }

  const { username } = await context.params;
  const targetUser = await getTargetUser(username);

  if (!targetUser) {
    return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
  }

  if (targetUser.id === session.user.id) {
    return NextResponse.json({ error: "INVALID_TARGET" }, { status: 400 });
  }

  if (!targetUser.usagePreference?.publicProfileEnabled) {
    return NextResponse.json({ error: "PROFILE_PRIVATE" }, { status: 403 });
  }

  await prisma.follow.upsert({
    where: {
      followerId_followingId: {
        followerId: session.user.id,
        followingId: targetUser.id,
      },
    },
    update: {},
    create: {
      followerId: session.user.id,
      followingId: targetUser.id,
    },
  });

  return NextResponse.json({ success: true });
}

export async function DELETE(
  _request: Request,
  context: RouteContext<"/api/social/follows/[username]">,
) {
  const session = await getOptionalSession();

  if (!session) {
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }

  const { username } = await context.params;
  const targetUser = await getTargetUser(username);

  if (!targetUser) {
    return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
  }

  await prisma.follow.deleteMany({
    where: {
      followerId: session.user.id,
      followingId: targetUser.id,
    },
  });

  return NextResponse.json({ success: true });
}

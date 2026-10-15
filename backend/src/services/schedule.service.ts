import type { Prisma } from "../generated/prisma/client.js";

export async function lockActiveKapster(
  tx: Prisma.TransactionClient,
  kapsterId: number,
) {
  const kapsters = await tx.$queryRaw<
    { id: number; name: string; isActive: boolean }[]
  >`
    SELECT
      "id",
      "name",
      "is_active" AS "isActive"
    FROM "kapsters"
    WHERE "id" = ${kapsterId}
    FOR UPDATE
  `;

  const kapster = kapsters[0];

  if (!kapster || !kapster.isActive) {
    return null;
  }

  return kapster;
}

export async function findScheduleConflict(
  tx: Prisma.TransactionClient,
  kapsterId: number,
  startsAt: Date,
  blockedUntil: Date,
  now: Date,
  excludeScheduleId?: number,
) {
  return tx.schedule.findFirst({
    where: {
      kapsterId,

      ...(excludeScheduleId !== undefined
        ? {
            id: {
              not: excludeScheduleId,
            },
          }
        : {}),

      startsAt: {
        lt: blockedUntil,
      },

      blockedUntil: {
        gt: startsAt,
      },

      OR: [
        {
          status: {
            in: ["CONFIRMED", "COMPLETED"],
          },
        },
        {
          status: "HELD",
          holdExpiresAt: {
            gt: now,
          },
        },
        {
          status: "HELD",
          holdExpiresAt: null,
        },
      ],
    },

    select: {
      id: true,
    },
  });
}

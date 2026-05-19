"use server";

import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/prisma";
import { generateAIInsights } from "./dashboard";

export async function updateUser(data) {
  const { userId } = await auth();

  if (!userId) {
    throw new Error("Unauthorized");
  }

  // Find current user
  let user = await db.user.findUnique({
    where: {
      clerkUserId: userId,
    },
  });

    if (!user) throw new Error("User not found");


  try {
    // Check if industry insight already exists
    let industryInsight = await db.industryInsight.findUnique({
      where: {
        industry: data.industry,
      },
    });

    let insights = null;

    // Generate AI insights OUTSIDE transaction
    if (!industryInsight) {
      insights = await generateAIInsights(data.industry);

      // Fix enum casing
      insights.demandLevel =
        insights.demandLevel?.toUpperCase() || "MEDIUM";
    }

    // Database-only transaction
    const result = await db.$transaction(
      async (tx) => {

        // Create industry insight if not exists
        if (!industryInsight) {
          industryInsight =
            await tx.industryInsight.create({
              data: {
                industry: data.industry,
                ...insights,

                nextUpdate: new Date(
                  Date.now() +
                  7 * 24 * 60 * 60 * 1000
                ),
              },
            });
        }

        // Update user
        const updatedUser = await tx.user.update({
          where: {
            id: user.id,
          },
          data: {
            industry: data.industry,
            experience: data.experience,
            bio: data.bio,
            skills: data.skills,
          },
        });

        return {
          updatedUser,
          industryInsight,
        };
      },
      {
        timeout: 20000,
      }
    );

    return {
      success: true,
      ...result,
    };

  } catch (error) {
    console.error(
      "Error updating user and industry:",
      error.message
    );

    throw new Error(
      "Failed to update profile: " +
      error.message
    );
  }
}

export async function getUserOnboardingStatus() {
  const { userId } = await auth();

  if (!userId) {
    throw new Error("Unauthorized");
  }

  let user = await db.user.findUnique({
    where: {
      clerkUserId: userId,
    },
  });

  // Create user automatically if missing
  if (!user) {
    user = await db.user.create({
      data: {
        clerkUserId: userId,
      },
    });
  }

  return {
    isOnboarded: !!user?.industry,
  };
}
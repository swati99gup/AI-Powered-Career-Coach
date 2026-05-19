"use server";

import { db } from "@/lib/prisma";
import { auth } from "@clerk/nextjs/server";
import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-3.1-flash-lite" });
export async function generateCoverLetter(data) {
  try {
    const { userId } = await auth();

    console.log("USER ID:", userId);

    if (!userId) {
      return {
        success: false,
        message: "Unauthorized",
      };
    }

    console.log("Incoming Data:", data);

    const user = await db.user.findUnique({
      where: {
        clerkUserId: userId,
      },
    });

    console.log("DB USER:", user);

    if (!user) {
      throw new Error("User not found in database");
    }

    const prompt = `
      Write a professional cover letter for a ${data.jobTitle} position at ${data.companyName}.

      About the candidate:
      - Industry: ${user.industry}
      - Years of Experience: ${user.experience}
      - Skills: ${user.skills?.join(", ")}
      - Professional Background: ${user.bio}

      Job Description:
      ${data.jobDescription}
    `;

    console.log("PROMPT CREATED");

    const result = await model.generateContent(prompt);

    console.log("GEMINI RESULT:", result);

    const content = result.response.text().trim();

    console.log("CONTENT GENERATED");

    const coverLetter = await db.coverLetter.create({
      data: {
        content,
        jobDescription: data.jobDescription,
        companyName: data.companyName,
        jobTitle: data.jobTitle,
        status: "completed",
        userId: user.id,
      },
    });

    console.log("SAVED TO DB");

    return coverLetter;
  } catch (error) {
    console.error("FULL ERROR:", error);

    return {
      success: false,
      message: error.message,
    };
  }
}

export async function getCoverLetters() {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  const user = await db.user.findUnique({
    where: { clerkUserId: userId },
  });

  if (!user) throw new Error("User not found");

  return await db.coverLetter.findMany({
    where: {
      userId: user.id,
    },
    orderBy: {
      createdAt: "desc",
    },
  });
}

export async function getCoverLetter(id) {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  const user = await db.user.findUnique({
    where: { clerkUserId: userId },
  });

  if (!user) throw new Error("User not found");

  return await db.coverLetter.findUnique({
    where: {
      id,
      userId: user.id,
    },
  });
}

export async function deleteCoverLetter(id) {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  const user = await db.user.findUnique({
    where: { clerkUserId: userId },
  });

  if (!user) throw new Error("User not found");

  return await db.coverLetter.delete({
    where: {
      id,
      userId: user.id,
    },
  });
}

import { inngest } from "./client";
import { db } from "@/lib/prisma";
import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model=genAI.getGenerativeModel({
    model:"gemini-3.1-flash-lite",
})
export const generateIndustryInsights = inngest.createFunction(
  {
    id: "generate-industry-insights",
    cron: "0 0 * * 0",
  },

  async ({ step }) => {

    // Fetch all industries
    const industries = await step.run(
      "fetch-industries",
      async () => {
        return await db.industryInsight.findMany({
          select: {
            industry: true,
          },
        });
      }
    );

    // Generate insights for each industry
    for (const { industry } of industries) {

      const insights = await step.run(
        `generate-${industry}-insights`,
        async () => {

          const prompt = `
Analyze the current state of the ${industry} industry and provide insights in ONLY the following JSON format without any additional notes or explanations:

{
  "salaryRanges": [
    {
      "role": "string",
      "min": number,
      "max": number,
      "median": number,
      "location": "string"
    }
  ],
  "growthRate": number,
  "demandLevel": "HIGH" | "MEDIUM" | "LOW",
  "topSkills": ["skill1", "skill2"],
  "marketOutlook": "POSITIVE" | "NEUTRAL" | "NEGATIVE",
  "keyTrends": ["trend1", "trend2"],
  "recommendedSkills": ["skill1", "skill2"]
}

IMPORTANT:
- Return ONLY valid JSON
- No markdown
- No explanations
- Include at least 5 salary roles
- Include at least 5 skills
- Include at least 5 trends
`;

          const result = await model.generateContent(prompt);

          const response = result.response.text();

          const cleanedText = response
            .replace(/```json/g, "")
            .replace(/```/g, "")
            .trim();

          return JSON.parse(cleanedText);
        }
      );

      // Update database
      await step.run(
        `update-${industry}-insights`,
        async () => {

          await db.industryInsight.update({
            where: {
              industry,
            },

            data: {
              ...insights,

              lastUpdated: new Date(),

              nextUpdate: new Date(
                Date.now() + 7 * 24 * 60 * 60 * 1000
              ),
            },
          });
        }
      );
    }

    return {
      success: true,
    };
  }
);
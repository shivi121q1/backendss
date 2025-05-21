import express, { Request, Response } from "express";
import { PrismaClient, Brand_QA } from "@prisma/client";
import { GoogleGenerativeAI } from "@google/generative-ai";
import dotenv from "dotenv";

dotenv.config();

const router = express.Router();
const prisma = new PrismaClient();
const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY!);

type QARecord = {
  [key: string]: string;
};

const generateCustomUrl = (brandName: string, sessionId: string): string => {
  const slug = brandName.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-");
  return `${slug}-${sessionId}`;
};


const buildPrompt = (qa: QARecord): string => {
  return `
You're a creative branding assistant for a new MVNO (mobile virtual network operator). 
Based on the user’s answers, generate the following structured JSON that will be used in a customer-facing marketing page.

Use language that is:
- Simple and human — not robotic or overly technical.
- Engaging and intuitive — write as if speaking directly to everyday users.
- Consistent with the brand’s essence — reflect the tone, audience, and story in all sections.
- Never mention or repeat the brand name in descriptions or taglines.
- Avoid any "As an AI" phrases or meta commentary.

Generate this JSON format:

{
  "brand_description": "Write a warm, compelling, and easy-to-read 1–2 sentence summary based on the brand story: '${qa.brandStory}', tone: '${qa.brandTone}', and audience: '${qa.targetAudience}'. Avoid using the brand name. Keep it clear and emotionally resonant.",
  
  "tagline": "Write a punchy, creative tagline under 10 words. It should hint at the brand’s tone, values, or benefits.",

  "plan_names": [
    "Create 5 short, catchy mobile plan names that align with the brand’s category '${qa.brandCategory}' and story '${qa.brandStory}'. Avoid using the brand name. Return these as a plain JSON array, e.g. ['Smart Saver', 'Unlimited Edge']"
  ],

  "coverage_section": {
    "title": "Create a compelling headline that emphasizes coverage, reliability, or speed. Max 60 characters.",
    "subtitle": "Write a short, benefit-driven sentence highlighting coast-to-coast coverage, seamless connectivity, and trust. Max 120 characters."
  },

  "phone_compatibility_section": {
    "title": "Write an inviting headline that encourages users to bring their own phone. Max 60 characters.",
    "subtitle": "Provide a short, friendly reassurance that they can easily switch, keep their phone and number. Max 120 characters."
  }
}

User Answers:
- Brand Name: ${qa.brandName}
- Brand Inspiration: ${qa.brandInspiration}
- Category: ${qa.brandCategory}
- Tone: ${qa.brandTone}
- Target Audience: ${qa.targetAudience}
- Social Platforms: ${qa.socialPlatforms}
- Brand Story: ${qa.brandStory}

`;


};


import { generateAllBanners } from "../utils/generarteImage";

router.get("/generate/:sessionId", async (req: any, res: any) => {
  const { sessionId } = req.params;

  console.log("Started")

  try {
    const existingContent = await prisma.brandContent.findUnique({
      where: { sessionId },
    });

    if (existingContent) {
      return res.status(200).json({
        message: "Brand content already generated.",
        brandContent: existingContent,
      });
    }

    const qaEntries: Brand_QA[] = await prisma.brand_QA.findMany({
      where: { sessionId },
    });

    const qaMap: QARecord = {};
    for (const qa of qaEntries) {
      qaMap[qa.stepKey] = qa.answer;
    }

    if (!qaMap.brandName || !qaMap.brandStory || !qaMap.brandCategory) {
      return res.status(400).json({
        error: "Essential brand details are missing (brandName, brandStory, or brandCategory).",
      });
    }

    const prompt = buildPrompt(qaMap);
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const output = await response.text();
    console.log("Generated Output: ", output);

    try {
      const cleanedOutput = output.replace(/```json|```/g, "").trim();
      const content = JSON.parse(cleanedOutput);

      const { coverage_section, phone_compatibility_section, plan_names } = content;
      const { brand_description, tagline } = content;

      const customUrl = generateCustomUrl(qaMap.brandName, sessionId);
      const pricingPlans = Array.isArray(plan_names) ? plan_names : [];

      // ✅ Generate banner images
      const {
        BannerDesktop,
        BannerImageIpad,
        BannerImageMobile,
        phoneCompatibilityImage,
        coverageSubtitleImage,
      } = await generateAllBanners(qaMap.brandName, qaMap.brandCategory);

      // ✅ Fetch logo and color values from BrandLogo
      const logoData = await prisma.brandLogo.findUnique({
        where: { sessionId },
      });

      const brandContent = await prisma.brandContent.upsert({
        where: { sessionId },
        update: {
          brandName: qaMap.brandName,
          brandDescription: brand_description,
          tagline,
          logoUrl: logoData?.logoUrl ?? "",
          primaryColor: logoData?.primaryColor ?? "#000000",
          secondaryColor: logoData?.secondaryColor ?? null,
          tertiaryColor: logoData?.tertiaryColor ?? null,
          BannerDesktop,
          BannerImageIpad,
          BannerImageMobile,
          phoneCompatibilityImage,
          coverageSubtitleImage,
          coverageTitle: coverage_section.title,
          coverageSubtitle: coverage_section.subtitle,
          phoneCompatibilityTitle: phone_compatibility_section.title,
          phoneCompatibilitySubtitle: phone_compatibility_section.subtitle,
          customUrl,
          pricingPlans,
        },
        create: {
          sessionId,
          brandName: qaMap.brandName,
          brandDescription: brand_description,
          tagline,
          logoUrl: logoData?.logoUrl ?? "",
          primaryColor: logoData?.primaryColor ?? "#000000",
          secondaryColor: logoData?.secondaryColor ?? null,
          tertiaryColor: logoData?.tertiaryColor ?? null,
          BannerDesktop,
          BannerImageIpad,
          BannerImageMobile,
          phoneCompatibilityImage,
          coverageSubtitleImage,
          coverageTitle: coverage_section.title,
          coverageSubtitle: coverage_section.subtitle,
          phoneCompatibilityTitle: phone_compatibility_section.title,
          phoneCompatibilitySubtitle: phone_compatibility_section.subtitle,
          customUrl,
          pricingPlans,
        },
      });
      console.log("Ended the processs")
      res.status(200).json({
        result: cleanedOutput,
        brandUrl: customUrl,
      });

    } catch (error: any) {
      console.error("Error parsing generated content:", error);
      res.status(500).json({ error: "Failed to parse generated content." });
    }
  } catch (error: any) {
    console.error("Error generating brand content:", error);
    res.status(500).json({ error: "Something went wrong while generating content." });
  }
});


const allowedKeys = [
  "brandName", "brandDescription", "tagline", "logoUrl",
  "BannerDesktop", "BannerImageIpad", "BannerImageMobile",
  "phoneCompatibilityImage", "coverageSubtitleImage",
  "coverageTitle", "coverageSubtitle",
  "phoneCompatibilityTitle", "phoneCompatibilitySubtitle",
  "customUrl", "pricingPlans",
  "primaryColor", "secondaryColor", "tertiaryColor"
];

router.post('/update', async (req: any, res: any) => {
  const { sessionId, key, value, updates } = req.body;

  if (!sessionId) {
    return res.status(400).json({ error: "Missing sessionId." });
  }

  let updateData: Record<string, any> = {};

  // Handle multiple updates
  if (updates && typeof updates === 'object') {
    for (const [k, v] of Object.entries(updates)) {
      if (!allowedKeys.includes(k)) {
        return res.status(400).json({ error: `Key '${k}' is not allowed to be updated.` });
      }
      updateData[k] = k === "pricingPlans" ? (Array.isArray(v) ? v : [v]) : v;
    }
  }
  // Handle single update
  else if (key && value !== undefined) {
    if (!allowedKeys.includes(key)) {
      return res.status(400).json({ error: `Key '${key}' is not allowed to be updated.` });
    }
    updateData[key] = key === "pricingPlans" ? (Array.isArray(value) ? value : [value]) : value;
  } else {
    return res.status(400).json({ error: "Missing or invalid update data." });
  }

  try {
    // First, check if the session exists
    const existing = await prisma.brandContent.findUnique({
      where: { sessionId },
    });

    if (!existing) {
      return res.status(404).json({ error: "BrandContent not found for this sessionId." });
    }

    // Proceed to update
    const updated = await prisma.brandContent.update({
      where: { sessionId },
      data: updateData,
    });

    return res.status(200).json({
      message: `Updated ${Object.keys(updateData).join(', ')}`,
      data: updated,
    });
  } catch (err: any) {
    console.error("Update error:", err);
    return res.status(500).json({
      error: err?.message || "Internal server error",
    });
  }
});



// export default router;

router.post("/logo/:sessionId", async (req: any, res: any) => {
  const { sessionId } = req.params;
  const { logoUrl, primaryColor, secondaryColor, tertiaryColor } = req.body;

  if (!logoUrl || !primaryColor) {
    return res.status(400).json({
      error: "Both 'logoUrl' and 'primaryColor' are required.",
    });
  }

  try {
    // Check if session exists
    const session = await prisma.brands_Session.findUnique({
      where: { id: sessionId },
    });

    if (!session) {
      return res.status(404).json({ error: "Session not found." });
    }

    // Upsert brandLogo
    const logoEntry = await prisma.brandLogo.upsert({
      where: { sessionId },
      update: {
        logoUrl,
        primaryColor,
        secondaryColor,
        tertiaryColor,
      },
      create: {
        sessionId,
        logoUrl,
        primaryColor,
        secondaryColor,
        tertiaryColor,
      },
    });

    // Upsert logoUrl into Brand_QA with stepKey "logoUrl"
    await prisma.brand_QA.upsert({
      where: {
        sessionId_stepKey: {
          sessionId,
          stepKey: "logoUrl",
        },
      },
      update: {
        answer: logoUrl,
      },
      create: {
        sessionId,
        stepKey: "logoUrl",
        question: "Brand Logo URL", // Optional: you can customize or store it differently
        answer: logoUrl,
      },
    });

    res.status(200).json({
      message: "Logo and colors saved successfully, logo URL updated in Brand_QA.",
      brandLogo: logoEntry,
    });
  } catch (error) {
    console.error("Error saving logo/colors or updating Brand_QA:", error);
    res.status(500).json({ error: "Internal server error." });
  }
});






// Get brand QA + content details
router.get("/details/:sessionId", async (req: Request, res: Response) => {
  const { sessionId } = req.params;

  try {
    // Get QA data for the session
    const qaEntries = await prisma.brand_QA.findMany({
      where: { sessionId },
    });

    // Convert to a key-value object
    const qaMap: QARecord = {};
    qaEntries.forEach((qa) => {
      qaMap[qa.stepKey] = qa.answer;
    });

    // Get generated brand content if it exists
    const brandContent = await prisma.brandContent.findUnique({
      where: { sessionId },
    });

    res.status(200).json({
      sessionId,
      qa: qaMap,
      brandContent: brandContent || null,
    });
  } catch (error) {
    console.error("Error fetching brand details:", error);
    res.status(500).json({ error: "Failed to fetch brand details." });
  }
});
router.put("/update-field/:sessionId", async (req: any, res: any) => {
  const { sessionId } = req.params;
  const { fieldName, value } = req.body;  // Get the field name and value from the request body

  // Ensure fieldName and value are provided
  if (!fieldName || !value) {
    return res.status(400).json({ error: "fieldName and value are required" });
  }

  try {
    // Update the specified field dynamically
    const updatedContent = await prisma.brandContent.update({
      where: { sessionId },
      data: {
        [fieldName]: value, // Dynamically update the field
      },
    });

    res.status(200).json({
      message: "Brand content updated successfully",
      updatedContent,
    });
  } catch (error) {
    console.error("Error updating brand content:", error);
    res.status(500).json({ error: "Failed to update brand content" });
  }
});

router.post("/generate-field/:sessionId", async (req: any, res: any) => {
  const { sessionId } = req.params
  const { fieldName, customPrompt, previoudData } = req.body;

  if (!sessionId || !fieldName || !customPrompt) {
    return res.status(400).json({ error: "sessionId, fieldName, and customPrompt are required." });
  }

  try {
    const qaEntries = await prisma.brand_QA.findMany({
      where: { sessionId },
    });

    if (!qaEntries || qaEntries.length === 0) {
      return res.status(404).json({ error: "No QA data found for the given session." });
    }

    // Map to key-value format
    const qaMap: Record<string, string> = {};
    qaEntries.forEach((qa) => {
      qaMap[qa.stepKey] = qa.answer;
    });



    // Construct the prompt
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    const finalPrompt = `
You're a branding assistant. Based on the brand's context and tone, generate updated ${fieldName} for the field "${fieldName}".

where previous data is ${fieldName} : ${previoudData}

User context:
${Object.entries(qaMap).map(([k, v]) => `- ${k}: ${v}`).join("\n")}

Instruction:
${customPrompt}

Return only a valid JSON with one key called "updatedContent". 
Do not include anything else.
Format: { "updatedContent": "your generated answer here" }
`;

    const result = await model.generateContent(finalPrompt);
    const response = await result.response;
    const text = await response.text();

    const cleanedOutput = text.replace(/```json|```/g, '').trim();

    try {
      const parsed = JSON.parse(cleanedOutput);

      if (!parsed.updatedContent) {
        throw new Error("Missing 'updatedContent' in response.");
      }

      return res.status(200).json({
        fieldName,
        updatedContent: parsed.updatedContent,
      });
    } catch (err) {
      console.error("Error parsing AI output:", err);
      return res.status(500).json({ error: "AI response was not in the correct format." });
    }
  } catch (error) {
    console.error("Error generating field content:", error);
    return res.status(500).json({ error: "Failed to generate field content." });
  }
});

// POST or PUT to /brand-content/logo






export default router;

// import { Router, Request, Response } from 'express';
// import { GoogleGenerativeAI } from '@google/generative-ai';
// import { uploadToS3 } from '../utils/s3';
// import sharp from 'sharp';

// const router = Router();

// interface GenerateLogoRequest {
//   brandName: string;
//   domain: string;
//   variationCount?: number;
//   primary: string;
//   secondary?: string;
//   tertiary?: string;
// }

// const getLogoPrompts = (
//   brandName: string,
//   domain: string,
//   colors: { primary: string; secondary?: string; tertiary?: string }
// ): string[] => {
//   const { primary, secondary, tertiary } = colors;
//   const colorPalette = [primary, secondary, tertiary].filter(Boolean).join(', ');

//   return [
//     `Design a professional and elegant logo for ${brandName}, specializing in ${domain}. Use these brand colors: ${colorPalette}. Include a subtle abstract icon.`,
//     `Create a unique logo for ${brandName}, focusing on ${domain}. Use this color palette: ${colorPalette}. Think outside the box with a clever visual.`,
//     `Generate a vibrant and playful logo for ${brandName}, operating in ${domain}. Use bright and soft shapes with these colors: ${colorPalette}.`,
//     `Design a natural and flowing logo for ${brandName}, in the ${domain} field. Apply these colors: ${colorPalette}. Use organic forms like leaves or waves.`,
//     `Craft an abstract and modern logo for ${brandName}, related to ${domain}. Avoid literal symbols and use this palette: ${colorPalette}.`,
//   ];
// };

// router.post('/generate-logos', async (req: any, res: any) => {
//   try {
//     const {
//       brandName,
//       domain,
//       variationCount = 5,
//       primary,
//       secondary,
//       tertiary,
//     }: GenerateLogoRequest = req.body;

//     if (!brandName || !domain || !primary) {
//       return res.status(400).json({ error: 'brandName, domain and primary color are required' });
//     }

//     const prompts = getLogoPrompts(brandName, domain, { primary, secondary, tertiary }).slice(
//       0,
//       variationCount
//     );

//     const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');
//     const model = genAI.getGenerativeModel({
//       model: 'gemini-2.0-flash-exp-image-generation',
//       generationConfig: {
//         responseMimeType: 'image/png',
//       },
//     });

//     const logoResults: string[] = [];

//     for (let i = 0; i < prompts.length; i++) {
//       const prompt = prompts[i];

//       const result = await model.generateContent(prompt);
//       const response = await result.response;

//       const parts = response.parts || [];

//       for (const part of parts) {
//         if (
//           part.inlineData &&
//           part.inlineData.data &&
//           part.inlineData.mimeType &&
//           part.inlineData.mimeType.includes('image')
//         ) {
//           const imageBuffer = Buffer.from(part.inlineData.data, 'base64');

//           // Convert PNG buffer to SVG buffer (lossy, best for simple logos)
//           const svgBuffer = await sharp(imageBuffer)
//             .resize(512, 512, { fit: 'contain' })
//             .toFormat('svg')
//             .toBuffer();

//           const filename = `${brandName.toLowerCase()}-logo-${i + 1}.svg`;
//           const s3Url = await uploadToS3(svgBuffer, filename, 'image/svg+xml');

//           logoResults.push(s3Url);
//         }
//       }
//     }

//     return res.json({ success: true, logos: logoResults });
//   } catch (error: any) {
//     console.error('Error generating logos:', error);
//     return res.status(500).json({ error: 'Failed to generate logos', details: error.message });
//   }
// });

// export default router;

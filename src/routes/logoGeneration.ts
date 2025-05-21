// import { Router, Request, Response } from 'express';
// import { GoogleGenerativeAI } from '@google/generative-ai';
// import { uploadImageToS3 } from '../utils/s3';
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

// const MAX_VARIATIONS = 10;

// const getIconLogoPrompts = (
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

// const getTextLogoPrompts = (
//   brandName: string,
//   domain: string,
//   colors: { primary: string; secondary?: string; tertiary?: string }
// ): string[] => {
//   const { primary, secondary, tertiary } = colors;
//   const colorPalette = [primary, secondary, tertiary].filter(Boolean).join(', ');

//   return [
//     `Create a stylish, text-based logo for ${brandName} focused on ${domain}. Use colors: ${colorPalette}. Focus on creative typography, letter spacing, and font style.`,
//     `Design a modern and sleek typographic logo for ${brandName} in the ${domain} sector. Use color palette: ${colorPalette}. Emphasize bold, readable letters.`,
//     `Generate a minimalistic and elegant text logo for ${brandName}, specializing in ${domain}. Use these colors: ${colorPalette}. Avoid icons, highlight letterforms.`,
//     `Create a vibrant and playful typographic logo for ${brandName} in ${domain}. Use the colors: ${colorPalette}. Use custom fonts and letter shapes.`,
//     `Craft a professional and clean text-only logo for ${brandName}, related to ${domain}. Use these brand colors: ${colorPalette}. Focus on font pairing and layout.`,
//   ];
// };

// async function processImagePart(
//   part: any,
//   brandName: string,
//   index: number
// ): Promise<string | null> {
//   if (
//     part.inlineData &&
//     part.inlineData.data &&
//     part.inlineData.mimeType &&
//     part.inlineData.mimeType.includes('image')
//   ) {
//     try {
//       const imageBuffer = Buffer.from(part.inlineData.data, 'base64');

//       // Convert PNG/JPEG buffer to SVG (lossy, for simple logos)
//       const svgBuffer = await sharp(imageBuffer)
//         .resize(512, 512, { fit: 'contain' })
//         .toFormat('svg')
//         .toBuffer();

//       const s3Response = await uploadImageToS3(svgBuffer, brandName, 'svg', index);
//       return s3Response.url;
//     } catch (err) {
//       console.error(`Error processing image part index ${index}:`, err);
//       return null;
//     }
//   }
//   return null;
// }

// // === Icon based logos ===
// router.post('/generate-icon-logos', async (req: any, res: any) => {
//   try {
//     const {
//       brandName,
//       domain,
//       variationCount = 5,
//       primary,
//       secondary,
//       tertiary,
//     } = req.body as GenerateLogoRequest;

//     if (!brandName || !domain || !primary) {
//       return res.status(400).json({
//         success: false,
//         error: 'brandName, domain, and primary color are required',
//       });
//     }

//     const count = Math.min(variationCount, MAX_VARIATIONS);
//     const prompts = getIconLogoPrompts(brandName, domain, { primary, secondary, tertiary }).slice(
//       0,
//       count
//     );

//     const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY || '');
//     const model = genAI.getGenerativeModel({
//       model: 'gemini-2.0-flash-exp-image-generation',
//       generationConfig: {
//         responseMimeType: 'image/png',
//       },
//     });

//     const logoUrls: string[] = [];

//     for (let i = 0; i < prompts.length; i++) {
//       const prompt = prompts[i];
//       const generation = await model.generateContent(prompt);
//       const response = await generation.response;
//       const candidates = response.candidates || [];

//       for (const candidate of candidates) {
//         if (candidate.content && candidate.content.parts) {
//           for (const part of candidate.content.parts) {
//             const s3Url = await processImagePart(part, brandName, i + 1);
//             if (s3Url) {
//               logoUrls.push(s3Url);
//             }
//           }
//         }
//       }
//     }

//     return res.json({
//       success: true,
//       logos: logoUrls,
//     });
//   } catch (error: any) {
//     console.error('Error generating icon logos:', error);
//     return res.status(500).json({
//       success: false,
//       error: 'Failed to generate icon logos',
//       details: error.message || error,
//     });
//   }
// });

// // === Text based logos ===
// router.post('/generate-text-logos', async (req: any, res: any) => {
//   try {
//     const {
//       brandName,
//       domain,
//       variationCount = 5,
//       primary,
//       secondary,
//       tertiary,
//     } = req.body as GenerateLogoRequest;

//     if (!brandName || !domain || !primary) {
//       return res.status(400).json({
//         success: false,
//         error: 'brandName, domain, and primary color are required',
//       });
//     }

//     const count = Math.min(variationCount, MAX_VARIATIONS);
//     const prompts = getTextLogoPrompts(brandName, domain, { primary, secondary, tertiary }).slice(
//       0,
//       count
//     );

//     const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY || '');
//     const model = genAI.getGenerativeModel({
//       model: 'gemini-2.0-flash-text', // hypothetical text logo model (adjust if needed)
//       generationConfig: {
//         responseMimeType: 'image/svg+xml', // text logos as SVG preferred
//       },
//     });

//     const logoUrls: string[] = [];

//     for (let i = 0; i < prompts.length; i++) {
//       const prompt = prompts[i];
//       const generation = await model.generateContent(prompt);
//       const response = await generation.response;
//       const candidates = response.candidates || [];

//       for (const candidate of candidates) {
//         if (candidate.content && candidate.content.parts) {
//           for (const part of candidate.content.parts) {
//             // For text logos, assume SVG base64 string or plain SVG text
//             if (part.inlineData && part.inlineData.data && part.inlineData.mimeType?.includes('svg')) {
//               try {
//                 const svgBuffer = Buffer.from(part.inlineData.data, 'base64');
//                 // Upload SVG directly
//                 const s3Response = await uploadImageToS3(svgBuffer, brandName, 'svg', i + 1);
//                 if (s3Response.url) {
//                   logoUrls.push(s3Response.url);
//                 }
//               } catch (err) {
//                 console.error('Error processing text logo SVG:', err);
//               }
//             } else if (part.text) {
//               // If plain text, consider saving as .svg or .txt file on S3
//               // Simplify by returning the raw text in the response (optional)
//               logoUrls.push(part.text);
//             }
//           }
//         }
//       }
//     }

//     return res.json({
//       success: true,
//       logos: logoUrls,
//     });
//   } catch (error: any) {
//     console.error('Error generating text logos:', error);
//     return res.status(500).json({
//       success: false,
//       error: 'Failed to generate text logos',
//       details: error.message || error,
//     });
//   }
// });

// export default router;

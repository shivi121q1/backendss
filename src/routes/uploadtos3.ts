import { Router } from "express";
import {
  S3Client,
  PutObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

const router = Router();

const REGION = process.env.AWS_REGION || "your-region";
const BUCKET_NAME = process.env.AWS_S3_BUCKET_NAME || "your-bucket-name";

const s3Client = new S3Client({
  region: REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || "",
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || "",
  },
});

router.get("/get-presigned-url", async (req:any, res:any) => {
  try {
    const key = req.query.key as string;
    if (!key) {
      return res.status(400).json({ error: "Missing key parameter" });
    }

    const command = new PutObjectCommand({
      Bucket: BUCKET_NAME,
      Key: key,
      ContentType: "image/*", // restrict to image mimetypes
    });

    const url = await getSignedUrl(s3Client, command, { expiresIn: 300 }); // 5 mins

    res.json({ url });
  } catch (error) {
    console.error("Error generating presigned URL:", error);
    res.status(500).json({ error: "Failed to generate presigned URL" });
  }
});

export default router;

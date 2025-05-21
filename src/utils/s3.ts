import AWS from 'aws-sdk';
import { v4 as uuidv4 } from 'uuid';

const s3 = new AWS.S3({
  region: process.env.AWS_REGION,
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
});

interface UploadResult {
  id: string;
  url: string;
  format: string;
  name: string;
}

export async function uploadImageToS3(
  imageData: Buffer,
  brandName: string,
  imageFormat: string,
  index: number
): Promise<UploadResult> {
  try {
    const uniqueId = uuidv4().slice(0, 8);
    const sanitizedBrand = brandName.replace(/\s+/g, '_');
    const filename = `${sanitizedBrand}_${index}_${uniqueId}.${imageFormat}`;

    const params: AWS.S3.PutObjectRequest = {
      Bucket: process.env.S3_BUCKET_NAME!,
      Key: filename,
      Body: imageData,
      ContentType: `image/${imageFormat}`,
      ACL: 'public-read',
    };

    await s3.putObject(params).promise();

    const url = `https://${process.env.S3_BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/${filename}`;

    return {
      id: `logo_${index}`,
      url,
      format: imageFormat,
      name: filename,
    };
  } catch (error: any) {
    throw new Error(`S3 upload error: ${error.message || error}`);
  }
}

import { v2 as cloudinary } from 'cloudinary';
import streamifier from 'streamifier';

cloudinary.config({
  cloud_name: 'dkgnktjhg',
  api_key: '534878118884476',
  api_secret: '-IuC5PkNr32JU4_Um1k5RRJpV9g'
});

/**
 * Uploads an audio buffer to Cloudinary and returns the secure URL.
 * @param buffer The audio file buffer
 * @param filename Optional filename (without extension)
 * @param folder The folder in Cloudinary to upload to
 * @returns The secure URL of the uploaded audio
 */
export async function uploadAudioToCloudinary(
  buffer: Buffer | Uint8Array,
  filename: string,
  folder: string = 'news_audios'
): Promise<string> {
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        resource_type: 'video', // Audio uses the 'video' resource type in Cloudinary
        folder: folder,
        public_id: filename,
        format: 'mp3',
        overwrite: true,
      },
      (error, result) => {
        if (error) {
          console.error('Cloudinary upload error:', error);
          reject(error);
        } else if (result) {
          resolve(result.secure_url);
        } else {
          reject(new Error('Unknown error during Cloudinary upload'));
        }
      }
    );

    // Convert Uint8Array/Buffer to stream and pipe it to Cloudinary
    streamifier.createReadStream(Buffer.from(buffer)).pipe(uploadStream);
  });
}

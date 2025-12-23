/**
 * Shared Image Utility for client-side resizing and compression.
 * Helps prevent Payload Too Large errors and saves bandwidth/storage.
 */

import heic2any from 'heic2any';

/**
 * Converts HEIC/HEIF images to JPEG format.
 * @param file The original HEIC File object.
 * @returns A Promise that resolves to a JPEG File object.
 */
export const convertHeicToJpeg = async (file: File): Promise<File> => {
    try {
        // Check if it's a HEIC file
        const isHeic = file.name.toLowerCase().endsWith('.heic') ||
            file.name.toLowerCase().endsWith('.heif') ||
            file.type === 'image/heic' ||
            file.type === 'image/heif';

        if (!isHeic) {
            return file; // Not HEIC, return as-is
        }

        console.log('Converting HEIC to JPEG...');

        // Convert HEIC to JPEG
        const convertedBlob = await heic2any({
            blob: file,
            toType: 'image/jpeg',
            quality: 0.9 // High quality for initial conversion
        });

        // heic2any can return Blob or Blob[], handle both
        const blob = Array.isArray(convertedBlob) ? convertedBlob[0] : convertedBlob;

        // Create new File from Blob
        const newName = file.name.replace(/\.(heic|heif)$/i, '.jpg');
        const newFile = new File([blob], newName, {
            type: 'image/jpeg',
            lastModified: Date.now(),
        });

        console.log('HEIC conversion successful!');
        return newFile;
    } catch (error) {
        console.error('HEIC conversion failed:', error);
        throw new Error('Failed to convert HEIC image');
    }
};

/**
 * Resizes an image file to a maximum dimension and compresses it to JPEG.
 * @param file The original image File object.
 * @param maxDim The maximum width or height (default 1024px).
 * @param quality JPEG quality (0.0 to 1.0, default 0.7).
 * @returns A Promise that resolves to a new File object (compressed).
 */
export const compressImage = (file: File, maxDim = 1024, quality = 0.7): Promise<File> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);

        reader.onload = (event) => {
            const img = new Image();
            img.src = event.target?.result as string;

            img.onload = () => {
                const canvas = document.createElement('canvas');
                let width = img.width;
                let height = img.height;

                // Simple Aspect Ratio Resizing
                if (width > height) {
                    if (width > maxDim) {
                        height *= maxDim / width;
                        width = maxDim;
                    }
                } else {
                    if (height > maxDim) {
                        width *= maxDim / height;
                        height = maxDim;
                    }
                }

                canvas.width = width;
                canvas.height = height;

                const ctx = canvas.getContext('2d');
                if (!ctx) {
                    reject(new Error("Could not get canvas context"));
                    return;
                }

                ctx.drawImage(img, 0, 0, width, height);

                // Convert to Blob/File
                canvas.toBlob((blob) => {
                    if (!blob) {
                        reject(new Error("Canvas to Blob failed"));
                        return;
                    }
                    // Create new File with same name but .jpg extension if needed
                    const newName = file.name.replace(/\.[^/.]+$/, "") + ".jpg";
                    const newFile = new File([blob], newName, {
                        type: "image/jpeg",
                        lastModified: Date.now(),
                    });
                    resolve(newFile);
                }, 'image/jpeg', quality);
            };

            img.onerror = (err) => reject(err);
        };

        reader.onerror = (err) => reject(err);
    });
};

/**
 * Helper to convert File to Base64 (useful for previews or AI payload).
 * Note: If using for AI, compress it first using compressImage!
 */
export const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = (error) => reject(error);
    });
};

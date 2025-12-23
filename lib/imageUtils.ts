/**
 * Shared Image Utility for client-side resizing and compression.
 * Helps prevent Payload Too Large errors and saves bandwidth/storage.
 */

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

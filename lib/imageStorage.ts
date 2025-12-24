// Supabase Storage utilities for optimized image uploads
// Uses CDN with cache headers and image transformations

import { supabase } from '../supabaseClient';

const BUCKET_NAME = 'post-images';
const AVATAR_BUCKET = 'avatars';

interface UploadResult {
    url: string;
    path: string;
}

// Generate unique file path
const generatePath = (userId: string, fileExtension: string = 'jpg'): string => {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(7);
    return `${userId}/${timestamp}_${random}.${fileExtension}`;
};

// Upload post image to Supabase Storage
export const uploadPostImage = async (
    file: File | Blob,
    userId: string
): Promise<UploadResult> => {
    const path = generatePath(userId, 'jpg');

    const { data, error } = await supabase.storage
        .from(BUCKET_NAME)
        .upload(path, file, {
            cacheControl: '31536000', // 1 year cache
            contentType: 'image/jpeg',
            upsert: false
        });

    if (error) throw error;

    // Get public URL via CDN
    const { data: urlData } = supabase.storage
        .from(BUCKET_NAME)
        .getPublicUrl(path);

    return {
        url: urlData.publicUrl,
        path: path
    };
};

// Upload avatar image
export const uploadAvatar = async (
    file: File | Blob,
    userId: string
): Promise<UploadResult> => {
    const path = `${userId}/avatar.jpg`;

    const { data, error } = await supabase.storage
        .from(AVATAR_BUCKET)
        .upload(path, file, {
            cacheControl: '86400', // 24 hour cache for avatars (change more often)
            contentType: 'image/jpeg',
            upsert: true // Allow overwriting avatar
        });

    if (error) throw error;

    // Get public URL
    const { data: urlData } = supabase.storage
        .from(AVATAR_BUCKET)
        .getPublicUrl(path);

    // Add timestamp to bust cache when avatar changes
    return {
        url: `${urlData.publicUrl}?t=${Date.now()}`,
        path: path
    };
};

// Delete image from storage
export const deleteImage = async (path: string, bucket: string = BUCKET_NAME): Promise<void> => {
    const { error } = await supabase.storage
        .from(bucket)
        .remove([path]);

    if (error) {
        console.error('Error deleting image:', error);
    }
};

// Convert File to base64 for preview (client-side only)
export const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = error => reject(error);
    });
};

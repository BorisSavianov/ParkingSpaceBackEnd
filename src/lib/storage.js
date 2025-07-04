// src/lib/storage.js
import { supabase, PARKING_DOCUMENTS_BUCKET } from "./supabase.js";

/**
 * Upload a PDF file to Supabase storage
 * @param {File} file - The PDF file to upload
 * @param {string} userId - The user ID for file organization
 * @param {string} reservationId - The reservation ID (optional, for organization)
 * @returns {Promise<{success: boolean, data?: object, error?: string}>}
 */
export async function uploadPDF(file, userId, reservationId = null) {
  try {
    // Validate file type
    if (file.type !== "application/pdf") {
      return {
        success: false,
        error: "Only PDF files are allowed",
      };
    }

    // Validate file size (max 2MB)
    const maxSize = 2 * 1024 * 1024; // 2MB in bytes
    if (file.size > maxSize) {
      return {
        success: false,
        error: "File size must be less than 2MB",
      };
    }

    // Generate unique filename
    const timestamp = Date.now();
    const randomStr = Math.random().toString(36).substring(2, 15);
    const filename = `${userId}/${timestamp}_${randomStr}_${file.name}`;

    // Upload file to Supabase storage
    const { data, error } = await supabase.storage
      .from(PARKING_DOCUMENTS_BUCKET)
      .upload(filename, file, {
        cacheControl: "3600",
        upsert: false,
      });

    if (error) {
      console.error("Upload error:", error);
      return {
        success: false,
        error: "Failed to upload file",
      };
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from(PARKING_DOCUMENTS_BUCKET)
      .getPublicUrl(filename);

    return {
      success: true,
      data: {
        path: data.path,
        publicUrl: urlData.publicUrl,
        filename: file.name,
        size: file.size,
        uploadedAt: new Date().toISOString(),
      },
    };
  } catch (error) {
    console.error("Upload error:", error);
    return {
      success: false,
      error: "Failed to upload file",
    };
  }
}

/**
 * Delete a PDF file from Supabase storage
 * @param {string} filePath - The path of the file to delete
 * @returns {Promise<{success: boolean, error?: string}>}
 */
export async function deletePDF(filePath) {
  try {
    const { error } = await supabase.storage
      .from(PARKING_DOCUMENTS_BUCKET)
      .remove([filePath]);

    if (error) {
      console.error("Delete error:", error);
      return {
        success: false,
        error: "Failed to delete file",
      };
    }

    return {
      success: true,
    };
  } catch (error) {
    console.error("Delete error:", error);
    return {
      success: false,
      error: "Failed to delete file",
    };
  }
}

/**
 * Get a signed URL for downloading a private file
 * @param {string} filePath - The path of the file
 * @param {number} expiresIn - Expiration time in seconds (default: 1 hour)
 * @returns {Promise<{success: boolean, url?: string, error?: string}>}
 */
export async function getSignedUrl(filePath, expiresIn = 3600) {
  try {
    const { data, error } = await supabase.storage
      .from(PARKING_DOCUMENTS_BUCKET)
      .createSignedUrl(filePath, expiresIn);

    if (error) {
      console.error("Signed URL error:", error);
      return {
        success: false,
        error: "Failed to generate download URL",
      };
    }

    return {
      success: true,
      url: data.signedUrl,
    };
  } catch (error) {
    console.error("Signed URL error:", error);
    return {
      success: false,
      error: "Failed to generate download URL",
    };
  }
}

/**
 * Validate PDF file on client side
 * @param {File} file - The file to validate
 * @returns {Promise<{valid: boolean, error?: string}>}
 */
export async function validatePDF(file) {
  // Check file type
  if (file.type !== "application/pdf") {
    return {
      valid: false,
      error: "Only PDF files are allowed",
    };
  }

  // Check file size (max 2MB)
  const maxSize = 2 * 1024 * 1024; // 2MB in bytes
  if (file.size > maxSize) {
    return {
      valid: false,
      error: "File size must be less than 2MB",
    };
  }

  // Check file name length
  if (file.name.length > 100) {
    return {
      valid: false,
      error: "File name is too long (max 100 characters)",
    };
  }

  // Basic file signature check for PDF
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = function (e) {
      const buffer = new Uint8Array(e.target.result);

      // Check PDF signature (%PDF)
      if (
        buffer.length >= 4 &&
        buffer[0] === 0x25 &&
        buffer[1] === 0x50 &&
        buffer[2] === 0x44 &&
        buffer[3] === 0x46
      ) {
        resolve({ valid: true });
      } else {
        resolve({
          valid: false,
          error: "Invalid PDF file format",
        });
      }
    };
    reader.onerror = () => {
      resolve({
        valid: false,
        error: "Failed to read file",
      });
    };
    reader.readAsArrayBuffer(file.slice(0, 8));
  });
}

// src/routes/api/parking/upload/+server.js
import { json } from "@sveltejs/kit";
import { authenticateRequest } from "$lib/auth-middleware.js";
import { uploadPDF } from "$lib/storage.js";

export async function POST({ request }) {
  try {
    // Authenticate the request
    const authResult = await authenticateRequest(request);

    if (!authResult.success) {
      return json(
        { success: false, error: authResult.error },
        { status: authResult.status }
      );
    }

    const { uid: userId } = authResult.user;

    // Parse form data
    const formData = await request.formData();
    const file = formData.get("file");
    const reservationId = formData.get("reservationId");

    if (!file || file.size === 0) {
      return json(
        {
          success: false,
          error: "No file uploaded",
        },
        { status: 400 }
      );
    }

    // Validate file type
    if (file.type !== "application/pdf") {
      return json(
        {
          success: false,
          error: "Only PDF files are allowed",
        },
        { status: 400 }
      );
    }

    // Validate file size (max 2MB)
    const maxSize = 2 * 1024 * 1024; // 2MB in bytes
    if (file.size > maxSize) {
      return json(
        {
          success: false,
          error: "File size must be less than 10MB",
        },
        { status: 400 }
      );
    }

    // Upload file to Supabase storage
    const uploadResult = await uploadPDF(file, userId, reservationId);

    if (!uploadResult.success) {
      return json(
        {
          success: false,
          error: uploadResult.error,
        },
        { status: 500 }
      );
    }

    return json({
      success: true,
      message: "File uploaded successfully",
      data: uploadResult.data,
    });
  } catch (error) {
    console.error("Upload error:", error);
    return json(
      {
        success: false,
        error: "Failed to upload file",
      },
      { status: 500 }
    );
  }
}

export async function OPTIONS() {
  return new Response(null, {
    headers: {
      "Access-Control-Allow-Origin": "*", // Specify the url you wish to permit
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    },
  });
}

// src/routes/api/admin/documents/[reservationId]/+server.js
import { json } from "@sveltejs/kit";
import { requireAdmin } from "$lib/auth-middleware.js";
import { db } from "$lib/firebase.js";
import { doc, getDoc } from "firebase/firestore";
import { getSignedUrl } from "$lib/storage.js";

export async function GET({ params, request }) {
  try {
    // Check admin authentication
    const authResult = await requireAdmin(request);
    if (!authResult.success) {
      return json(
        { success: false, error: authResult.error },
        { status: authResult.status }
      );
    }

    const { reservationId } = params;

    // Get reservation
    const reservationDoc = await getDoc(doc(db, "reservations", reservationId));
    if (!reservationDoc.exists()) {
      return json(
        { success: false, error: "Reservation not found" },
        { status: 404 }
      );
    }

    const reservation = reservationDoc.data();

    // Check if document exists
    if (!reservation.scheduleDocument || !reservation.scheduleDocument.path) {
      return json(
        { success: false, error: "No document found for this reservation" },
        { status: 404 }
      );
    }

    // Get signed URL for document download
    const urlResult = await getSignedUrl(
      reservation.scheduleDocument.path,
      3600 // 1 hour expiry
    );

    if (!urlResult.success) {
      return json(
        {
          success: false,
          error: urlResult.error,
        },
        { status: 500 }
      );
    }

    // Get user information
    let userInfo = null;
    try {
      const userDoc = await getDoc(doc(db, "users", reservation.userId));
      if (userDoc.exists()) {
        const userData = userDoc.data();
        userInfo = {
          firstName: userData.firstName,
          lastName: userData.lastName,
          email: userData.email,
          department: userData.department,
        };
      }
    } catch (error) {
      console.error("Error fetching user info:", error);
    }

    return json({
      success: true,
      downloadUrl: urlResult.url,
      filename: reservation.scheduleDocument.filename,
      size: reservation.scheduleDocument.size,
      uploadedAt: reservation.scheduleDocument.uploadedAt,
      reservation: {
        id: reservationId,
        userId: reservation.userId,
        spaceId: reservation.spaceId,
        startDate: reservation.startDate,
        endDate: reservation.endDate,
        shiftType: reservation.shiftType,
        status: reservation.status,
        createdAt: reservation.createdAt,
      },
      user: userInfo,
    });
  } catch (error) {
    console.error("Admin document access error:", error);
    return json(
      {
        success: false,
        error: "Failed to access document",
      },
      { status: 500 }
    );
  }
}

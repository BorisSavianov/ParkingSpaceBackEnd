// src/routes/api/parking/reservations/[reservationId]/document/+server.js
import { json } from "@sveltejs/kit";
import { db } from "$lib/firebase.js";
import { doc, getDoc } from "firebase/firestore";
import { authenticateRequest } from "$lib/auth-middleware.js";
import { getSignedUrl } from "$lib/storage.js";

export async function GET({ params, request }) {
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
    const { reservationId } = params;

    // Get existing reservation
    const reservationDoc = await getDoc(doc(db, "reservations", reservationId));
    if (!reservationDoc.exists()) {
      return json(
        { success: false, error: "Reservation not found" },
        { status: 404 }
      );
    }

    const reservation = reservationDoc.data();

    // Check if user owns this reservation or is admin
    if (reservation.userId !== userId && authResult.user.role !== "admin") {
      return json({ success: false, error: "Unauthorized" }, { status: 403 });
    }

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
      3600
    ); // 1 hour expiry

    if (!urlResult.success) {
      return json(
        {
          success: false,
          error: urlResult.error,
        },
        { status: 500 }
      );
    }

    return json({
      success: true,
      downloadUrl: urlResult.url,
      filename: reservation.scheduleDocument.filename,
      size: reservation.scheduleDocument.size,
      uploadedAt: reservation.scheduleDocument.uploadedAt,
    });
  } catch (error) {
    console.error("Document download error:", error);
    return json(
      {
        success: false,
        error: "Failed to generate download URL",
      },
      { status: 500 }
    );
  }
}

export async function DELETE({ params, request }) {
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
    const { reservationId } = params;

    // Get existing reservation
    const reservationDoc = await getDoc(doc(db, "reservations", reservationId));
    if (!reservationDoc.exists()) {
      return json(
        { success: false, error: "Reservation not found" },
        { status: 404 }
      );
    }

    const reservation = reservationDoc.data();

    // Check if user owns this reservation
    if (reservation.userId !== userId) {
      return json({ success: false, error: "Unauthorized" }, { status: 403 });
    }

    // Check if document exists
    if (!reservation.scheduleDocument || !reservation.scheduleDocument.path) {
      return json(
        { success: false, error: "No document found for this reservation" },
        { status: 404 }
      );
    }

    // Delete document from storage
    const deleteResult = await deletePDF(reservation.scheduleDocument.path);

    if (!deleteResult.success) {
      return json(
        {
          success: false,
          error: deleteResult.error,
        },
        { status: 500 }
      );
    }

    // Update reservation to remove document reference
    await updateDoc(doc(db, "reservations", reservationId), {
      scheduleDocument: null,
      updatedAt: new Date().toISOString(),
    });

    return json({
      success: true,
      message: "Document deleted successfully",
    });
  } catch (error) {
    console.error("Document deletion error:", error);
    return json(
      {
        success: false,
        error: "Failed to delete document",
      },
      { status: 500 }
    );
  }
}

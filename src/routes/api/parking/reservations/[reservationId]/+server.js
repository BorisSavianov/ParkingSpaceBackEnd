// src/routes/api/parking/reservations/[reservationId]/+server.js - Updated with PDF support
import { json } from "@sveltejs/kit";
import { db } from "$lib/firebase.js";
import { doc, getDoc, updateDoc, deleteDoc } from "firebase/firestore";
import { authenticateRequest } from "$lib/auth-middleware.js";
import { uploadPDF, deletePDF } from "$lib/storage.js";
import {
  checkSpaceAvailability,
  validateReservationPeriod,
} from "$lib/parking.js";

export async function PUT({ params, request }) {
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

    // Check if request contains file upload
    const contentType = request.headers.get("content-type");
    let requestData;
    let uploadedFile = null;

    if (contentType && contentType.includes("multipart/form-data")) {
      // Handle form data with file upload
      const formData = await request.formData();
      requestData = {
        startDate: formData.get("startDate"),
        endDate: formData.get("endDate"),
        shiftType: formData.get("shiftType"),
      };

      const file = formData.get("scheduleDocument");
      if (file && file.size > 0) {
        uploadedFile = file;
      }
    } else {
      // Handle regular JSON request
      requestData = await request.json();
    }

    const { startDate, endDate, shiftType } = requestData;

    // Validate new period if dates are being changed
    if (startDate && endDate) {
      const periodValidation = validateReservationPeriod(startDate, endDate);
      if (!periodValidation.valid) {
        return json(
          {
            success: false,
            error: periodValidation.error,
          },
          { status: 400 }
        );
      }

      // Check if reservation is for more than 2 days and requires document
      const start = new Date(startDate);
      const end = new Date(endDate);
      const daysDiff = Math.ceil((end - start) / (1000 * 60 * 60 * 24));

      if (daysDiff > 2 && !uploadedFile && !reservation.scheduleDocument) {
        return json(
          {
            success: false,
            error:
              "Schedule document (PDF) is required for reservations longer than 2 days",
          },
          { status: 400 }
        );
      }

      // Check availability with current reservation excluded
      const isAvailable = await checkSpaceAvailability(
        reservation.spaceId,
        startDate,
        endDate,
        shiftType || reservation.shiftType,
        reservationId
      );

      if (!isAvailable) {
        return json(
          {
            success: false,
            error:
              "Parking space is not available for the selected period and shift",
          },
          { status: 409 }
        );
      }
    }

    // Handle document upload/update
    let documentData = reservation.scheduleDocument;
    if (uploadedFile) {
      // Delete old document if exists
      if (reservation.scheduleDocument && reservation.scheduleDocument.path) {
        await deletePDF(reservation.scheduleDocument.path);
      }

      // Upload new document
      const uploadResult = await uploadPDF(uploadedFile, userId, reservationId);

      if (!uploadResult.success) {
        return json(
          {
            success: false,
            error: `Failed to upload document: ${uploadResult.error}`,
          },
          { status: 500 }
        );
      }

      documentData = uploadResult.data;
    }

    // Update reservation
    const updateData = {
      ...(startDate && { startDate }),
      ...(endDate && { endDate }),
      ...(shiftType && { shiftType }),
      scheduleDocument: documentData,
      updatedAt: new Date().toISOString(),
    };

    await updateDoc(doc(db, "reservations", reservationId), updateData);

    return json({
      success: true,
      message: "Reservation updated successfully",
    });
  } catch (error) {
    console.error("Reservation update error:", error);
    return json(
      {
        success: false,
        error: "Failed to update reservation",
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

    // Delete associated document if exists
    if (reservation.scheduleDocument && reservation.scheduleDocument.path) {
      await deletePDF(reservation.scheduleDocument.path);
    }

    // Mark as cancelled instead of deleting
    await updateDoc(doc(db, "reservations", reservationId), {
      status: "cancelled",
      cancelledAt: new Date().toISOString(),
    });

    return json({
      success: true,
      message: "Reservation cancelled successfully",
    });
  } catch (error) {
    console.error("Reservation deletion error:", error);
    return json(
      {
        success: false,
        error: "Failed to cancel reservation",
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

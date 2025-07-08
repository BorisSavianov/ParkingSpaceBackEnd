// src/routes/api/admin/reservations/+server.js
import { json } from "@sveltejs/kit";
import { requireAdmin } from "$lib/auth-middleware.js";
import { db } from "$lib/firebase.js";
import {
  collection,
  getDocs,
  doc,
  getDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  limit,
  startAfter,
} from "firebase/firestore";

export async function GET({ request, url }) {
  try {
    // Check admin authentication
    const authResult = await requireAdmin(request);
    if (!authResult.success) {
      return json(
        { success: false, error: authResult.error },
        { status: authResult.status }
      );
    }

    // Parse query parameters
    const status = url.searchParams.get("status") || "all";
    const userId = url.searchParams.get("userId");
    const spaceId = url.searchParams.get("spaceId");
    const pageSize = parseInt(url.searchParams.get("pageSize") || "20");
    const lastDocId = url.searchParams.get("lastDocId");

    // Build query
    const reservationsRef = collection(db, "reservations");
    let q = query(reservationsRef, orderBy("createdAt", "desc"));

    // Apply filters
    if (status !== "all") {
      q = query(q, where("status", "==", status));
    }
    if (userId) {
      q = query(q, where("userId", "==", userId));
    }
    if (spaceId) {
      q = query(q, where("spaceId", "==", spaceId));
    }

    // Apply pagination
    q = query(q, limit(pageSize));
    if (lastDocId) {
      const lastDoc = await getDoc(doc(db, "reservations", lastDocId));
      if (lastDoc.exists()) {
        q = query(q, startAfter(lastDoc));
      }
    }

    const snapshot = await getDocs(q);
    const reservations = [];

    // Get reservation data with user and space information
    for (const docSnap of snapshot.docs) {
      const reservation = { id: docSnap.id, ...docSnap.data() };

      // Get user information
      try {
        const userDoc = await getDoc(doc(db, "users", reservation.userId));
        reservation.user = userDoc.exists() ? userDoc.data() : null;
      } catch (error) {
        console.error("Error fetching user data:", error);
        reservation.user = null;
      }

      // Get space information
      try {
        const spaceDoc = await getDoc(
          doc(db, "parkingSpaces", reservation.spaceId)
        );
        reservation.space = spaceDoc.exists() ? spaceDoc.data() : null;
      } catch (error) {
        console.error("Error fetching space data:", error);
        reservation.space = null;
      }

      reservations.push(reservation);
    }

    return json({
      success: true,
      reservations,
      hasMore: snapshot.docs.length === pageSize,
      lastDocId:
        snapshot.docs.length > 0
          ? snapshot.docs[snapshot.docs.length - 1].id
          : null,
    });
  } catch (error) {
    console.error("Admin reservations fetch error:", error);
    return json(
      {
        success: false,
        error: "Failed to fetch reservations",
      },
      { status: 500 }
    );
  }
}

export async function PUT({ request }) {
  try {
    // Check admin authentication
    const authResult = await requireAdmin(request);
    if (!authResult.success) {
      return json(
        { success: false, error: authResult.error },
        { status: authResult.status }
      );
    }

    const { reservationId, action, data } = await request.json();

    if (!reservationId || !action) {
      return json(
        { success: false, error: "Missing reservationId or action" },
        { status: 400 }
      );
    }

    // Get existing reservation
    const reservationDoc = await getDoc(doc(db, "reservations", reservationId));
    if (!reservationDoc.exists()) {
      return json(
        { success: false, error: "Reservation not found" },
        { status: 404 }
      );
    }

    const reservation = reservationDoc.data();
    let updateData = {
      updatedAt: new Date().toISOString(),
      adminUpdatedBy: authResult.user.uid,
    };

    switch (action) {
      case "approve":
        updateData.status = "active";
        updateData.approvedAt = new Date().toISOString();
        updateData.approvedBy = authResult.user.uid;
        break;

      case "reject":
        updateData.status = "rejected";
        updateData.rejectedAt = new Date().toISOString();
        updateData.rejectedBy = authResult.user.uid;
        updateData.rejectionReason = data?.reason || "No reason provided";
        break;

      case "cancel":
        updateData.status = "cancelled";
        updateData.cancelledAt = new Date().toISOString();
        updateData.cancelledBy = authResult.user.uid;
        updateData.cancellationReason = data?.reason || "Cancelled by admin";
        break;

      case "update":
        if (data?.startDate) updateData.startDate = data.startDate;
        if (data?.endDate) updateData.endDate = data.endDate;
        if (data?.shiftType) updateData.shiftType = data.shiftType;
        if (data?.notes) updateData.adminNotes = data.notes;
        break;

      default:
        return json(
          { success: false, error: "Invalid action" },
          { status: 400 }
        );
    }

    await updateDoc(doc(db, "reservations", reservationId), updateData);

    return json({
      success: true,
      message: `Reservation ${action}ed successfully`,
      reservationId,
    });
  } catch (error) {
    console.error("Admin reservation update error:", error);
    return json(
      {
        success: false,
        error: "Failed to update reservation",
      },
      { status: 500 }
    );
  }
}

export async function DELETE({ request }) {
  try {
    // Check admin authentication
    const authResult = await requireAdmin(request);
    if (!authResult.success) {
      return json(
        { success: false, error: authResult.error },
        { status: authResult.status }
      );
    }

    const { reservationId } = await request.json();

    if (!reservationId) {
      return json(
        { success: false, error: "Missing reservationId" },
        { status: 400 }
      );
    }

    // Get existing reservation
    const reservationDoc = await getDoc(doc(db, "reservations", reservationId));
    if (!reservationDoc.exists()) {
      return json(
        { success: false, error: "Reservation not found" },
        { status: 404 }
      );
    }

    const reservation = reservationDoc.data();

    // Delete associated document if exists
    if (reservation.scheduleDocument && reservation.scheduleDocument.path) {
      try {
        await deletePDF(reservation.scheduleDocument.path);
      } catch (error) {
        console.error("Error deleting document:", error);
      }
    }

    // Delete reservation
    await deleteDoc(doc(db, "reservations", reservationId));

    return json({
      success: true,
      message: "Reservation deleted successfully",
      reservationId,
    });
  } catch (error) {
    console.error("Admin reservation deletion error:", error);
    return json(
      {
        success: false,
        error: "Failed to delete reservation",
      },
      { status: 500 }
    );
  }
}

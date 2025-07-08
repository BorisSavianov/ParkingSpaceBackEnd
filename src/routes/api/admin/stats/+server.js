// src/routes/api/admin/stats/+server.js
import { json } from "@sveltejs/kit";
import { requireAdmin } from "$lib/auth-middleware.js";
import { db } from "$lib/firebase.js";
import { collection, getDocs, query, where, orderBy } from "firebase/firestore";

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

    // Get date range for statistics
    const startDate =
      url.searchParams.get("startDate") ||
      new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    const endDate = url.searchParams.get("endDate") || new Date().toISOString();

    // Get all reservations
    const reservationsRef = collection(db, "reservations");
    const allReservationsQuery = query(reservationsRef);
    const allReservationsSnapshot = await getDocs(allReservationsQuery);

    // Get all users
    const usersRef = collection(db, "users");
    const usersSnapshot = await getDocs(usersRef);

    // Get all parking spaces
    const spacesRef = collection(db, "parkingSpaces");
    const spacesSnapshot = await getDocs(spacesRef);

    // Process reservations data
    const reservations = allReservationsSnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    // Calculate statistics
    const stats = {
      totalReservations: reservations.length,
      totalUsers: usersSnapshot.size,
      totalSpaces: spacesSnapshot.size,
      activeReservations: reservations.filter((r) => r.status === "active")
        .length,
      pendingReservations: reservations.filter((r) => r.status === "pending")
        .length,
      cancelledReservations: reservations.filter(
        (r) => r.status === "cancelled"
      ).length,
      rejectedReservations: reservations.filter((r) => r.status === "rejected")
        .length,
      reservationsWithDocuments: reservations.filter((r) => r.scheduleDocument)
        .length,

      // Period statistics
      periodStats: {
        startDate,
        endDate,
        newReservations: reservations.filter(
          (r) =>
            new Date(r.createdAt) >= new Date(startDate) &&
            new Date(r.createdAt) <= new Date(endDate)
        ).length,
      },

      // By shift type
      byShiftType: {
        morning: reservations.filter((r) => r.shiftType === "8:00-14:00")
          .length,
        afternoon: reservations.filter((r) => r.shiftType === "14:00-21:00")
          .length,
        fullDay: reservations.filter((r) => r.shiftType === "9:30-18:30")
          .length,
      },

      // Most popular spaces
      spaceUtilization: getSpaceUtilization(reservations),

      // User activity
      userActivity: getUserActivity(reservations),

      // Recent activity
      recentActivity: reservations
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
        .slice(0, 10)
        .map((r) => ({
          id: r.id,
          userId: r.userId,
          spaceId: r.spaceId,
          status: r.status,
          createdAt: r.createdAt,
          startDate: r.startDate,
          endDate: r.endDate,
          shiftType: r.shiftType,
        })),
    };

    return json({
      success: true,
      stats,
    });
  } catch (error) {
    console.error("Admin stats fetch error:", error);
    return json(
      {
        success: false,
        error: "Failed to fetch statistics",
      },
      { status: 500 }
    );
  }
}

function getSpaceUtilization(reservations) {
  const spaceCount = {};
  reservations.forEach((r) => {
    if (r.status === "active") {
      spaceCount[r.spaceId] = (spaceCount[r.spaceId] || 0) + 1;
    }
  });

  return Object.entries(spaceCount)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([spaceId, count]) => ({ spaceId, count }));
}

function getUserActivity(reservations) {
  const userCount = {};
  reservations.forEach((r) => {
    userCount[r.userId] = (userCount[r.userId] || 0) + 1;
  });

  return Object.entries(userCount)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([userId, count]) => ({ userId, count }));
}

import { json } from "@sveltejs/kit";
import { checkSpaceAvailability, getSpaceReservations } from "$lib/parking.js";

export async function GET({ url }) {
  try {
    const date =
      url.searchParams.get("date") || new Date().toISOString().split("T")[0];

    // Define the parking spaces (assuming you have spaces 1-20, adjust as needed)
    const TOTAL_SPACES = 20; // Adjust this number based on your parking lot
    const spaces = [];

    // Generate space data for each parking space
    for (let i = 1; i <= TOTAL_SPACES; i++) {
      const spaceId = `space-${i}`;

      // Get reservations for this space on this date
      const reservations = await getSpaceReservations(spaceId, date);

      // Check availability for each shift type
      const isMorningAvailable = await checkSpaceAvailability(
        spaceId,
        date,
        date,
        "8:00-14:00"
      );

      const isAfternoonAvailable = await checkSpaceAvailability(
        spaceId,
        date,
        date,
        "14:00-21:00"
      );

      const isFullDayAvailable = await checkSpaceAvailability(
        spaceId,
        date,
        date,
        "9:30-18:30"
      );

      // Check for pending reservations in each shift
      const morningPending = reservations.some(
        (r) =>
          r.status === "pending" &&
          (r.shiftType === "MORNING" || r.shiftType === "FULL_DAY")
      );

      const afternoonPending = reservations.some(
        (r) =>
          r.status === "pending" &&
          (r.shiftType === "AFTERNOON" || r.shiftType === "FULL_DAY")
      );

      const fullDayPending = reservations.some(
        (r) => r.status === "pending" && r.shiftType === "FULL_DAY"
      );

      // Determine status for each shift: 'available', 'occupied', or 'pending'
      const getShiftStatus = (isAvailable, isPending) => {
        if (isPending) return "pending";
        if (!isAvailable) return "occupied";
        return "available";
      };

      spaces.push({
        id: spaceId,
        spaceNumber: i,
        isAvailable: {
          morning: isMorningAvailable,
          afternoon: isAfternoonAvailable,
          fullDay: isFullDayAvailable,
        },
        status: {
          morning: getShiftStatus(isMorningAvailable, morningPending),
          afternoon: getShiftStatus(isAfternoonAvailable, afternoonPending),
          fullDay: getShiftStatus(isFullDayAvailable, fullDayPending),
        },
        reservations: reservations.map((r) => ({
          ...r,
          shiftType: r.shiftType || "UNKNOWN",
        })),
        // Add any other space properties you need
        type: "standard", // or "disabled", "electric", etc.
        location: `Row ${Math.ceil(i / 10)}, Space ${i}`,
      });
    }

    return json({
      success: true,
      date,
      spaces: spaces.sort((a, b) => a.spaceNumber - b.spaceNumber),
    });
  } catch (error) {
    console.error("Dashboard error:", error);
    return json(
      {
        success: false,
        error: "Failed to fetch dashboard data",
      },
      { status: 500 }
    );
  }
}

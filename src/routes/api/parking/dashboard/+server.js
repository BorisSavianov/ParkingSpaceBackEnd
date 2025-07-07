import { json } from "@sveltejs/kit";
import { checkSpaceAvailability } from "$lib/parking.js";

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

      spaces.push({
        id: spaceId,
        spaceNumber: i,
        isAvailable: {
          morning: isMorningAvailable,
          afternoon: isAfternoonAvailable,
          fullDay: isFullDayAvailable,
        },
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

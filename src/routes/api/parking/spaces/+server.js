import { json } from "@sveltejs/kit";
import { db } from "$lib/firebase.js";
import { collection, getDocs } from "firebase/firestore";

export async function GET() {
  try {
    const spacesRef = collection(db, "parkingSpaces");
    const snapshot = await getDocs(spacesRef);

    const spaces = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    return json({
      success: true,
      spaces: spaces.sort((a, b) => a.spaceNumber - b.spaceNumber),
    });
  } catch (error) {
    return json(
      {
        success: false,
        error: "Failed to fetch parking spaces",
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

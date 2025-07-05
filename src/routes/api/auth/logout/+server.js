import { json } from "@sveltejs/kit";
import { logoutUser } from "$lib/auth.js";

export async function POST() {
  try {
    const result = await logoutUser();

    return json(
      result,
      { status: 200 },
      { headers: { "Access-Control-Allow-Origin": "*" } }
    );
  } catch (error) {
    return json(
      {
        success: false,
        error: "Internal server error",
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

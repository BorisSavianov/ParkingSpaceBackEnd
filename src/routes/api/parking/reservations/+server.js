// src/routes/api/parking/reservations/+server.js - Fixed version
import { json } from "@sveltejs/kit";
import { authenticateRequest } from "$lib/auth-middleware.js";
import {
  validateReservationPeriod,
  checkSpaceAvailability,
  getUserReservations,
} from "$lib/parking.js";
import { uploadPDF, deletePDF } from "$lib/storage.js";
import { db } from "$lib/firebase.js";
import { collection, addDoc, doc, getDoc } from "firebase/firestore";

export async function POST({ request }) {
  try {
    // Authenticate the request
    console.error(5);
    const authResult = await authenticateRequest(request);

    if (!authResult.success) {
      return json(
        { success: false, error: authResult.error },
        { status: authResult.status }
      );
    }

    const { uid: userId } = authResult.user;

    // Check content type and parse accordingly
    const contentType = request.headers.get("content-type") || "";
    let requestData;
    let uploadedFile = null;
    console.error(6);

    try {
      if (contentType.includes("multipart/form-data")) {
        // Handle form data with file upload
        const formData = await request.formData();
        console.error(1);
        console.error(formData);
        requestData = {
          spaceId: formData.get("spaceId"),
          startDate: formData.get("startDate"),
          endDate: formData.get("endDate"),
          shiftType: formData.get("shiftType"),
        };

        const file = formData.get("scheduleDocument");

        if (file && file.size > 0) {
          const fileBuffer = await file.arrayBuffer();
          uploadedFile = fileBuffer;
        }
      } else {
        // Handle regular JSON request
        requestData = await request.json();
      }
    } catch (parseError) {
      console.error("Request parsing error:", parseError);
      return json(
        {
          success: false,
          error: "Invalid request format. Expected JSON or FormData.",
        },
        { status: 400 }
      );
    }

    const { spaceId, startDate, endDate, shiftType } = requestData;

    // Validate required fields
    if (!spaceId || !startDate || !endDate || !shiftType) {
      return json(
        {
          success: false,
          error:
            "Missing required fields: spaceId, startDate, endDate, shiftType",
        },
        { status: 400 }
      );
    }

    // Convert spaceId to string for Firestore document ID
    const spaceDocId = `space-${spaceId}`;

    // Validate shift type
    const validShiftTypes = ["8:00-14:00", "14:00-21:00", "9:30-18:30"];
    if (!validShiftTypes.includes(shiftType)) {
      return json(
        {
          success: false,
          error:
            "Invalid shift type. Must be one of: " + validShiftTypes.join(", "),
        },
        { status: 400 }
      );
    }

    // Validate reservation period
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

    if (daysDiff > 2 && !uploadedFile) {
      return json(
        {
          success: false,
          error:
            "Schedule document (PDF) is required for reservations longer than 2 days",
        },
        { status: 400 }
      );
    }

    // Check space availability
    const isAvailable = await checkSpaceAvailability(
      spaceDocId,
      startDate,
      endDate,
      shiftType
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

    // Upload document if provided
    let documentData = null;
    if (uploadedFile) {
      const uploadResult = await uploadPDF(uploadedFile, userId);

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

    // Create reservation
    const reservationData = {
      userId,
      spaceId: spaceDocId,
      startDate,
      endDate,
      shiftType,
      status: "pending",
      createdAt: new Date().toISOString(),
      scheduleDocument: documentData,
    };

    const docRef = await addDoc(
      collection(db, "reservations"),
      reservationData
    );

    return json(
      {
        success: true,
        message: "Reservation created successfully",
        reservation: {
          id: docRef.id,
          ...reservationData,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Reservation creation error:", error);
    return json(
      {
        success: false,
        error: "Failed to create reservation",
      },
      { status: 500 }
    );
  }
}

export async function GET({ request }) {
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

    try {
      const reservations = await getUserReservations(userId);

      // Add space information to each reservation
      const reservationsWithSpaces = await Promise.all(
        reservations.map(async (reservation) => {
          try {
            const spaceDoc = await getDoc(
              doc(db, "parkingSpaces", reservation.spaceId)
            );
            const spaceData = spaceDoc.exists() ? spaceDoc.data() : null;

            return {
              ...reservation,
              space: spaceData,
            };
          } catch (error) {
            console.error("Error fetching space data:", error);
            return {
              ...reservation,
              space: null,
            };
          }
        })
      );

      return json({
        success: true,
        reservations: reservationsWithSpaces,
      });
    } catch (error) {
      console.error("Error fetching reservations:", error);
      return json(
        {
          success: false,
          error: "Failed to fetch reservations",
        },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error("Authentication error:", error);
    return json(
      {
        success: false,
        error: "Authentication failed",
      },
      { status: 500 }
    );
  }
}

export async function OPTIONS() {
  return new Response(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "https://reserve-parking-space.vercel.app",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS, PUT, DELETE",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
      "Access-Control-Allow-Credentials": "true",
    },
  });
}

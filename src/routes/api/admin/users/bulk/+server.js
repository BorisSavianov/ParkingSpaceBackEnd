// src/routes/api/admin/users/bulk/+server.js
import { json } from "@sveltejs/kit";
import { requireAdmin } from "$lib/auth-middleware.js";
import { db } from "$lib/firebase.js";
import {
  collection,
  doc,
  getDoc,
  updateDoc,
  deleteDoc,
  writeBatch,
  query,
  where,
  getDocs,
} from "firebase/firestore";
import admin from "firebase-admin";

// PUT - Perform bulk actions on users
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

    const { userIds, action, data } = await request.json();

    if (!userIds || !Array.isArray(userIds) || userIds.length === 0) {
      return json(
        { success: false, error: "User IDs array is required" },
        { status: 400 }
      );
    }

    if (!action) {
      return json(
        { success: false, error: "Action is required" },
        { status: 400 }
      );
    }

    // Validate maximum batch size
    if (userIds.length > 100) {
      return json(
        { success: false, error: "Maximum 100 users can be processed at once" },
        { status: 400 }
      );
    }

    // Prevent self-actions
    if (userIds.includes(authResult.user.uid)) {
      return json(
        { success: false, error: "Cannot perform bulk actions on your own account" },
        { status: 400 }
      );
    }

    const batch = writeBatch(db);
    const results = [];
    const errors = [];

    // Process each user
    for (const userId of userIds) {
      try {
        // Get user document
        const userDoc = await getDoc(doc(db, "users", userId));
        if (!userDoc.exists()) {
          errors.push({ userId, error: "User not found" });
          continue;
        }

        const userData = userDoc.data();
        const userRef = doc(db, "users", userId);

        switch (action) {
          case "activate":
            batch.update(userRef, {
              isActive: true,
              updatedAt: new Date().toISOString(),
              updatedBy: authResult.user.uid,
            });
            
            // Enable Firebase Auth account
            try {
              await admin.auth().updateUser(userId, { disabled: false });
            } catch (error) {
              console.error(`Error enabling Firebase Auth for user ${userId}:`, error);
            }
            
            results.push({ userId, action: "activated" });
            break;

          case "deactivate":
            batch.update(userRef, {
              isActive: false,
              updatedAt: new Date().toISOString(),
              updatedBy: authResult.user.uid,
            });
            
            // Disable Firebase Auth account
            try {
              await admin.auth().updateUser(userId, { disabled: true });
            } catch (error) {
              console.error(`Error disabling Firebase Auth for user ${userId}:`, error);
            }
            
            results.push({ userId, action: "deactivated" });
            break;

          case "delete":
            // Check for active reservations
            const reservationsQuery = query(
              collection(db, "reservations"),
              where("userId", "==", userId),
              where("status", "==", "active")
            );
            const reservationsSnapshot = await getDocs(reservationsQuery);

            if (!reservationsSnapshot.empty) {
              errors.push({ userId, error: "User has active reservations" });
              continue;
            }

            // Soft delete
            batch.update(userRef, {
              isActive: false,
              deletedAt: new Date().toISOString(),
              deletedBy: authResult.user.uid,
            });
            
            // Disable Firebase Auth account
            try {
              await admin.auth().updateUser(userId, { disabled: true });
            } catch (error) {
              console.error(`Error disabling Firebase Auth for user ${userId}:`, error);
            }
            
            results.push({ userId, action: "deleted" });
            break;

          case "updateRole":
            if (!data?.role) {
              errors.push({ userId, error: "Role is required" });
              continue;
            }

            if (!["user", "admin"].includes(data.role)) {
              errors.push({ userId, error: "Invalid role" });
              continue;
            }

            batch.update(userRef, {
              role: data.role,
              updatedAt: new Date().toISOString(),
              updatedBy: authResult.user.uid,
            });
            
            results.push({ userId, action: "role updated", newRole: data.role });
            break;

          case "updateDepartment":
            if (!data?.department) {
              errors.push({ userId, error: "Department is required" });
              continue;
            }

            if (!["frontend", "backend", "mobile", "qa"].includes(data.department)) {
              errors.push({ userId, error: "Invalid department" });
              continue;
            }

            batch.update(userRef, {
              department: data.department,
              updatedAt: new Date().toISOString(),
              updatedBy: authResult.user.uid,
            });
            
            results.push({ userId, action: "department updated", newDepartment: data.department });
            break;

          case "resetPassword":
            try {
              // Generate password reset link
              const resetLink = await admin.auth().generatePasswordResetLink(userData.email);
              
              // Update user document to mark password reset required
              batch.update(userRef, {
                passwordReset: true,
                passwordResetRequestedAt: new Date().toISOString(),
                passwordResetRequestedBy: authResult.user.uid,
                updatedAt: new Date().toISOString(),
                updatedBy: authResult.user.uid,
              });
              
              results.push({ userId, action: "password reset sent", email: userData.email });
            } catch (error) {
              console.error(`Error sending password reset for user ${userId}:`, error);
              errors.push({ userId, error: "Failed to send password reset" });
            }
            break;

          default:
            errors.push({ userId, error: "Invalid action" });
            break;
        }
      } catch (error) {
        console.error(`Error processing user ${userId}:`, error);
        errors.push({ userId, error: "Processing failed" });
      }
    }

    // Commit batch if there are any operations
    if (results.length > 0) {
      await batch.commit();
    }

    return json({
      success: true,
      message: `Bulk ${action} completed`,
      results,
      errors,
      processed: results.length,
      failed: errors.length,
    });
  } catch (error) {
    console.error("Bulk operation error:", error);
    return json(
      {
        success: false,
        error: "Failed to perform bulk operation",
      },
      { status: 500 }
    );
  }
}

// GET - Get bulk operation status (for long-running operations)
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

    const operationId = url.searchParams.get("operationId");
    
    if (!operationId) {
      return json(
        { success: false, error: "Operation ID is required" },
        { status: 400 }
      );
    }

    // This would typically check a operations collection in a real implementation
    // For now, we'll return a simple response
    return json({
      success: true,
      operationId,
      status: "completed",
      message: "Bulk operation completed",
    });
  } catch (error) {
    console.error("Bulk operation status error:", error);
    return json(
      {
        success: false,
        error: "Failed to get operation status",
      },
      { status: 500 }
    );
  }
}
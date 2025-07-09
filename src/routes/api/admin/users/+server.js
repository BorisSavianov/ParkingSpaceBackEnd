// src/routes/api/admin/users/+server.js
import { json } from "@sveltejs/kit";
import { requireAdmin } from "$lib/auth-middleware.js";
import { db } from "$lib/firebase.js";
import {
  collection,
  getDocs,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  limit,
  startAfter,
} from "firebase/firestore";
import { auth } from "$lib/firebase.js";
import admin from "firebase-admin";

// GET - Fetch all users with pagination and filtering
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
    const searchTerm = url.searchParams.get("search") || "";
    const filterRole = url.searchParams.get("role") || "all";
    const filterDepartment = url.searchParams.get("department") || "all";
    const sortBy = url.searchParams.get("sortBy") || "createdAt";
    const sortOrder = url.searchParams.get("sortOrder") || "desc";
    const pageSize = parseInt(url.searchParams.get("pageSize") || "10");
    const lastDocId = url.searchParams.get("lastDocId");

    // Build query
    const usersRef = collection(db, "users");
    let q = query(usersRef);

    // Apply filters
    if (filterRole !== "all") {
      q = query(q, where("role", "==", filterRole));
    }
    if (filterDepartment !== "all") {
      q = query(q, where("department", "==", filterDepartment));
    }

    // Apply sorting
    q = query(q, orderBy(sortBy, sortOrder));

    // Apply pagination
    if (pageSize > 0) {
      q = query(q, limit(pageSize));
      if (lastDocId) {
        const lastDoc = await getDoc(doc(db, "users", lastDocId));
        if (lastDoc.exists()) {
          q = query(q, startAfter(lastDoc));
        }
      }
    }

    const snapshot = await getDocs(q);
    let users = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    // Apply search filter (client-side for flexibility)
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      users = users.filter(
        (user) =>
          user.firstName?.toLowerCase().includes(searchLower) ||
          user.lastName?.toLowerCase().includes(searchLower) ||
          user.email?.toLowerCase().includes(searchLower) ||
          user.username?.toLowerCase().includes(searchLower)
      );
    }

    // Get total count for pagination
    const totalQuery = query(usersRef);
    const totalSnapshot = await getDocs(totalQuery);
    const totalUsers = totalSnapshot.size;

    return json({
      success: true,
      users,
      pagination: {
        totalUsers,
        currentPage: lastDocId ? undefined : 1,
        hasMore: snapshot.docs.length === pageSize,
        lastDocId:
          snapshot.docs.length > 0
            ? snapshot.docs[snapshot.docs.length - 1].id
            : null,
      },
    });
  } catch (error) {
    console.error("Admin users fetch error:", error);
    return json(
      {
        success: false,
        error: "Failed to fetch users",
      },
      { status: 500 }
    );
  }
}

// POST - Create new user
export async function POST({ request }) {
  try {
    // Check admin authentication
    const authResult = await requireAdmin(request);
    if (!authResult.success) {
      return json(
        { success: false, error: authResult.error },
        { status: authResult.status }
      );
    }

    const userData = await request.json();
    const { firstName, lastName, email, username, department, role, isActive } = userData;

    // Validate required fields
    const fieldErrors = {};
    if (!firstName?.trim()) fieldErrors.firstName = "First name is required";
    if (!lastName?.trim()) fieldErrors.lastName = "Last name is required";
    if (!email?.trim()) fieldErrors.email = "Email is required";
    if (!username?.trim()) fieldErrors.username = "Username is required";
    if (!department) fieldErrors.department = "Department is required";
    if (!role) fieldErrors.role = "Role is required";

    // Validate email format
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      fieldErrors.email = "Invalid email format";
    }

    // Check for duplicate email
    const emailQuery = query(collection(db, "users"), where("email", "==", email));
    const emailSnapshot = await getDocs(emailQuery);
    if (!emailSnapshot.empty) {
      fieldErrors.email = "Email already exists";
    }

    // Check for duplicate username
    const usernameQuery = query(collection(db, "users"), where("username", "==", username));
    const usernameSnapshot = await getDocs(usernameQuery);
    if (!usernameSnapshot.empty) {
      fieldErrors.username = "Username already exists";
    }

    if (Object.keys(fieldErrors).length > 0) {
      return json(
        {
          success: false,
          error: "Validation failed",
          fieldErrors,
        },
        { status: 400 }
      );
    }

    // Create user with Firebase Admin Auth
    const userRecord = await admin.auth().createUser({
      email,
      password: "TempPassword123!", // Temporary password
      displayName: `${firstName} ${lastName}`,
    });

    // Create user document in Firestore
    const newUser = {
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      email: email.trim(),
      username: username.trim(),
      department,
      role,
      isActive: isActive !== false,
      createdAt: new Date().toISOString(),
      createdBy: authResult.user.uid,
      passwordReset: true, // Flag to indicate password needs reset
    };

    await setDoc(doc(db, "users", userRecord.uid), newUser);

    // Send password reset email
    try {
      await admin.auth().generatePasswordResetLink(email);
    } catch (error) {
      console.error("Error sending password reset email:", error);
    }

    return json({
      success: true,
      message: "User created successfully",
      user: {
        id: userRecord.uid,
        ...newUser,
      },
    });
  } catch (error) {
    console.error("User creation error:", error);
    
    // Handle specific Firebase Auth errors
    if (error.code === "auth/email-already-exists") {
      return json(
        {
          success: false,
          error: "Email already exists",
          fieldErrors: { email: "Email already exists" },
        },
        { status: 400 }
      );
    }

    return json(
      {
        success: false,
        error: "Failed to create user",
      },
      { status: 500 }
    );
  }
}

// PUT - Update user
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

    const { userId, ...updateData } = await request.json();

    if (!userId) {
      return json(
        { success: false, error: "User ID is required" },
        { status: 400 }
      );
    }

    // Get existing user
    const userDoc = await getDoc(doc(db, "users", userId));
    if (!userDoc.exists()) {
      return json(
        { success: false, error: "User not found" },
        { status: 404 }
      );
    }

    const existingUser = userDoc.data();

    // Validate fields if provided
    const fieldErrors = {};
    if (updateData.firstName !== undefined && !updateData.firstName?.trim()) {
      fieldErrors.firstName = "First name is required";
    }
    if (updateData.lastName !== undefined && !updateData.lastName?.trim()) {
      fieldErrors.lastName = "Last name is required";
    }
    if (updateData.email !== undefined) {
      if (!updateData.email?.trim()) {
        fieldErrors.email = "Email is required";
      } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(updateData.email)) {
        fieldErrors.email = "Invalid email format";
      } else if (updateData.email !== existingUser.email) {
        // Check for duplicate email
        const emailQuery = query(collection(db, "users"), where("email", "==", updateData.email));
        const emailSnapshot = await getDocs(emailQuery);
        if (!emailSnapshot.empty) {
          fieldErrors.email = "Email already exists";
        }
      }
    }
    if (updateData.username !== undefined) {
      if (!updateData.username?.trim()) {
        fieldErrors.username = "Username is required";
      } else if (updateData.username !== existingUser.username) {
        // Check for duplicate username
        const usernameQuery = query(collection(db, "users"), where("username", "==", updateData.username));
        const usernameSnapshot = await getDocs(usernameQuery);
        if (!usernameSnapshot.empty) {
          fieldErrors.username = "Username already exists";
        }
      }
    }

    if (Object.keys(fieldErrors).length > 0) {
      return json(
        {
          success: false,
          error: "Validation failed",
          fieldErrors,
        },
        { status: 400 }
      );
    }

    // Prepare update data
    const allowedFields = ["firstName", "lastName", "email", "username", "department", "role", "isActive"];
    const filteredData = {};
    
    allowedFields.forEach(field => {
      if (updateData[field] !== undefined) {
        filteredData[field] = updateData[field];
      }
    });

    // Add update metadata
    filteredData.updatedAt = new Date().toISOString();
    filteredData.updatedBy = authResult.user.uid;

    // Update Firebase Auth if email changed
    if (updateData.email && updateData.email !== existingUser.email) {
      try {
        await admin.auth().updateUser(userId, {
          email: updateData.email,
        });
      } catch (error) {
        console.error("Error updating Firebase Auth:", error);
        return json(
          {
            success: false,
            error: "Failed to update authentication email",
          },
          { status: 500 }
        );
      }
    }

    // Update user document
    await updateDoc(doc(db, "users", userId), filteredData);

    // Get updated user data
    const updatedUserDoc = await getDoc(doc(db, "users", userId));
    const updatedUser = updatedUserDoc.data();

    return json({
      success: true,
      message: "User updated successfully",
      user: {
        id: userId,
        ...updatedUser,
      },
    });
  } catch (error) {
    console.error("User update error:", error);
    return json(
      {
        success: false,
        error: "Failed to update user",
      },
      { status: 500 }
    );
  }
}

// DELETE - Delete user
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

    const { userId } = await request.json();

    if (!userId) {
      return json(
        { success: false, error: "User ID is required" },
        { status: 400 }
      );
    }

    // Check if user exists
    const userDoc = await getDoc(doc(db, "users", userId));
    if (!userDoc.exists()) {
      return json(
        { success: false, error: "User not found" },
        { status: 404 }
      );
    }

    // Prevent self-deletion
    if (userId === authResult.user.uid) {
      return json(
        { success: false, error: "Cannot delete your own account" },
        { status: 400 }
      );
    }

    // Check for active reservations
    const reservationsQuery = query(
      collection(db, "reservations"),
      where("userId", "==", userId),
      where("status", "==", "active")
    );
    const reservationsSnapshot = await getDocs(reservationsQuery);

    if (!reservationsSnapshot.empty) {
      return json(
        {
          success: false,
          error: "Cannot delete user with active reservations",
        },
        { status: 400 }
      );
    }

    // Soft delete - mark as inactive instead of hard delete
    await updateDoc(doc(db, "users", userId), {
      isActive: false,
      deletedAt: new Date().toISOString(),
      deletedBy: authResult.user.uid,
    });

    // Optionally disable Firebase Auth account
    try {
      await admin.auth().updateUser(userId, {
        disabled: true,
      });
    } catch (error) {
      console.error("Error disabling Firebase Auth:", error);
    }

    return json({
      success: true,
      message: "User deleted successfully",
      userId,
    });
  } catch (error) {
    console.error("User deletion error:", error);
    return json(
      {
        success: false,
        error: "Failed to delete user",
      },
      { status: 500 }
    );
  }
}
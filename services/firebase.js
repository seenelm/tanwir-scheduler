import admin from "firebase-admin";
import dotenv from "dotenv";
import { logger } from "../utils/logger.js";

dotenv.config();

let firebaseInitialized = false;

function initializeFirebase() {
  if (firebaseInitialized) return;

  try {
    const serviceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT_BASE64
      ? Buffer.from(
          process.env.FIREBASE_SERVICE_ACCOUNT_BASE64,
          "base64"
        ).toString()
      : process.env.FIREBASE_SERVICE_ACCOUNT_JSON;

    if (!serviceAccountJson) throw new Error("Missing Firebase credentials");

    const serviceAccount = JSON.parse(serviceAccountJson);

    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
    });

    firebaseInitialized = true;
    logger.info("Firebase initialized");
  } catch (error) {
    logger.error("Failed to initialize Firebase:", error);
    throw error;
  }
}

/**
 * Save processed Squarespace orders to Firestore
 * @param {Array} orders - Already formatted orders
 */
export async function saveToFirestore(orders) {
  try {
    if (!orders || orders.length === 0) {
      logger.info("No orders to save");
      return;
    }

    initializeFirebase();
    const db = admin.firestore();
    const collection = process.env.FIRESTORE_COLLECTION || "authorizedUsers";

    // Group orders by email to handle multiple orders from the same user
    const ordersByEmail = {};

    for (const order of orders) {
      try {
        if (!order.orderId) {
          logger.warn("Order missing orderId, skipping", order);
          continue;
        }

        const email = order.studentInfo?.email || order.customerEmail;

        if (!email) {
          logger.warn(
            `Order ${order.orderId} missing email, saving as individual order`
          );
          ordersByEmail[`order_${order.orderId}`] = [order];
          continue;
        }

        if (!ordersByEmail[email]) {
          ordersByEmail[email] = [];
        }

        ordersByEmail[email].push(order);
      } catch (orderError) {
        logger.error(`Error processing order for grouping:`, orderError);
      }
    }

    let successCount = 0;
    const batch = db.batch();

    // Process each user's orders
    for (const email in ordersByEmail) {
      try {
        const userOrders = ordersByEmail[email];
        if (!userOrders || userOrders.length === 0) continue;

        // Check if user already exists
        const userQuery = await db
          .collection(collection)
          .where("studentInfo.email", "==", email)
          .limit(1)
          .get();

        let existingUser = null;
        let docRef = null;

        if (!userQuery.empty) {
          // User exists, get their document
          existingUser = userQuery.docs[0].data();
          docRef = userQuery.docs[0].ref;
          logger.info(`Found existing user with email ${email}`);
        } else {
          // New user, create a document with their email as ID (or use first order ID if email has special chars)
          const safeEmail = email.replace(/[/\\. #$]/g, "_");
          docRef = db.collection(collection).doc(safeEmail);
          logger.info(`Creating new user with email ${email}`);
        }

        // Prepare the user data with courses array
        const latestOrder = userOrders[0]; // Use the first order for basic user info

        // Extract courses from all orders
        const courses = userOrders.map((order) => ({
          orderId: order.orderId,
          orderNumber: order.orderNumber,
          createdOn: order.createdOn,
          course: order.course,
          plan: order.plan,
          section: order.section,
          imageUrl: order.imageUrl || "",
          processedAt: order.processedAt,
        }));

        // If user exists, merge their existing courses with new ones
        if (existingUser && existingUser.courses) {
          // Create a map of existing courses by orderId for quick lookup
          const existingCourseMap = {};
          existingUser.courses.forEach((course) => {
            existingCourseMap[course.orderId] = true;
          });

          // Only add courses that don't already exist
          courses.forEach((course) => {
            if (!existingCourseMap[course.orderId]) {
              existingUser.courses.push(course);
            }
          });

          // Update the user document with merged courses
          batch.set(
            docRef,
            {
              ...existingUser,
              lastSynced: admin.firestore.FieldValue.serverTimestamp(),
            },
            { merge: true }
          );
        } else {
          // Create new user document with courses
          batch.set(docRef, {
            studentInfo: latestOrder.studentInfo,
            customerEmail: latestOrder.customerEmail,
            courses: courses,
            syncedToFirebase: true,
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            lastSynced: admin.firestore.FieldValue.serverTimestamp(),
          });
        }

        successCount++;
      } catch (userError) {
        logger.error(`Error processing user with email ${email}:`, userError);
      }
    }

    if (successCount > 0) {
      await batch.commit();
      logger.info(`Saved/updated ${successCount} user records in Firestore`);
    } else {
      logger.warn("No user records were added to the batch for saving");
    }
  } catch (error) {
    logger.error("Error saving to Firestore:", error);
    throw new Error(`Failed to save orders to Firestore: ${error.message}`);
  }
}

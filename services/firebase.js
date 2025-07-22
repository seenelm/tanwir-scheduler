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
 * @param {Array} studentRecords - Already formatted and grouped student records
 */
export async function saveToFirestore(studentRecords) {
  try {
    if (!studentRecords || studentRecords.length === 0) {
      logger.info("No student records to save");
      return;
    }

    initializeFirebase();
    const db = admin.firestore();
    const collection = process.env.FIRESTORE_COLLECTION || "authorizedUsers";

    let successCount = 0;
    const batch = db.batch();

    // Process each student record
    for (const student of studentRecords) {
      try {
        const email = student.customerEmail;
        
        if (!email) {
          logger.warn("Student record missing email, skipping", student);
          continue;
        }

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
          // New user, create a document with their email as ID (or use email if it has special chars)
          //const safeEmail = email.replace(/[/\\. #$]/g, "_");
          docRef = db.collection(collection).doc();
          logger.info(`Creating new user with email ${email}`);
        }

        // If user exists, merge their existing courses with new ones
        if (existingUser && existingUser.courses) {
          // Create a map of existing courses by orderId for quick lookup
          const existingCourseMap = {};
          existingUser.courses.forEach((course) => {
            existingCourseMap[course.orderId] = true;
          });

          // Only add courses that don't already exist
          student.courses.forEach((course) => {
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
            studentInfo: student.studentInfo,
            customerEmail: student.customerEmail,
            courses: student.courses,
            syncedToFirebase: true,
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            lastSynced: admin.firestore.FieldValue.serverTimestamp(),
          });
        }

        successCount++;
      } catch (userError) {
        logger.error(`Error processing user with email ${student.customerEmail}:`, userError);
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
    throw new Error(`Failed to save student records to Firestore: ${error.message}`);
  }
}

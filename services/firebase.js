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
    
    // First, group all records by email to ensure we process each student only once
    const studentsByEmail = {};
    
    // Group records by email
    for (const student of studentRecords) {
      const email = student.customerEmail || (student.studentInfo && student.studentInfo.email);
      
      if (!email) {
        logger.warn("Student record missing email, skipping", student);
        continue;
      }
      
      // Validate email format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        logger.warn(`Invalid email format: "${email}", skipping record`, student);
        continue;
      }
      
      if (!studentsByEmail[email]) {
        studentsByEmail[email] = [];
      }
      studentsByEmail[email].push(student);
    }
    
    // Now process each unique email
    const batch = db.batch();
    
    for (const email of Object.keys(studentsByEmail)) {
      try {
        // Check if user already exists - query by email in studentInfo or customerEmail
        let userQuery = await db
          .collection(collection)
          .where("studentInfo.email", "==", email)
          .limit(1)
          .get();

        // If no results, try with customerEmail (for backward compatibility)
        if (userQuery.empty) {
          userQuery = await db
            .collection(collection)
            .where("customerEmail", "==", email)
            .limit(1)
            .get();
        }

        let existingUser = null;
        let docRef = null;

        if (!userQuery.empty) {
          // User exists, get their document
          existingUser = userQuery.docs[0].data();
          docRef = userQuery.docs[0].ref;
          logger.info(`Found existing user with email ${email}`);
        } else {
          // New user, create a document with UUID
          docRef = db.collection(collection).doc();
          logger.info(`Creating new user with email ${email}`);
        }
        
        // Get all courses for this email
        const coursesForUser = studentsByEmail[email];
        
        if (existingUser && existingUser.courses) {
          // Create a map of existing courses by courseId for quick lookup
          const existingCourseMap = {};
          existingUser.courses.forEach((course) => {
            existingCourseMap[course.courseId || course.orderId] = true;
          });
          
          // Add each new course that doesn't already exist
          const newCourses = [];
          for (const course of coursesForUser) {
            const courseId = course.courseId || course.orderId;
            if (!existingCourseMap[courseId]) {
              // Extract course data without studentInfo to avoid duplication
              const { studentInfo, ...courseOnly } = course;
              newCourses.push(courseOnly);
              logger.info(`Adding course ${courseId} to existing user ${email}`);
            } else {
              logger.info(`Course ${courseId} already exists for user ${email}, skipping`);
            }
          }
          
          if (newCourses.length > 0) {
            // Update the user document with merged courses
            batch.set(
              docRef,
              {
                courses: admin.firestore.FieldValue.arrayUnion(...newCourses),
                lastSynced: admin.firestore.FieldValue.serverTimestamp(),
              },
              { merge: true }
            );
            
            successCount += newCourses.length;
          } else {
            logger.info(`No new courses to add for user ${email}`);
          }
        } else {
          // New user, add all courses
          const firstCourse = coursesForUser[0];
          const { studentInfo } = firstCourse;
          
          // Extract course data without studentInfo to avoid duplication
          const courses = coursesForUser.map(course => {
            const { studentInfo: _, ...courseOnly } = course;
            return courseOnly;
          });
          
          try {
            logger.info(`Preparing to save new user with email ${email} and ${courses.length} courses`);
            
            batch.set(docRef, {
              studentInfo,
              customerEmail: email, // Ensure customerEmail is set at the top level for backward compatibility
              courses,
              createdAt: admin.firestore.FieldValue.serverTimestamp(),
              lastSynced: admin.firestore.FieldValue.serverTimestamp(),
            });
            
            successCount += courses.length;
            logger.info(`Created new user ${email} with ${courses.length} courses`);
          } catch (saveError) {
            logger.error(`Error saving new user with email ${email}:`, saveError);
          }
        }
      } catch (userError) {
        logger.error(`Error processing user with email ${email}:`, userError);
      }
    }

    // Commit all changes
    try {
      await batch.commit();
      logger.info(`Saved/updated ${successCount} user records in Firestore`);
    } catch (commitError) {
      logger.error("Error committing batch to Firestore:", commitError);
      throw commitError;
    }

    return successCount;
  } catch (error) {
    logger.error("Error saving to Firestore:", error);
    throw error;
  }
}

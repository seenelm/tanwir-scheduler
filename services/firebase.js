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

    const batch = db.batch();
    let successCount = 0;

    for (const order of orders) {
      try {
        if (!order.orderId) {
          logger.warn("Order missing orderId, skipping", order);
          continue;
        }

        const ref = db.collection(collection).doc(order.orderId);
        batch.set(ref, {
          ...order,
          syncedToFirebase: true,
          lastSynced: admin.firestore.FieldValue.serverTimestamp(),
        });
        successCount++;
      } catch (orderError) {
        logger.error(`Error processing order for Firestore:`, orderError);
      }
    }

    if (successCount > 0) {
      await batch.commit();
      logger.info(`Saved ${successCount} orders to Firestore`);
    } else {
      logger.warn("No orders were added to the batch for saving");
    }
  } catch (error) {
    logger.error("Error saving to Firestore:", error);
    throw new Error(`Failed to save orders to Firestore: ${error.message}`);
  }
}

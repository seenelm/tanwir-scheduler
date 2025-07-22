import axios from "axios";
import dotenv from "dotenv";
import { processOrderData } from "./services/dataProcessor.js";
import { saveToFirestore } from "./services/firebase.js";
import { logger } from "./utils/logger.js";

// Load environment variables
dotenv.config();

// Squarespace API configuration
const SQUARESPACE_API_KEY = process.env.SQUARESPACE_API_KEY || "key-7071-45a8-b6f7-1e24a8ac1290";
const SQUARESPACE_API_URL = process.env.SQUARESPACE_API_URL || "https://api.squarespace.com/1.0";

async function fetchOrdersWithDateRange(modifiedAfter, modifiedBefore) {
  try {
    logger.info(`Fetching orders from Squarespace between ${modifiedAfter} and ${modifiedBefore}`);
    
    const response = await axios.get(`${SQUARESPACE_API_URL}/commerce/orders`, {
      headers: {
        Authorization: `Bearer ${SQUARESPACE_API_KEY}`,
        "Content-Type": "application/json",
      },
      params: {
        modifiedAfter,
        modifiedBefore,
      },
    });
    
    // Extract orders from the response
    const orders = response.data?.result || [];
    logger.info(`Fetched ${orders.length} orders from Squarespace`);
    
    // Process the orders
    const processedOrders = await processOrderData(orders);
    logger.info(`Processed ${processedOrders.length} student records with a total of ${processedOrders.reduce((total, student) => total + student.courses.length, 0)} courses`);
    
    // Optionally save to Firestore
    const saveToDb = process.argv.includes('--save');
    if (saveToDb && processedOrders.length > 0) {
      await saveToFirestore(processedOrders);
      logger.info("Successfully saved orders to Firestore");
    } else if (saveToDb) {
      logger.info("No orders to save to Firestore");
    } else {
      logger.info("Skipping save to Firestore (use --save flag to enable)");
      console.log(JSON.stringify(processedOrders, null, 2));
    }
    
    return processedOrders;
  } catch (error) {
    logger.error("Error fetching or processing orders:", error);
    throw new Error(`Failed to fetch or process orders: ${error.message}`);
  }
}

// Run the script with the date range from the curl command
const modifiedAfter = "2025-07-18T00:00:00Z";
const modifiedBefore = "2025-07-18T23:59:59Z";

fetchOrdersWithDateRange(modifiedAfter, modifiedBefore)
  .then(() => {
    logger.info("Manual run completed successfully");
    process.exit(0);
  })
  .catch((error) => {
    logger.error("Manual run failed:", error);
    process.exit(1);
  });

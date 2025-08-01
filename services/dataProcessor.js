import { logger } from "../utils/logger.js";
import { mapCourseToModel } from "../models/courseMapper.js";

/**
 * Process and format Squarespace order data for Firebase storage
 * @param {Array} orders - Raw orders from Squarespace API
 * @returns {Array} - Processed course objects ready for Firebase
 */
export async function processOrderData(orders) {
  try {
    logger.info("Processing order data");

    if (!orders || orders.length === 0) {
      logger.info("No orders to process");
      return [];
    }

    const processedCourses = [];

    orders.forEach((order) => {
      try {
        // Check if the order has service line items
        const serviceItems = order.lineItems?.filter(
          item => item.lineItemType === "SERVICE"
        );

        if (!serviceItems || serviceItems.length === 0) {
          logger.warn(`Order ${order.id} has no service items, skipping`);
          return;
        }

        // Map the order to course models (may return multiple students for Associates Program)
        const mapped = mapCourseToModel(order);
        
        // Handle both array returns (multiple students) and single object returns
        if (Array.isArray(mapped)) {
          mapped.forEach(studentCourse => {
            processedCourses.push(studentCourse);
          });
        } else if (mapped) {
          processedCourses.push(mapped);
        }
      } catch (err) {
        logger.error(`Error processing order ${order.id}:`, err);
      }
    });

    logger.info(
      `Successfully processed ${processedCourses.length} valid service orders`
    );

    return processedCourses;
  } catch (error) {
    logger.error("Error processing order data:", error);
    throw new Error(`Failed to process order data: ${error.message}`);
  }
}

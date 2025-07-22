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
        const item = order.lineItems?.[0];

        if (!item) {
          logger.warn(`Order ${order.id} has no line items, skipping`);
          return;
        }

        if (item.lineItemType !== "SERVICE") {
          logger.info(`Order ${order.id} is not a service, skipping`);
          return;
        }

        const mapped = mapCourseToModel(order);
        processedCourses.push(mapped);
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

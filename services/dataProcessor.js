import { logger } from "../utils/logger.js";

/**
 * Process and format Squarespace order data for Firebase storage
 * @param {Array} orders - Raw orders from Squarespace API
 * @returns {Array} - Processed orders ready for Firebase
 */
export async function processOrderData(orders) {
  try {
    logger.info("Processing order data");

    if (!orders || orders.length === 0) {
      logger.info("No orders to process");
      return [];
    }

    const processedOrders = orders
      .map((order) => {
        try {
          const item = order.lineItems[0]; // Assuming one item per order

          if (!item) {
            logger.warn(`Order ${order.id} has no line items, skipping`);
            return null;
          }

          const custom = item.customizations?.map((c) => c.value) || [];

          const course = item.productName || "Unknown Course";
          const plan =
            item.variantOptions?.find((v) => v.optionName === "Plan")?.value ||
            "";
          const section =
            item.variantOptions?.find((v) => v.optionName === "Section")
              ?.value || "";

          return {
            orderId: order.id,
            orderNumber: order.orderNumber,
            createdOn: order.createdOn,
            customerEmail: order.customerEmail,
            course,
            plan,
            section,
            studentInfo: {
              firstName: custom[0] || "",
              lastName: custom[1] || "",
              phone: custom[2] || "",
              email: custom[3] || order.customerEmail,
              gender: custom[4] || "",
              age: custom[5] || "",
              studentType: custom[6] || "",
            },
            imageUrl: item.imageUrl || "",
            processedAt: new Date().toISOString(),
            syncedToFirebase: false,
          };
        } catch (itemError) {
          logger.error(`Error processing order ${order.id}:`, itemError);
          return null;
        }
      })
      .filter((order) => order !== null); // Filter out any orders that failed to process

    logger.info(`Successfully processed ${processedOrders.length} orders`);
    return processedOrders;
  } catch (error) {
    logger.error("Error processing order data:", error);
    throw new Error(`Failed to process order data: ${error.message}`);
  }
}

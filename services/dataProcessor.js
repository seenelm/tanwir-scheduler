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

    // Group orders by customer email
    const ordersByEmail = {};
    
    orders.forEach((order) => {
      try {
        const item = order.lineItems[0]; // Get first line item
        
        if (!item) {
          logger.warn(`Order ${order.id} has no line items, skipping`);
          return;
        }
        
        // Skip if the line item type is not SERVICE
        if (item.lineItemType !== "SERVICE") {
          logger.info(`Order ${order.id} is not a service, skipping`);
          return;
        }
        
        const email = order.customerEmail;
        
        if (!ordersByEmail[email]) {
          ordersByEmail[email] = {
            customerEmail: email,
            studentInfo: {},
            courses: [],
            processedAt: new Date().toISOString(),
            syncedToFirebase: false
          };
        }
        
        // Extract student info from the first order we process for this email
        if (Object.keys(ordersByEmail[email].studentInfo).length === 0) {
          // Find the name customization
          const nameValue = item.customizations?.find(c => c.label === "Name")?.value || "";
          // Split name into first and last if possible
          const nameParts = nameValue.split(" ");
          const firstName = nameParts[0] || "";
          const lastName = nameParts.length > 1 ? nameParts.slice(1).join(" ") : "";
          
          // Find other customizations by label
          const phone = item.customizations?.find(c => c.label === "Phone")?.value || "";
          const gender = item.customizations?.find(c => c.label === "Gender")?.value || "";
          const age = item.customizations?.find(c => c.label === "Age")?.value || "";
          const studentType = item.customizations?.find(c => c.label === "I am a")?.value || "";
          
          ordersByEmail[email].studentInfo = {
            firstName,
            lastName,
            phone,
            email: email,
            gender,
            age,
            studentType,
          };
        }
        
        const course = item.productName || "Unknown Course";
        const plan =
          item.variantOptions?.find((v) => v.optionName === "Plan")?.value ||
          "";
        const section =
          item.variantOptions?.find((v) => v.optionName === "Section")
            ?.value || "";
        
        // Add this course to the student's courses
        ordersByEmail[email].courses.push({
          orderId: order.id,
          orderNumber: order.orderNumber,
          createdOn: order.createdOn,
          course,
          plan,
          section,
          imageUrl: item.imageUrl || "",
        });
      } catch (itemError) {
        logger.error(`Error processing order ${order.id}:`, itemError);
      }
    });
    
    // Convert the grouped orders into our final format
    const processedOrders = Object.values(ordersByEmail).filter(student => 
      student.courses && student.courses.length > 0
    );

    logger.info(`Successfully processed ${processedOrders.length} student records with a total of ${processedOrders.reduce((total, student) => total + student.courses.length, 0)} courses`);
    return processedOrders;
  } catch (error) {
    logger.error("Error processing order data:", error);
    throw new Error(`Failed to process order data: ${error.message}`);
  }
}

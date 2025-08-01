import axios from "axios";
import dotenv from "dotenv";
import { logger } from "../utils/logger.js";

dotenv.config();

// Squarespace API configuration
const SQUARESPACE_API_KEY = process.env.SQUARESPACE_API_KEY;
const SQUARESPACE_API_URL =
  process.env.SQUARESPACE_API_URL || "https://api.squarespace.com/1.0";

// Function to fetch student orders from Squarespace
async function fetchAllOrders(modifiedAfter, modifiedBefore) {
  let allOrders = [];
  let cursor = null;

  do {
    const response = await axios.get(`${SQUARESPACE_API_URL}/commerce/orders`, {
      headers: {
        Authorization: `Bearer ${SQUARESPACE_API_KEY}`,
        "Content-Type": "application/json",
      },
      params: {
        modifiedAfter,
        modifiedBefore,
        cursor,
      },
    });

    const result = response.data?.result || [];
    allOrders = [...allOrders, ...result];
    cursor = response.data?.pagination?.nextPageCursor || null;
  } while (cursor);

  return allOrders;
}

export async function fetchSquarespaceOrders() {
  try {
    logger.info("Fetching orders from Squarespace");

    const now = new Date();
    const twentyMinutesAgo = new Date(now.getTime() - 20 * 60 * 1000);
    const modifiedAfter = twentyMinutesAgo.toISOString();
    const modifiedBefore = now.toISOString();

    const allOrders = await fetchAllOrders(modifiedAfter, modifiedBefore);

    const studentOrders = allOrders.filter((order) =>
      order.lineItems.some((item) => item.lineItemType === "SERVICE")
    );

    logger.info(
      `Found ${studentOrders.length} student orders out of ${allOrders.length} total orders`
    );
    return studentOrders;
  } catch (error) {
    logger.error("Error fetching orders from Squarespace:", error);
    if (error.response) {
      logger.error("API response error:", {
        status: error.response.status,
        data: error.response.data,
      });
    }
    throw new Error(
      `Failed to fetch orders from Squarespace: ${error.message}`
    );
  }
}

// Function to fetch a specific order by ID (useful for testing or manual lookups)
export async function fetchOrderById(orderId) {
  try {
    logger.info(`Fetching order details for order ID: ${orderId}`);

    const response = await axios.get(
      `${SQUARESPACE_API_URL}/commerce/orders/${orderId}`,
      {
        headers: {
          Authorization: `Bearer ${SQUARESPACE_API_KEY}`,
          "Content-Type": "application/json",
        },
      }
    );

    return response.data;
  } catch (error) {
    logger.error(`Error fetching order ${orderId}:`, error);
    throw new Error(`Failed to fetch order ${orderId}: ${error.message}`);
  }
}

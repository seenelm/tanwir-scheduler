import { runScheduledTask } from "../index.js";
import { logger } from "../utils/logger.js";

// Run the scheduled task and exit when done
async function main() {
  try {
    logger.info("Starting manual sync");
    await runScheduledTask();
    logger.info("Manual sync completed successfully");
    
    // Wait for any pending promises to complete (like email API calls)
    logger.info("Waiting for all pending operations to complete...");
    setTimeout(() => {
      logger.info("All operations completed, exiting process");
      process.exit(0);
    }, 5000); // Wait 5 seconds for any pending operations
  } catch (error) {
    logger.error("Manual sync failed:", {
      message: error.message || "Unknown error",
      stack: error.stack,
      name: error.name,
      code: error.code,
    });
    process.exit(1);
  }
}

main();

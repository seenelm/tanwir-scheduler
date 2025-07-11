import { runScheduledTask } from "../index.js";
import { logger } from "../utils/logger.js";

// Run the scheduled task and exit when done
async function main() {
  try {
    logger.info("Starting manual sync");
    await runScheduledTask();
    logger.info("Manual sync completed successfully");
    process.exit(0);
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

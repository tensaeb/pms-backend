import cron from "node-cron";
import { leaseService } from "../services/lease.services";
import logger from "../utils/logger";

// Schedule the task to run every day at midnight
cron.schedule("0 0 * * *", async () => {
  try {
    logger.info("Running daily lease and tenant status update...");
    await leaseService.updateLeaseAndTenantStatuses();
    logger.info("Daily lease and tenant status update completed.");
  } catch (error) {
    logger.error(
      "Error occurred during daily lease and tenant status update:",
      error
    );
  }
});

logger.info("Lease and tenant status update job scheduled.");

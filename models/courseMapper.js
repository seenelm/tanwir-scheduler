/**
 * Course Mapper Utility
 * Maps course data from Squarespace orders to the appropriate course model
 */

import {
  createAssociatesProgramModel,
  isAssociatesProgram,
} from "./AssociatesProgram.js";

import {
  createPropheticGuidanceModel,
  isPropheticGuidance,
} from "./PropheticGuidance.js";

import { logger } from "../utils/logger.js";

/**
 * Maps a single Squarespace order to its appropriate course model
 * @param {Object} order - Full Squarespace order object
 * @returns {Object} - Mapped course object
 */
export function mapCourseToModel(order) {
  const item = order?.lineItems?.[0];
  const courseName = item?.productName;

  if (!courseName) {
    logger.warn("Invalid course data provided to mapper");
    return order;
  }

  try {
    if (isAssociatesProgram(courseName)) {
      logger.info(`Mapping course "${courseName}" to Associates Program model`);
      return createAssociatesProgramModel(order);
    }

    if (isPropheticGuidance(courseName)) {
      logger.info(`Mapping course "${courseName}" to Prophetic Guidance model`);
      return createPropheticGuidanceModel(order); // password comes from order
    }

    logger.info(
      `Course "${courseName}" does not match any specific model, using generic format`
    );
    return {
      ...order,
      courseType: "Generic",
      metadata: {
        lastUpdated: new Date().toISOString(),
      },
    };
  } catch (error) {
    logger.error(`Error mapping course "${courseName}" to model:`, error);
    return order;
  }
}

/**
 * Maps all courses in a student record to their appropriate models
 * @param {Object} studentRecord - Student record containing a `courses` array of orders
 * @returns {Object} - Student record with mapped courses
 */
export function mapStudentCourses(studentRecord) {
  if (!studentRecord || !Array.isArray(studentRecord.courses)) {
    return studentRecord;
  }

  try {
    const mappedCourses = studentRecord.courses.map(mapCourseToModel);

    return {
      ...studentRecord,
      courses: mappedCourses,
    };
  } catch (error) {
    logger.error(
      `Error mapping courses for student ${studentRecord.customerEmail}:`,
      error
    );
    return studentRecord;
  }
}

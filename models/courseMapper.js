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
 * @returns {Object|Array} - Mapped course object(s) - can be an array for multiple students
 */
export function mapCourseToModel(order) {
  if (!order?.lineItems?.length) {
    logger.warn("Invalid order data provided to mapper");
    return null;
  }

  const firstItem = order.lineItems[0];
  const courseName = firstItem?.productName;

  if (!courseName) {
    logger.warn("Invalid course data provided to mapper");
    return null;
  }

  try {
    if (isAssociatesProgram(courseName)) {
      logger.info(`Mapping course "${courseName}" to Associates Program model`);
      return createAssociatesProgramModel(order); // This now returns an array of student models
    }

    if (isPropheticGuidance(courseName)) {
      logger.info(`Mapping course "${courseName}" to Prophetic Guidance model`);
      return createPropheticGuidanceModel(order);
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
    logger.error(`Error mapping course "${courseName}":`, error);
    return null;
  }
}

/**
 * Maps all courses in a student record to their appropriate models
 * @param {Object} studentRecord - Student record containing a `courses` array of orders
 * @returns {Object} - Student record with mapped courses
 */
export function mapStudentCourses(studentRecord) {
  if (!studentRecord || !studentRecord.courses) {
    return studentRecord;
  }

  const mappedCourses = studentRecord.courses.map((course) => {
    try {
      const mapped = mapCourseToModel({ ...course, lineItems: [course] });
      return mapped || course;
    } catch (error) {
      logger.error(`Error mapping student course:`, error);
      return course;
    }
  });

  return {
    ...studentRecord,
    courses: mappedCourses,
  };
}

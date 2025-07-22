/**
 * Prophetic Guidance Course Model
 * Converts Squarespace order data into a structured Prophetic Guidance course object.
 */

/**
 * Checks if a course is an Associates Program course
 * @param {string} courseName - Name of the course from Squarespace
 * @returns {boolean} - True if the course is an Associates Program course
 */
export function isPropheticGuidance(courseName) {
  if (!courseName) return false;

  const name = courseName.toLowerCase();
  return (
    name.includes("prophetic") ||
    name.includes("guidance") ||
    name.includes("prophetic guidance")
  );
}

/**
 * Extracts module name from the course section
 * @param {string} section - Section name (e.g., "Module 1")
 * @returns {string} - Extracted module name
 */
function extractModule(section) {
  return section.toLowerCase().includes("module") ? section.trim() : "General";
}

/**
 * Retrieves a variant option value by name
 * @param {Array} options - Array of variant options from the line item
 * @param {string} key - Option name to retrieve (e.g., "Plan", "Section")
 * @returns {string} - Option value
 */
function getVariantOption(options, key) {
  const option = options.find(
    (opt) => opt.optionName.toLowerCase() === key.toLowerCase()
  );
  return option.value;
}

/**
 * Builds the Prophetic Guidance course model from a Squarespace order
 * @param {Object} order - Full Squarespace order object
 * @param {string} password - The password to associate with the student
 * @returns {Object} - Formatted course model for Prophetic Guidance
 */
export function createPropheticGuidanceModel(order, password) {
  const item = order.lineItems[0];

  const [firstName, lastName, phone, email, gender, age, studentType] =
    item.customizations.map((c) => c.value);

  const plan = getVariantOption(item.variantOptions, "Plan");
  const section = getVariantOption(item.variantOptions, "Section");

  return {
    courseId: order.id,
    orderNumber: order.orderNumber,
    createdOn: order.createdOn,
    courseName: item.productName,
    courseType: "PropheticGuidance",

    studentInfo: {
      firstName,
      lastName,
      email,
      phone,
      gender,
      age,
      studentType,
      password,
    },

    guidanceDetails: {
      module: extractModule(section),
      plan,
      imageUrl: item.imageUrl,
      status: "enrolled",
    },

    metadata: {
      lastUpdated: new Date().toISOString(),
    },
  };
}

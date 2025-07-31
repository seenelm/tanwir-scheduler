/**
 * Associates Program Course Model
 * Maps Squarespace order data to a structured format for the Associates Program course
 */

/**
 * Checks if a course is an Associates Program course
 * @param {string} courseName - Name of the course from Squarespace
 * @returns {boolean} - True if the course is an Associates Program course
 */
export function isAssociatesProgram(courseName) {
  if (!courseName) return false;

  const name = courseName.toLowerCase();
  return (
    name.includes("associates") ||
    name.includes("associate's") ||
    name.includes("program")
  );
}

/**
 * Extract level information from the section (e.g., "Year 1" → "Year 1")
 * @param {string} section
 * @returns {string}
 */
function extractLevel(section) {
  return section.trim();
}

/**
 * Helper to get a variant option by name
 * @param {Array} options - variantOptions array
 * @param {string} key - option name to extract (e.g., "Plan", "Section")
 * @returns {string}
 */
function getVariantOption(options, key) {
  const found = options.find(
    (opt) => opt.optionName.toLowerCase() === key.toLowerCase()
  );
  return found.value;
}

/**
 * Creates a structured Associates Program course model from the order
 * @param {Object} order - Full Squarespace order object
 * @returns {Object} - Structured course + student model
 */
export function createAssociatesProgramModel(order) {
  const item = order.lineItems[0];
  const customizations = Object.fromEntries(
    item.customizations.map((c) => [c.label, c.value])
  );

  const plan = getVariantOption(item.variantOptions, "Plan");
  const section = getVariantOption(item.variantOptions, "Section");

  // Extract customer information from the order
  const customerEmail = order.customerEmail;
  const { firstName, lastName, phone } = order.billingAddress || {};

  // Extract customizations
  const gender = customizations["Gender"];
  const age = customizations["Age"];
  const studentType = customizations["I am a"];
  const password = customizations["Password"];
  const arabicReadingAbility = customizations["Arabic Reading Ability"];
  const arabicWritingAbility = customizations["How would you rate your Arabic writing ability?"];
  const studiedIslamicSciences = customizations["Have you studied Islamic sciences before (e.g. Aqeedah, Fiqh, Tafsir, Hadith)?"];
  const previousTopics = customizations["If yes, please list some of the topics you've studied and where:"];
  const interestReason = customizations["Why are you interested in this course?"];

  return {
    courseId: order.id,
    orderNumber: order.orderNumber,
    createdOn: order.createdOn,
    courseName: item.productName,
    courseType: "AssociatesProgram",
    customerEmail, // Keep this for the Firebase query

    studentInfo: {
      firstName,
      lastName,
      email: customerEmail, // This needs to match the customerEmail for consistency
      phone: phone?.replace(/\s+/g, "") || "",
      gender,
      age,
      studentType,
      password,
    },

    placementInfo: {
      arabicProficiency: arabicReadingAbility,
      readingAbility: arabicReadingAbility,
      writingAbility: arabicWritingAbility,
      listeningAbility: customizations["How would you rate your Arabic listening and comprehension?"] || "Not specified",
      studiedIslamicSciences,
      previousTopics,
      interestReason,
      level: extractLevel(section),
      plan,
      imageUrl: item.imageUrl,
      status: "enrolled",
    },

    metadata: {
      lastUpdated: new Date().toISOString(),
    },
  };
}

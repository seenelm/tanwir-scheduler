import dotenv from "dotenv";
import axios from "axios";
import { logger } from "../utils/logger.js";

dotenv.config();

/**
 * Send welcome email to a new student with their course details using Brevo API
 * @param {Object} student - Student information including email and course details
 * @returns {Promise<boolean>} - True if email was sent successfully
 */
export async function sendWelcomeEmail(student) {
  try {
    // Debug log at start of function
    logger.info("Starting sendWelcomeEmail function with Brevo API");
    
    // Check if API key exists
    const apiKey = process.env.BREVO_API_KEY;
    if (!apiKey) {
      logger.warn("Skipping welcome email: Missing BREVO_API_KEY environment variable");
      return false;
    }

    const { studentInfo, courses } = student;
    const email = studentInfo.email;
    const firstName = studentInfo.firstName || "";
    const lastName = studentInfo.lastName || "";
    const password = studentInfo.password || "Your custom password";

    if (!email) {
      logger.warn("Cannot send welcome email: Missing email address");
      return false;
    }

    // Get course names for the email
    const courseNames = courses.map(course => course.courseName || course.courseType).join(", ");
    
    // Log email details for debugging
    logger.info(`Preparing welcome email for ${email} with courses: ${courseNames}`);
    
    // Create HTML email content
    const htmlContent = `
      <h1>Welcome to ${courseNames}!</h1>
      <p>Hello ${firstName} ${lastName},</p>
      <p>Thank you for enrolling in ${courseNames}. We're excited to have you join us!</p>
      <p>Here are your login details for the student portal:</p>
      <ul>
        <li><strong>Portal URL:</strong> <a href="${process.env.STUDENT_PORTAL_URL || "https://portal.tanwir.org"}">${process.env.STUDENT_PORTAL_URL || "https://portal.tanwir.org"}</a></li>
        <li><strong>Username:</strong> ${email}</li>
        <li><strong>Password:</strong> ${password}</li>
      </ul>
      <p>If you have any questions, please don't hesitate to contact us.</p>
      <p>Best regards,<br>The Tanwir Institute Team</p>
    `;
    
    try {
      // Send email using Brevo API
      logger.info(`Sending welcome email to ${email} via Brevo API`);
      
      // Use the exact curl format that works
      logger.info("Making API call to Brevo...");
      
      try {
        const response = await axios({
          method: 'post',
          url: 'https://api.brevo.com/v3/smtp/email',
          headers: {
            'accept': 'application/json',
            'api-key': apiKey,
            'content-type': 'application/json'
          },
          data: {
            sender: {
              name: process.env.FROM_NAME || "Tanwir Institute",
              email: process.env.FROM_EMAIL || "noreply@tanwirinstitute.org"
            },
            to: [
              {
                email: email,
                name: `${firstName} ${lastName}`.trim() || email
              }
            ],
            subject: `Welcome to ${courseNames}`,
            htmlContent: htmlContent
          }
        });
        
        // Log detailed response information
        logger.info(`Email API response received with status: ${response.status}`);
        logger.info(`Response headers: ${JSON.stringify(response.headers)}`);
        logger.info(`Response data: ${JSON.stringify(response.data)}`);
        logger.info(`Welcome email sent successfully to ${email} for courses: ${courseNames}`);
        return true;
      } catch (apiError) {
        // Specific error handling for the API call
        logger.error(`API call failed: ${apiError.message}`);
        
        if (apiError.response) {
          logger.error(`API error response: Status ${apiError.response.status}`);
          logger.error(`API error data: ${JSON.stringify(apiError.response.data)}`);
        } else if (apiError.request) {
          logger.error("API request was made but no response was received");
        }
        
        // Try the curl command directly as a fallback
        try {
          logger.info("Attempting fallback method...");
          
          // Log what the curl command would be (without the API key for security)
          logger.info(`Equivalent curl command would be:
curl --request POST \\
  --url https://api.brevo.com/v3/smtp/email \\
  --header 'accept: application/json' \\
  --header 'api-key: [REDACTED]' \\
  --header 'content-type: application/json' \\
  --data '{
    "sender": {
      "name": "${process.env.FROM_NAME || "Tanwir Institute"}",
      "email": "${process.env.FROM_EMAIL || "noreply@tanwirinstitute.org"}"
    },
    "to": [
      {
        "email": "${email}",
        "name": "${`${firstName} ${lastName}`.trim() || email}"
      }
    ],
    "subject": "Welcome to ${courseNames}",
    "htmlContent": "[HTML CONTENT]"
  }'`);
          
          throw apiError; // Re-throw to be caught by the outer catch
        } catch (fallbackError) {
          logger.error("Fallback method suggestion failed");
          throw apiError; // Re-throw the original error
        }
      }
    } catch (error) {
      // Detailed error logging
      logger.error("Failed to send email:", error.message);
      
      if (error.response) {
        // The request was made and the server responded with a status code
        // that falls out of the range of 2xx
        logger.error("API response error:", {
          status: error.response.status,
          data: error.response.data
        });
      } else if (error.request) {
        // The request was made but no response was received
        logger.error("No response received from API");
      }
      
      return false;
    }
  } catch (error) {
    logger.error("Error in sendWelcomeEmail function:", error.message);
    return false;
  }
}

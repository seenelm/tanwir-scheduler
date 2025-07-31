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
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body {
            font-family: Arial, sans-serif;
            line-height: 1.6;
            color: #000000;
            max-width: 600px;
            margin: 0 auto;
          }
          .header {
            padding: 20px;
            text-align: center;
            border-bottom: 1px solid #eeeeee;
          }
          .logo {
            max-width: 280px;
            margin-bottom: 10px;
          }
          .content {
            padding: 20px;
          }
          .footer {
            background-color: #f5f5f5;
            padding: 15px;
            text-align: center;
            font-size: 12px;
            color: #666666;
          }
          h1 {
            color: #004d40;
          }
          .button {
            display: inline-block;
            background-color: #004d40;
            color: #ffffff;
            padding: 10px 20px;
            text-decoration: none;
            border-radius: 4px;
            margin: 20px 0;
          }
          .details {
            background-color: #f9f9f9;
            border-left: 4px solid #004d40;
            padding: 15px;
            margin: 20px 0;
          }
        </style>
      </head>
      <body>
        <div class="header">
          <img src="https://images.squarespace-cdn.com/content/66a00d45db79b1271d17284d/f596f1b5-33ae-4fde-b6e1-3a6c9beb0deb/tanwir-horizontal.png" alt="Tanwir Institute Logo" class="logo">
        </div>
        <div class="content">
          <h1>Welcome to ${courseNames}!</h1>
          
          <p>Dear ${firstName} ${lastName},</p>
          
          <p>Thank you for enrolling in <strong>${courseNames}</strong>. We're excited to welcome you to our learning community!</p>
          
          <p>Your course materials are now available in our student portal. Please use the following credentials to access your account:</p>
          
          <div class="details">
            <p><strong>Student Portal:</strong> <a href="${process.env.STUDENT_PORTAL_URL || "https://portal.tanwir.org"}">${process.env.STUDENT_PORTAL_URL || "https://portal.tanwir.org"}</a></p>
            <p><strong>Username:</strong> ${email}</p>
            <p><strong>Password:</strong> ${password}</p>
          </div>
          
          <p>We recommend logging in as soon as possible to:</p>
          <ul>
            <li>Verify your account access</li>
            <li>Update your profile information</li>
            <li>Explore your course materials</li>
          </ul>
          
          <a href="${process.env.STUDENT_PORTAL_URL || "https://portal.tanwir.org"}" class="button">Access Student Portal</a>
          
          <p>If you have any questions or need assistance, please don't hesitate to contact our support team at <a href="mailto:programs@tanwirinstitute.org">programs@tanwirinstitute.org</a>.</p>
          
          <p>We look forward to accompanying you on your learning journey!</p>
          
          <p>Best regards,<br>The Tanwir Institute Team</p>
        </div>
        <div class="footer">
          <p> ${new Date().getFullYear()} Tanwir Institute. All rights reserved.</p>
          <p>For support: <a href="mailto:programs@tanwirinstitute.org">programs@tanwirinstitute.org</a></p>
        </div>
      </body>
      </html>
    `;
    
    try {
      // Send email using Brevo API
      logger.info(`Sending welcome email to ${email} via Brevo API`);
      
      // Use the exact curl format that works
      logger.info("Making API call to Brevo...");
      
      try {
        logger.info(`API call starting with key length: ${apiKey ? apiKey.length : 0}`);
        
        // Log the request data (without sensitive content)
        const requestData = {
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
          htmlContent: "HTML content omitted for brevity"
        };
        
        logger.info(`Request data: ${JSON.stringify(requestData, null, 2)}`);
        
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
          }).catch(err => {
            logger.error("Brevo axios error:", err.message);
            if (err.response) {
              logger.error("Brevo response:", JSON.stringify(err.response.data, null, 2));
            }
            throw err;
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
          logger.error(`Request details: ${JSON.stringify(apiError.request._header || {})}`);
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

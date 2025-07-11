# Tanwir Scheduler

A Node.js scheduler application that fetches student orders from Squarespace, processes the data, and stores it in Firebase Firestore. This application is designed to be deployed on Render.com.

## Features

- Scheduled data extraction from Squarespace API
- Data processing and formatting
- Storage in Firebase Firestore
- RESTful API endpoints for manual triggering
- Health check endpoint
- Configurable via environment variables
- Designed for deployment on Render.com

## Prerequisites

- Node.js 18.x or higher
- Squarespace API key with access to orders
- Firebase project with Firestore database
- Firebase service account credentials

## Setup

1. Clone this repository:

   ```
   git clone https://github.com/yourusername/tanwir-scheduler.git
   cd tanwir-scheduler
   ```

2. Install dependencies:

   ```
   npm install
   ```

3. Create a `.env` file based on `.env.example`:

   ```
   cp .env.example .env
   ```

4. Configure your environment variables in the `.env` file:
   - Add your Squarespace API key
   - Configure Firebase credentials (see below)
   - Adjust the cron schedule if needed

## Firebase Configuration

You have three options to configure Firebase:

1. **Base64-encoded service account (recommended for Render.com)**:

   ```
   cat path/to/serviceAccountKey.json | base64 > service-account-base64.txt
   ```

   Then copy the contents of `service-account-base64.txt` to the `FIREBASE_SERVICE_ACCOUNT_BASE64` environment variable.

2. **Path to service account file**:
   Set `GOOGLE_APPLICATION_CREDENTIALS` to the path of your service account JSON file.

3. **JSON service account string**:
   Copy the entire JSON content of your service account file to the `FIREBASE_SERVICE_ACCOUNT_JSON` environment variable.

## Running Locally

```
npm run dev
```

The server will start on the port specified in your `.env` file (default: 3000).

## Deployment to Render.com

1. Create a new Web Service on Render.com
2. Connect your GitHub repository
3. Configure the service:
   - **Environment**: Node
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
   - **Environment Variables**: Add all variables from your `.env` file

## API Endpoints

- `GET /`: Health check endpoint
- `POST /trigger-sync`: Manually trigger the synchronization process

## Customization

### Adjusting the Schedule

The default schedule is set to run every day at 2 AM. You can modify this by changing the `CRON_SCHEDULE` environment variable. Use [crontab.guru](https://crontab.guru/) to help create your schedule.

### Modifying Data Processing

If you need to adjust how the data is processed or what fields are extracted:

1. Edit `services/dataProcessor.js` to modify the data transformation logic
2. Update the student information extraction in the `extractStudentInfo` function
3. Update the course information extraction in the `extractCourseInfo` function

## Logging

The application uses a simple logging utility with configurable log levels:

- ERROR: Only errors
- WARN: Errors and warnings
- INFO: Errors, warnings, and info messages (default)
- DEBUG: All messages including debug information

Set the `LOG_LEVEL` environment variable to control the verbosity.

## License

MIT

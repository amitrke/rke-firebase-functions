
# RKE Firebase Functions

This project contains a set of Firebase Functions for the RKE project, responsible for managing files, fetching weather data, and fetching news data.

## Features

- **Weather Updates:** A scheduled function that fetches and stores the latest weather data for Roorkee, India from OpenWeatherMap every hour.
- **News Updates:** A scheduled function that fetches and stores the latest news articles related to Roorkee from NewsAPI every 4 hours.
- **File Management:**
    - Automatically records file metadata in Firestore when files are uploaded to Cloud Storage.
    - Automatically removes file metadata from Firestore when files are deleted from Cloud Storage.
    - Periodically checks for unused files in Cloud Storage and deletes them to save space.

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) (v16 or later)
- [Yarn](https://yarnpkg.com/)
- [Firebase CLI](https://firebase.google.com/docs/cli)

### Installation

1.  **Clone the repository:**
    ```bash
    git clone https://github.com/your-username/rke-firebase-functions.git
    cd rke-firebase-functions/functions
    ```

2.  **Install dependencies:**
    ```bash
    yarn install
    ```

3.  **Set up Firebase configuration:**
    - Create a new Firebase project on the [Firebase Console](https://console.firebase.google.com/).
    - Add a new Web app to your project to get your Firebase configuration.
    - Set the following environment variables for the functions:
        ```bash
        firebase functions:config:set config.pass="YOUR_OPENWEATHERMAP_API_KEY"
        firebase functions:config:set config.newskey="YOUR_NEWSAPI_API_KEY"
        ```

## Cloud Functions

The following Cloud Functions are defined in this project:

- **`updateWeather`**: A scheduled function that runs every 60 minutes to fetch and update weather data.
- **`updateNews`**: A scheduled function that runs every 4 hours to fetch and update news articles.
- **`updateFilesList`**: A scheduled function that runs every 7 days to list all files in Cloud Storage and add their metadata to Firestore.
- **`checkFilesBeingUsed`**: A scheduled function that runs every 170 hours to check which files are referenced in "posts" and "albums" and updates a `isBeingUsed` flag in Firestore.
- **`deleteUnusedFiles`**: A scheduled function that runs every 172 hours to delete files from Cloud Storage that are marked as unused.
- **`onFileCreate`**: A function triggered by Cloud Storage when a new file is uploaded. It adds the file's metadata to Firestore.
- **`onFileDelete`**: A function triggered by Cloud Storage when a file is deleted. It removes the file's metadata from Firestore.

## Deployment

To deploy the functions to Firebase, run the following command from the `functions` directory:

```bash
firebase deploy --only functions
```

## Configuration

The following environment variables need to be set for the functions to work correctly:

- `config.pass`: Your API key for the OpenWeatherMap API.
- `config.newskey`: Your API key for the NewsAPI.

You can set these variables using the Firebase CLI as shown in the [Installation](#installation) section.

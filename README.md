# RKE Firebase Functions

[![Deploy to Firebase](https://github.com/amitrke/rke-firebase-functions/actions/workflows/deploy.yml/badge.svg)](https://github.com/amitrke/rke-firebase-functions/actions/workflows/deploy.yml)

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
    - For local development, create a `.env` file in the `functions` directory and add the following environment variables:
        ```
        NEWS_API_KEY="YOUR_NEWSAPI_API_KEY"
        NEWSDATAIO_API_KEY="YOUR_NEWSDATAIO_API_KEY"
        WEATHER_API_KEY="YOUR_OPENWEATHERMAP_API_KEY"
        ```

## Cloud Functions

The following Cloud Functions are defined in this project:

- **`updateWeather`**: A scheduled function that runs every 60 minutes to fetch and update weather data.
- **`updateNews`**: A scheduled function that runs every 4 hours to fetch and update news articles.
- **`updateNewsFromNewsDataIO`**: A scheduled function that runs every 12 hours to fetch and update news articles from NewsData.io.
- **`updateFilesList`**: A scheduled function that runs every 7 days to list all files in Cloud Storage and add their metadata to Firestore.
- **`checkFilesBeingUsed`**: A scheduled function that runs every 170 hours to check which files are referenced in "posts" and "albums" and updates a `isBeingUsed` flag in Firestore.
- **`deleteUnusedFiles`**: A scheduled function that runs every 172 hours to delete files from Cloud Storage that are marked as unused.
- **`onFileCreate`**: A function triggered by Cloud Storage when a new file is uploaded. It adds the file's metadata to Firestore.
- **`onFileDelete`**: A function triggered by Cloud Storage when a file is deleted. It removes the file's metadata from Firestore.

## Deployment

For detailed deployment instructions, please see the [Deployment Guide](DEPLOYMENT.md).

To deploy the functions to Firebase, run the following command from the `functions` directory:

```bash
firebase deploy --only functions
```

## Configuration

The following environment variables need to be set for the functions to work correctly:

- `config.pass`: Your API key for the OpenWeatherMap API.
- `config.newskey`: Your API key for the NewsAPI.
- `config.newsdataiokey`: Your API key for NewsData.io.

You can set these variables using the Firebase CLI as shown in the [Installation](#installation) section.

## API Schemas

### NewsAPI (`/v2/everything`)

The response from the NewsAPI `everything` endpoint is a JSON object with the following structure:

#### Root Object

| Key            | Type    | Description                                             |
| :------------- | :------ | :------------------------------------------------------ |
| `status`       | String  | The status of the request. Can be `ok` or `error`.      |
| `totalResults` | Integer | The total number of results found.                      |
| `articles`     | Array   | An array of article objects.                            |

#### Article Object

Each object in the `articles` array has the following structure:

| Key           | Type   | Description                                                                 |
| :------------ | :----- | :-------------------------------------------------------------------------- |
| `source`      | Object | The identifier and name of the source of the article.                       |
| `author`      | String | The author of the article.                                                  |
| `title`       | String | The headline or title of the article.                                       |
| `description` | String | A short description or snippet from the article.                            |
| `url`         | String | The direct URL to the article.                                              |
| `image_url`  | String | The URL of an image associated with the article.                            |
| `publishedAt` | String | The date and time the article was published, in ISO 8601 format.            |
| `content`     | String | The unformatted content of the article.                                     |

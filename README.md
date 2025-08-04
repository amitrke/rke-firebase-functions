# RKE Firebase Functions

[![Deploy to Firebase](https://github.com/amitrke/rke-firebase-functions/actions/workflows/deploy.yml/badge.svg)](https://github.com/amitrke/rke-firebase-functions/actions/workflows/deploy.yml)

This project contains a set of Firebase Functions for the RKE project, responsible for managing files, fetching weather data, and fetching news data.

## Features

- **Weather Updates:** A scheduled function that fetches and stores the latest weather data for Roorkee, India from OpenWeatherMap every hour.
- **News Updates:** A scheduled function that fetches and stores the latest news articles related to Roorkee from NewsAPI every 12 hours.
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
- **`updateNews`**: A scheduled function that runs every 12 hours to fetch and update news articles.
- **`updateNewsFromNewsDataIO`**: A scheduled function that runs every 12 hours to fetch and update news articles from NewsData.io.
- **`updateFilesList`**: A scheduled function that runs every 7 days to list all files in Cloud Storage and add their metadata to Firestore.
- **`checkFilesBeingUsed`**: A scheduled function that runs every 170 hours to check which files are referenced in "posts" and "albums" and updates a `isBeingUsed` flag in Firestore.
- **`deleteUnusedFiles`**: A scheduled function that runs every 172 hours to delete files from Cloud Storage that are marked as unused.
- **`updateHolidays`**: A scheduled function that runs once a year to fetch and update holidays for India.
- **`onFileCreateV2`**: A function triggered by Cloud Storage when a new file is uploaded. It adds the file's metadata to Firestore.
- **`onFileDeleteV2`**: A function triggered by Cloud Storage when a file is deleted. It removes the file's metadata from Firestore.

## Deployment

For detailed deployment instructions, please see the [Deployment Guide](DEPLOYMENT.md).

To deploy the functions to Firebase, run the following command from the `functions` directory:

```bash
firebase deploy --only functions
```

## Configuration

The following environment variables need to be set for the functions to work correctly:

- `WEATHER_API_KEY`: Your API key for the OpenWeatherMap API.
- `NEWS_API_KEY`: Your API key for the NewsAPI.
- `NEWSDATAIO_API_KEY`: Your API key for NewsData.io.
- `CALENDARIFIC_API_KEY`: Your API key for Calendarific.

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
| `urlToImage`  | String | The URL of an image associated with the article.                            |
| `publishedAt` | String | The date and time the article was published, in ISO 8601 format.            |
| `content`     | String | The unformatted content of the article.                                     |

### NewsData.io (`/api/1/news`)

The response from the NewsData.io `news` endpoint is a JSON object with the following structure:

#### Root Object

| Key            | Type    | Description                                             |
| :------------- | :------ | :------------------------------------------------------ |
| `status`       | String  | The status of the request. Can be `success` or `error`. |
| `totalResults` | Integer | The total number of results found.                      |
| `results`      | Array   | An array of article objects.                            |
| `nextPage`     | String  | The next page of results.                               |

#### Article Object

Each object in the `results` array has the following structure:

| Key           | Type   | Description                                                                 |
| :------------ | :----- | :-------------------------------------------------------------------------- |
| `article_id`  | String | The unique identifier of the article.                                       |
| `title`       | String | The headline or title of the article.                                       |
| `link`        | String | The direct URL to the article.                                              |
| `keywords`    | Array  | An array of keywords associated with the article.                           |
| `creator`     | Array  | The author of the article.                                                  |
| `video_url`   | String | The URL of a video associated with the article.                             |
| `description` | String | A short description or snippet from the article.                            |
| `content`     | String | The unformatted content of the article.                                     |
| `pubDate`     | String | The date and time the article was published, in ISO 8601 format.            |
| `image_url`   | String | The URL of an image associated with the article.                            |
| `source_id`   | String | The identifier of the source of the article.                                |
| `source_priority` | Integer | The priority of the source.                                             |
| `country`     | Array  | The country of the source.                                                  |
| `category`    | Array  | The category of the article.                                                |
| `language`    | String | The language of the article.                                                |

### OpenWeatherMap (`/data/3.0/onecall`)

The response from the OpenWeatherMap `onecall` endpoint is a JSON object with the following structure:

#### Root Object

| Key      | Type   | Description                      |
| :------- | :----- | :------------------------------- |
| `lat`      | Number | Latitude of the location.        |
| `lon`      | Number | Longitude of the location.       |
| `timezone` | String | The timezone name for the location. |
| `current`  | Object | The current weather data.        |
| `hourly`   | Array  | An array of hourly weather data. |
| `daily`    | Array  | An array of daily weather data.  |

#### Current Weather Object

| Key          | Type   | Description                   |
| :----------- | :----- | :---------------------------- |
| `dt`         | Number | Time of the data point, Unix, UTC. |
| `sunrise`    | Number | Sunrise time, Unix, UTC.      |
| `sunset`     | Number | Sunset time, Unix, UTC.       |
| `temp`       | Number | Temperature in Celsius.       |
| `feels_like` | Number | "Feels like" temperature.     |
| `pressure`   | Number | Atmospheric pressure, hPa.    |
| `humidity`   | Number | Humidity, %.                  |
| `uvi`        | Number | UV index.                     |
| `clouds`     | Number | Cloudiness, %.                |
| `visibility` | Number | Average visibility, meters.   |
| `wind_speed` | Number | Wind speed, meter/sec.        |
| `weather`    | Array  | Array of weather condition objects. |

#### Weather Condition Object

| Key         | Type   | Description            |
| :---------- | :----- | :--------------------- |
| `id`        | Number | Weather condition id.  |
| `main`      | String | Group of weather parameters (Rain, Snow, Extreme etc.). |
| `description`| String | Description of the weather condition. |
| `icon`      | String | Weather icon id.       |

## Events Collection

This collection stores various types of events.

### Holiday Document

Holiday documents are stored with the following structure:

| Field         | Type      | Description                                                                 |
| :------------ | :-------- | :-------------------------------------------------------------------------- |
| `type`        | String    | The type of event. For holidays, this is always `holiday`.                  |
| `name`        | String    | The name of the holiday.                                                    |
| `description` | String    | A description of the holiday.                                               |
| `date`        | String    | The date of the holiday in ISO 8601 format (e.g., "2025-01-26").            |
| `holidayTypes`| Array     | An array of strings categorizing the holiday (e.g., `["Gazetted holiday"]`). |
| `locations`   | String    | Locations where the holiday is observed.                                    |
| `states`      | String    | States where the holiday is observed.                                       |
| `url`         | String    | A link to the holiday's page on Calendarific.                               |
| `expireAt`    | Timestamp | The date and time when the document should be automatically deleted (30 days after the holiday). |

**Note on TTL:** To enable automatic deletion of past holidays, you must enable the Time-to-Live (TTL) policy for the `events` collection in your Firebase project.
1. Go to the Firestore Database section of the Firebase console.
2. Select the `events` collection.
3. Go to the TTL tab and click "Enable TTL".
4. Set the `expireAt` field as the TTL field.

## Contributing

Contributions are welcome! Please open an issue or submit a pull request if you have any improvements or suggestions.

## License

This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for details.
# Deployment Instructions

## 1. Set the API Keys

Before deploying the functions, you need to set the required API keys as environment variables.

### Local Development

For local development, create a `.env` file in the `functions` directory and add the following environment variables:

```
NEWS_API_KEY="YOUR_NEWSAPI_API_KEY"
NEWSDATAIO_API_KEY="YOUR_NEWSDATAIO_API_KEY"
WEATHER_API_KEY="YOUR_OPENWEATHERMAP_API_KEY"
```

**Note:** The `.env` file is ignored by git and should not be committed to the repository.

### Production Deployment (GitHub Actions)

For production deployments, you need to add the following secrets to your GitHub repository settings:

- `FIREBASE_PROJECT_ID`: Your Firebase project ID.
- `FIREBASE_TOKEN`: Your Firebase CI token.
- `NEWS_API_KEY`: Your NewsAPI API key.
- `NEWSDATAIO_API_KEY`: Your NewsData.io API key.
- `WEATHER_API_KEY`: Your OpenWeatherMap API key.

## 2. Deploy the Functions

After setting the environment variables, you can deploy your functions to Firebase.

Run the following command:

```bash
firebase deploy --only functions
```

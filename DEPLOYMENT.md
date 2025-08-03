# Deployment Instructions

## 1. Set the API Keys

Before deploying the functions, you need to set the required API keys as Firebase environment variables. These keys are used to fetch news and weather data.

Run the following commands in your terminal, replacing the placeholder values with your actual API keys:

```bash
# For NewsAPI (newsapi.org)
firebase functions:config:set config.newskey="YOUR_NEWSAPI_API_KEY"

# For NewsData.io
firebase functions:config:set config.newsdataiokey="YOUR_NEWSDATAIO_API_KEY"
```

**Note:** You only need to do this once. The configuration will be stored securely in your Firebase project.

## 2. Deploy the Functions

After setting the API key, you can deploy your functions to Firebase.

Run the following command:

```bash
firebase deploy --only functions
```

This command will upload and activate the functions in your Firebase project. Any subsequent deployments will not require you to set the API key again unless you need to change it.

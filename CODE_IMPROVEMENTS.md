# Code Improvement Recommendations

This document outlines suggested improvements for the RKE Firebase Functions codebase, organized by priority.

## High Priority

### 1. Missing Error Handling in Core Functions

**Issue:** Critical functions lack error handling, which could cause silent failures.

**Affected Files:**
- `functions/src/weather.ts:5-15` - No error handling for API failures
- `functions/src/news.ts:10-56` - No try/catch wrapper
- `functions/src/files.ts:62-102` - File operations without error handling

**Recommendation:**
```typescript
// weather.ts
export const updateWeatherUtil = async () => {
  try {
    const WEATHER_APPID = process.env.WEATHER_API_KEY;
    if (!WEATHER_APPID) {
      throw new Error("WEATHER_API_KEY environment variable not set");
    }

    const response = await fetch(
      `http://api.openweathermap.org/data/3.0/onecall?lat=29.8667&lon=77.8833&appid=${WEATHER_APPID}&units=metric&exclude=minutely`
    );

    if (!response.ok) {
      throw new Error(`Weather API returned ${response.status}: ${response.statusText}`);
    }

    const body: Weather = await response.json();
    const weatherCollection = admin.firestore().collection("weather");
    await weatherCollection.doc("roorkee-in").set(body);

    logger.info("Weather updated successfully");
  } catch (error) {
    logger.error("Error updating weather", error);
    throw error; // Re-throw to mark function as failed
  }
};
```

**Impact:** Prevents silent failures, enables proper monitoring and alerting.

---

### 2. Security: API Key Exposed in Logs

**Issue:** `functions/src/holidays.ts:36` logs partial API key.

**Current Code:**
```typescript
functions.logger.info(`Verifying API Key. First 5 chars: ${process.env.CALENDARIFIC_API_KEY?.substring(0, 5)}`);
```

**Recommendation:** Remove this line entirely. API key presence should be validated without logging.

```typescript
if (!process.env.CALENDARIFIC_API_KEY) {
  throw new Error("CALENDARIFIC_API_KEY environment variable not set");
}
```

**Impact:** Reduces security risk of API key exposure in logs.

---

### 3. Potential Race Condition in File Cleanup

**Issue:** File management functions run on staggered schedules (168h, 170h, 172h) that could drift over time.

**Affected Files:**
- `functions/src/files.ts:62` - `listAndInsertFiles` (every 168 hours)
- `functions/src/files.ts:138` - `checkFilesBeingUsed` (every 170 hours)
- `functions/src/files.ts:213` - `deleteUnusedFiles` (every 172 hours)

**Problem:** If these schedules drift, `deleteUnusedFiles` might run before `checkFilesBeingUsed`, potentially deleting files that are actually in use.

**Recommendation:**
Option 1 - Use a single orchestrator function:
```typescript
export const fileMaintenanceOrchestrator = onSchedule(
  {schedule: "every 168 hours", region: "us-east1"},
  async () => {
    try {
      logger.info("Starting file maintenance orchestration");

      // Step 1: Sync files
      await listAndInsertFilesUtil();
      logger.info("File sync complete");

      // Step 2: Check usage (wait for step 1)
      await checkFilesBeingUsedUtil();
      logger.info("File usage check complete");

      // Step 3: Delete unused (wait for step 2)
      await deleteUnusedFilesUtil();
      logger.info("Unused files deleted");

      logger.info("File maintenance orchestration complete");
    } catch (error) {
      logger.error("File maintenance orchestration failed", error);
      throw error;
    }
  }
);
```

Option 2 - Use Cloud Tasks with explicit dependencies for better control and retry logic.

**Impact:** Prevents accidental deletion of files that are in use.

---

### 4. Duplicate Keyword Filtering Logic

**Issue:** Identical keyword filtering appears in both `news.ts:24-28` and `newsdataio.ts:43-47`.

**Recommendation:** Create shared utility file:

```typescript
// functions/src/utils/filters.ts
export const articleMatchesKeywords = (
  article: { title?: string; description?: string; content?: string },
  keywords: string[]
): boolean => {
  const title = article.title?.toLowerCase() || "";
  const description = article.description?.toLowerCase() || "";
  const content = article.content?.toLowerCase() || "";

  return keywords.some(keyword =>
    title.includes(keyword) ||
    description.includes(keyword) ||
    content.includes(keyword)
  );
};
```

Then use in both files:
```typescript
import {articleMatchesKeywords} from "./utils/filters";

// Replace keyword checking code with:
if (articleMatchesKeywords(articleData, KEYWORDS)) {
  // ... rest of logic
}
```

**Impact:** Reduces code duplication, easier to maintain and test.

---

## Medium Priority

### 5. Magic Numbers Throughout Codebase

**Issue:** Hardcoded numbers make code less maintainable and harder to understand.

**Locations:**
- `functions/src/files.ts:62` - `"every 168 hours"` (7 days)
- `functions/src/news.ts:37` - `1000 * 60 * 60 * 24 * 7`
- `functions/src/holidays.ts:17` - `30 * 24 * 60 * 60 * 1000`
- `functions/src/newsdataio.ts:52` - `1000 * 60 * 60 * 24 * 7`

**Recommendation:** Create constants file:

```typescript
// functions/src/config/constants.ts
export const TIME = {
  ONE_MINUTE_MS: 60 * 1000,
  ONE_HOUR_MS: 60 * 60 * 1000,
  ONE_DAY_MS: 24 * 60 * 60 * 1000,
  ONE_WEEK_MS: 7 * 24 * 60 * 60 * 1000,
} as const;

export const SCHEDULES = {
  WEATHER_UPDATE: "every 60 minutes",
  NEWS_UPDATE: "every 12 hours",
  FILE_SYNC: "every 168 hours", // Weekly file sync
  FILE_USAGE_CHECK: "every 170 hours",
  FILE_CLEANUP: "every 172 hours",
  HOLIDAYS_UPDATE: "0 0 1 1 *", // January 1st annually
} as const;

export const TTL = {
  NEWS_ARTICLES_DAYS: 7,
  HOLIDAYS_DAYS_AFTER: 30,
} as const;

export const FILE_SIZES = {
  SMALL: { dimension: "200x200", code: "s" },
  MEDIUM: { dimension: "680x680", code: "m" },
  LARGE: { dimension: "1920x1080", code: "l" },
} as const;

export const LOCATIONS = {
  ROORKEE: {
    name: "roorkee-in",
    lat: 29.8667,
    lon: 77.8833,
  },
} as const;

export const KEYWORDS = ["roorkee"] as const;
```

Then use throughout:
```typescript
import {TIME, TTL} from "./config/constants";

expireAt: admin.firestore.Timestamp.fromMillis(
  Date.now() + TIME.ONE_DAY_MS * TTL.NEWS_ARTICLES_DAYS
)
```

**Impact:** Improved code readability, single source of truth for configuration.

---

### 6. Inefficient parseDate Function

**Issue:** `functions/src/files.ts:40-60` uses complex string parsing when JavaScript's built-in Date works.

**Current Code:**
```typescript
export const parseDate = (date: string) => {
  const dateArray = date.split("T");
  const dateArray2 = dateArray[0].split("-");
  const dateArray3 = dateArray[1].split(":");
  const dateArray4 = dateArray3[2].split(".");
  const year = dateArray2[0];
  const month = dateArray2[1];
  const day = dateArray2[2];
  const hour = dateArray3[0];
  const minute = dateArray3[1];
  const second = dateArray4[0];
  const timestamp = Date.UTC(
    parseInt(year),
    parseInt(month) - 1,
    parseInt(day),
    parseInt(hour),
    parseInt(minute),
    parseInt(second),
  );
  return timestamp;
};
```

**Recommendation:**
```typescript
export const parseDate = (date: string): number => {
  return new Date(date).getTime();
};
```

**Impact:** Simpler, more maintainable, less error-prone.

---

### 7. Inefficient Firestore Operations

**Issue:** `functions/src/files.ts:89-98` performs sequential reads before writes.

**Current Code:**
```typescript
const insertions = processedFiles.map(async (file) => {
  const docRef = filesCollection.doc(file.id);
  const doc = await docRef.get(); // Expensive read
  if (!doc.exists) {
    await docRef.set(file);
  }
});
```

**Recommendation:** Use batched writes with merge option:
```typescript
// Split into batches of 500 (Firestore limit)
const BATCH_SIZE = 500;
for (let i = 0; i < processedFiles.length; i += BATCH_SIZE) {
  const batch = admin.firestore().batch();
  const batchFiles = processedFiles.slice(i, i + BATCH_SIZE);

  for (const file of batchFiles) {
    const docRef = filesCollection.doc(file.id);
    // Set with merge doesn't require reading first
    batch.set(docRef, file, { merge: true });
  }

  await batch.commit();
}
```

**Impact:** Reduces Firestore read operations, faster execution, lower costs.

---

### 8. Missing Input Validation

**Issue:** Functions assume input data is well-formed.

**Affected Files:**
- `functions/src/files.ts:18` - `parseFilePath` doesn't validate format
- `functions/src/files.ts:206` - `getFilePath` assumes valid structure

**Recommendation:**
```typescript
export const parseFilePath = (filePath: string): {
  userId: string;
  fileName: string;
  imageSize: string;
  imageDimensions: string;
} | null => {
  // Validate basic structure
  if (!filePath || typeof filePath !== 'string') {
    logger.warn(`Invalid file path: ${filePath}`);
    return null;
  }

  const pathArray = filePath.split("/");

  // Expected: users/{userId}/images/{fileName}_{dimensions}.{ext}
  if (pathArray.length < 4 || pathArray[0] !== "users" || pathArray[2] !== "images") {
    logger.warn(`File path doesn't match expected pattern: ${filePath}`);
    return null;
  }

  const fileNameWithDim = pathArray[pathArray.length - 1];
  const userId = pathArray[1];

  if (!userId || !fileNameWithDim) {
    logger.warn(`Missing userId or filename in path: ${filePath}`);
    return null;
  }

  const fileNameArray = fileNameWithDim.split("_");
  const dimWithExt = fileNameArray.pop();

  if (!dimWithExt) {
    logger.warn(`Missing dimensions in filename: ${fileNameWithDim}`);
    return null;
  }

  const fileNameExtArray = dimWithExt.split(".");

  if (fileNameExtArray.length < 2) {
    logger.warn(`Missing file extension: ${dimWithExt}`);
    return null;
  }

  const fileName = fileNameArray.join("_") + "." + fileNameExtArray[1];
  const imageDimensions = dimWithExt.split(".")[0];

  let imageSize = "";
  if (imageDimensions === "200x200") {
    imageSize = "s";
  } else if (imageDimensions === "680x680") {
    imageSize = "m";
  } else if (imageDimensions === "1920x1080") {
    imageSize = "l";
  } else {
    logger.info(`Unrecognized image dimensions: ${imageDimensions}`);
    imageSize = "";
  }

  return {userId, fileName, imageSize, imageDimensions};
};
```

**Impact:** Prevents runtime errors, better error messages for debugging.

---

### 9. Missing API Response Validation

**Issue:** Functions assume API responses are valid without checking.

**Affected Files:**
- `functions/src/weather.ts:12` - Casts response directly to Weather type
- `functions/src/news.ts:16-18` - Minimal validation

**Recommendation:**
```typescript
// utils/validators.ts
export const isValidWeatherResponse = (data: any): data is Weather => {
  return (
    data &&
    typeof data.lat === 'number' &&
    typeof data.lon === 'number' &&
    data.current &&
    typeof data.current.temp === 'number'
  );
};

// In weather.ts
const body = await response.json();
if (!isValidWeatherResponse(body)) {
  throw new Error("Invalid weather data received from API");
}
const weatherData: Weather = body;
```

**Impact:** Prevents storing invalid data, easier debugging.

---

### 10. Hardcoded Configuration Values

**Issue:** Application-specific values are scattered throughout code.

**Examples:**
- `functions/src/weather.ts:8-9` - Roorkee coordinates
- `functions/src/news.ts:8` - Keywords
- `functions/src/files.ts:9-13` - Image size mappings

**Recommendation:** Already covered in item #5 (constants file).

---

## Low Priority

### 11. Unused Code

**Issue:** Dead code clutters the codebase.

**Locations:**
- `functions/src/files.ts:104-127` - `parsePosts` function defined but never called
- `functions/src/files.ts:270-287` - Commented out `onPostUpdateFn`

**Recommendation:**
- If `parsePosts` is needed for future use, move to utils with tests
- If `onPostUpdateFn` won't be used, delete it
- Otherwise, create GitHub issues to track implementation and remove code

**Impact:** Cleaner codebase, less confusion.

---

### 12. Inconsistent Import Patterns

**Issue:** Mix of namespace and named imports across files.

**Examples:**
- `functions/src/newsdataio.ts:2` - `import * as functions` (uses only logger)
- `functions/src/news.ts:3` - `import * as crypto` (uses createHash)
- `functions/src/newsdataio.ts:3` - `import {createHash}`

**Recommendation:** Standardize to named imports:
```typescript
import {logger} from "firebase-functions";
import {createHash} from "crypto";
```

**Impact:** Smaller bundle size, clearer dependencies.

---

### 13. Missing Unit Tests

**Issue:** No test files found in the repository.

**Recommendation:** Add Jest tests for:

```typescript
// functions/src/__tests__/files.test.ts
describe('parseFilePath', () => {
  it('should parse valid file path', () => {
    const result = parseFilePath('users/userId123/images/photo_680x680.jpg');
    expect(result).toEqual({
      userId: 'userId123',
      fileName: 'photo.jpg',
      imageSize: 'm',
      imageDimensions: '680x680'
    });
  });

  it('should return null for invalid path', () => {
    expect(parseFilePath('invalid/path')).toBeNull();
  });

  it('should handle special characters in filename', () => {
    const result = parseFilePath('users/abc/images/my_photo_2024_200x200.png');
    expect(result?.fileName).toBe('my_photo_2024.png');
  });
});

// functions/src/__tests__/filters.test.ts
describe('articleMatchesKeywords', () => {
  it('should match keyword in title', () => {
    const article = { title: 'News from Roorkee', description: '', content: '' };
    expect(articleMatchesKeywords(article, ['roorkee'])).toBe(true);
  });

  it('should be case insensitive', () => {
    const article = { title: 'ROORKEE NEWS', description: '', content: '' };
    expect(articleMatchesKeywords(article, ['roorkee'])).toBe(true);
  });
});
```

**Impact:** Catches bugs early, enables safe refactoring.

---

### 14. Missing Pagination Handling

**Issue:** API calls don't handle pagination, could miss data.

**Affected Files:**
- `functions/src/news.ts:13-15` - NewsAPI might have more results
- `functions/src/files.ts:181` - Firestore query could exceed limits

**Recommendation:**
```typescript
// For Firestore queries with large result sets
const PAGE_SIZE = 1000;
let lastDoc = null;
let allFiles = [];

while (true) {
  let query = filesCollection.limit(PAGE_SIZE);
  if (lastDoc) {
    query = query.startAfter(lastDoc);
  }

  const snapshot = await query.get();
  if (snapshot.empty) break;

  allFiles.push(...snapshot.docs);
  lastDoc = snapshot.docs[snapshot.docs.length - 1];

  if (snapshot.docs.length < PAGE_SIZE) break;
}
```

**Impact:** Ensures all data is processed.

---

### 15. Inconsistent Error Handling Patterns

**Issue:** Some functions have error handling, others don't.

**Current State:**
- ✅ `newsdataio.ts:33-68` - Has try/catch with logging
- ✅ `holidays.ts:37-54` - Has try/catch with logging
- ❌ `news.ts` - No error handling
- ❌ `weather.ts` - No error handling
- ❌ `files.ts` - No error handling

**Recommendation:** Standardize all functions to follow this pattern:
```typescript
export const utilFunction = async () => {
  try {
    logger.info("Starting [operation name]");

    // Validate environment variables
    const apiKey = process.env.REQUIRED_KEY;
    if (!apiKey) {
      throw new Error("REQUIRED_KEY not set");
    }

    // Main logic here

    logger.info("Completed [operation name] successfully");
  } catch (error) {
    logger.error("Error in [operation name]", {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined
    });
    throw error; // Re-throw to mark Cloud Function as failed
  }
};
```

**Impact:** Consistent monitoring, easier debugging, proper alerting.

---

## Implementation Priority

1. **Immediate (Security & Correctness):**
   - #2: Remove API key logging
   - #1: Add error handling to all functions
   - #3: Fix file cleanup race condition

2. **Short Term (Code Quality):**
   - #4: Extract duplicate filtering logic
   - #5: Create constants file
   - #6: Simplify parseDate
   - #8: Add input validation

3. **Medium Term (Performance & Maintainability):**
   - #7: Optimize Firestore operations
   - #9: Add API response validation
   - #11: Remove unused code
   - #15: Standardize error handling

4. **Long Term (Testing & Robustness):**
   - #13: Add unit tests
   - #12: Standardize imports
   - #14: Handle pagination

---

## Notes

- All changes should be tested in the Firebase emulator before deployment
- Consider creating feature branches for each major improvement
- Update CLAUDE.md after implementing significant architectural changes

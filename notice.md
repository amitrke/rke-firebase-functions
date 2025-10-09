[
  {
    "insertId": "689135a0000d6dc07b97c694",
    "httpRequest": {
      "requestMethod": "POST",
      "requestUrl": "https://us-east1-rkeorg.cloudfunctions.net/updateHolidays",
      "requestSize": "1256",
      "status": 200,
      "responseSize": "97",
      "userAgent": "Google-Cloud-Scheduler",
      "remoteIp": "34.116.28.103",
      "serverIp": "216.239.36.54",
      "latency": "1.071604090s",
      "protocol": "HTTP/1.1"
    },
    "resource": {
      "type": "cloud_run_revision",
      "labels": {
        "revision_name": "updateholidays-00006-taj",
        "configuration_name": "updateholidays",
        "location": "us-east1",
        "service_name": "updateholidays",
        "project_id": "rkeorg"
      }
    },
    "timestamp": "2025-08-04T22:35:11.792963Z",
    "severity": "INFO",
    "labels": {
      "deployment-scheduled": "true",
      "firebase-functions-hash": "c547b7203e2219e66db53bc310eba8d260029d88",
      "goog-managed-by": "cloudfunctions",
      "goog-drz-cloudfunctions-id": "updateholidays",
      "goog-drz-cloudfunctions-location": "us-east1",
      "instanceId": "0069c7a988cd1ba96c9084c2ad8f5df23de8a6d41c1b5d11996f7fa1ecf9206dbc82784ec9bd57373f0570c9827adfb016ab18d02ad1d33f29ee88e1753206a660572916ff0dd916932821449ae9"
    },
    "logName": "projects/rkeorg/logs/run.googleapis.com%2Frequests",
    "trace": "projects/rkeorg/traces/a9702259332576235705ce11250a415f",
    "receiveTimestamp": "2025-08-04T22:35:12.884370864Z",
    "spanId": "38b22698ea415c72",
    "traceSampled": true
  },
  {
    "textPayload": "Verifying API Key. First 5 chars: fwybN",
    "insertId": "6891359f000cc71fb2695981",
    "resource": {
      "type": "cloud_run_revision",
      "labels": {
        "project_id": "rkeorg",
        "location": "us-east1",
        "revision_name": "updateholidays-00006-taj",
        "configuration_name": "updateholidays",
        "service_name": "updateholidays"
      }
    },
    "timestamp": "2025-08-04T22:35:11.837407Z",
    "severity": "INFO",
    "labels": {
      "goog-managed-by": "cloudfunctions",
      "goog-drz-cloudfunctions-id": "updateholidays",
      "instanceId": "0069c7a988cd1ba96c9084c2ad8f5df23de8a6d41c1b5d11996f7fa1ecf9206dbc82784ec9bd57373f0570c9827adfb016ab18d02ad1d33f29ee88e1753206a660572916ff0dd916932821449ae9",
      "execution_id": "xouslitobmxs",
      "goog-drz-cloudfunctions-location": "us-east1",
      "deployment-scheduled": "true",
      "run.googleapis.com/base_image_versions": "us-docker.pkg.dev/serverless-runtimes/google-22-full/runtimes/nodejs20:nodejs20_20250727_20_19_4_RC00",
      "firebase-functions-hash": "c547b7203e2219e66db53bc310eba8d260029d88"
    },
    "logName": "projects/rkeorg/logs/run.googleapis.com%2Fstdout",
    "trace": "projects/rkeorg/traces/a9702259332576235705ce11250a415f",
    "receiveTimestamp": "2025-08-04T22:35:11.839934993Z",
    "spanId": "4085370250185497714"
  },
  {
    "textPayload": "Error fetching holidays Error: Value for argument \"documentPath\" must point to a document, but was \"2025-02-26-maha-shivaratri/shivaratri\". Your path does not contain an even number of components.\n    at CollectionReference.doc (/layers/google.nodejs.yarn/yarn_modules/node_modules/@google-cloud/firestore/build/src/reference/collection-reference.js:188:19)\n    at /workspace/lib/holidays.js:56:32\n    at Array.map (<anonymous>)\n    at saveHolidays (/workspace/lib/holidays.js:52:30)\n    at updateHolidaysUtil (/workspace/lib/holidays.js:80:19)\n    at process.processTicksAndRejections (node:internal/process/task_queues:95:5)\n    at async httpFunc (/layers/google.nodejs.yarn/yarn_modules/node_modules/firebase-functions/lib/v2/providers/scheduler.js:68:13)",
    "insertId": "689135a0000d65524ba38237",
    "resource": {
      "type": "cloud_run_revision",
      "labels": {
        "project_id": "rkeorg",
        "revision_name": "updateholidays-00006-taj",
        "service_name": "updateholidays",
        "configuration_name": "updateholidays",
        "location": "us-east1"
      }
    },
    "timestamp": "2025-08-04T22:35:12.877906Z",
    "severity": "ERROR",
    "labels": {
      "firebase-functions-hash": "c547b7203e2219e66db53bc310eba8d260029d88",
      "run.googleapis.com/base_image_versions": "us-docker.pkg.dev/serverless-runtimes/google-22-full/runtimes/nodejs20:nodejs20_20250727_20_19_4_RC00",
      "goog-drz-cloudfunctions-id": "updateholidays",
      "goog-managed-by": "cloudfunctions",
      "goog-drz-cloudfunctions-location": "us-east1",
      "execution_id": "xouslitobmxs",
      "deployment-scheduled": "true",
      "instanceId": "0069c7a988cd1ba96c9084c2ad8f5df23de8a6d41c1b5d11996f7fa1ecf9206dbc82784ec9bd57373f0570c9827adfb016ab18d02ad1d33f29ee88e1753206a660572916ff0dd916932821449ae9"
    },
    "logName": "projects/rkeorg/logs/run.googleapis.com%2Fstderr",
    "trace": "projects/rkeorg/traces/a9702259332576235705ce11250a415f",
    "receiveTimestamp": "2025-08-04T22:35:12.880883029Z",
    "spanId": "4085370250185497714",
    "errorGroups": [
      {
        "id": "CMqxq6qct_a6iAE"
      }
    ]
  }
]
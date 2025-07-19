# Fix for reCAPTCHA Permissions Error

You are seeing this file because your project is missing the required permissions for reCAPTCHA Enterprise, which is used by Firebase Authentication to protect your app from abuse.

This is a configuration issue in your Google Cloud project, not a bug in the code. Please follow these steps to resolve it:

## Instructions to Fix

1.  **Go to the Google Cloud Console API Library for your project.** You can use this direct link (make sure you are logged into the correct Google account and have the correct project selected):
    
    [https://console.cloud.google.com/apis/library/recaptchaenterprise.googleapis.com](https://console.cloud.google.com/apis/library/recaptchaenterprise.googleapis.com)

2.  **Enable the API**: If the "reCAPTCHA Enterprise API" is not already enabled, click the **"Enable"** button.

3.  **Wait a minute**: It can sometimes take a minute or two for the permission changes to apply across all Google Cloud services.

After following these steps, the permission errors should be resolved, and your application should work as expected. You can safely delete this file after the issue is fixed.

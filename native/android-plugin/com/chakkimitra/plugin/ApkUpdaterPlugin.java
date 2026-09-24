package com.chakkimitra.plugin;

import android.content.Context;
import android.content.Intent;
import android.net.Uri;
import android.os.Environment;
import android.util.Log;

import androidx.core.content.FileProvider;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import java.io.File;
import java.io.FileOutputStream;
import java.io.InputStream;
import java.net.HttpURLConnection;
import java.net.URL;

@CapacitorPlugin(name = "ApkUpdater")
public class ApkUpdaterPlugin extends Plugin {

    private static final String TAG = "ApkUpdater";
    private volatile boolean isDownloading = false;

    @PluginMethod
    public void downloadAndInstall(PluginCall call) {
        try {
            String url = call.getString("url");
            String filename = call.getString("filename", "chakki-mitra-update.apk");
            if (url == null || url.isEmpty()) {
                call.reject("URL is required");
                return;
            }
            if (filename == null || filename.isEmpty()) filename = "chakki-mitra-update.apk";
            // Path traversal guard — sirf plain filename
            filename = new File(filename).getName();
            if (isDownloading) {
                call.reject("Download already in progress");
                return;
            }

            Context ctx = getContext();
            if (ctx == null) {
                call.reject("App context not ready. Dobara try karo.");
                return;
            }

            // External storage kabhi null ho sakta hai (unmounted devices) —
            // NPE = app crash, isliye internal fallback
            File baseDir = ctx.getExternalFilesDir(Environment.DIRECTORY_DOWNLOADS);
            if (baseDir == null) {
                Log.w(TAG, "External dir null, internal fallback use ho raha hai");
                baseDir = new File(ctx.getFilesDir(), "Download");
            }
            if (!baseDir.exists() && !baseDir.mkdirs()) {
                call.reject("Storage not available. Dobara try karo.");
                return;
            }

            isDownloading = true;
            File destinationFile = new File(baseDir, filename);
            if (destinationFile.exists()) destinationFile.delete();

            Log.d(TAG, "Download started: " + url);
            new Thread(() -> downloadFile(url, destinationFile)).start();

            // NOTE: turant resolve — asli download background mein hota hai.
            // Progress listeners ko turant remove mat karna — unhe
            // onDownloadComplete / onDownloadError events ke andar hi cleanup karo.
            JSObject ret = new JSObject();
            ret.put("status", "downloading");
            call.resolve(ret);
        } catch (Exception e) {
            Log.e(TAG, "downloadAndInstall failed", e);
            isDownloading = false;
            call.reject("Download shuru nahi ho paya: " + e.getMessage());
        }
    }

    private void downloadFile(String url, File destinationFile) {
        HttpURLConnection connection = null;
        InputStream inputStream = null;
        FileOutputStream outputStream = null;
        try {
            connection = (HttpURLConnection) new URL(url).openConnection();
            connection.setConnectTimeout(15000);
            connection.setReadTimeout(30000);
            connection.setRequestMethod("GET");
            connection.setInstanceFollowRedirects(true);
            connection.connect();

            int responseCode = connection.getResponseCode();

            // Manual redirect handling (safety net — CDN/redirect ke liye)
            if (responseCode == 301 || responseCode == 302 || responseCode == 303
                    || responseCode == 307 || responseCode == 308) {
                String newUrl = connection.getHeaderField("Location");
                connection.disconnect();
                if (newUrl != null && !newUrl.isEmpty()) {
                    connection = (HttpURLConnection) new URL(newUrl).openConnection();
                    connection.setConnectTimeout(15000);
                    connection.setReadTimeout(30000);
                    connection.connect();
                    responseCode = connection.getResponseCode();
                }
            }

            if (responseCode < 200 || responseCode >= 300) {
                notifyError("Server error (HTTP " + responseCode + ")");
                isDownloading = false;
                return;
            }

            int totalSize = connection.getContentLength();
            inputStream = connection.getInputStream();
            outputStream = new FileOutputStream(destinationFile);

            byte[] buffer = new byte[8192];
            long downloaded = 0;
            int bytesRead;
            int lastProgress = 0;

            while ((bytesRead = inputStream.read(buffer)) != -1) {
                outputStream.write(buffer, 0, bytesRead);
                downloaded += bytesRead;
                if (totalSize > 0) {
                    int progress = (int) ((downloaded * 100L) / totalSize);
                    if (progress > lastProgress) {
                        lastProgress = progress;
                        JSObject ret = new JSObject();
                        ret.put("progress", progress);
                        ret.put("downloaded", downloaded);
                        ret.put("total", totalSize);
                        notifyProgressSafe(ret);
                    }
                }
            }
            outputStream.flush();
            outputStream.close();
            outputStream = null;
            inputStream.close();
            inputStream = null;

            // Validation: chhota file = galat download (404/HTML page)
            if (destinationFile.length() < 1000) {
                destinationFile.delete();
                notifyError("Downloaded file is invalid. Please try again.");
                isDownloading = false;
                return;
            }

            Log.d(TAG, "Download complete: " + destinationFile.length() + " bytes");
            JSObject ret = new JSObject();
            ret.put("status", "completed");
            notifyCompleteSafe(ret);

            launchInstaller(destinationFile);
            isDownloading = false;

        } catch (Exception e) {
            Log.e(TAG, "Download failed", e);
            if (destinationFile.exists()) destinationFile.delete();
            String message;
            if (e instanceof java.net.UnknownHostException) message = "No internet connection.";
            else if (e instanceof java.net.SocketTimeoutException) message = "Connection timed out.";
            else message = "Download failed: " + e.getMessage();
            notifyError(message);
            isDownloading = false;
        } finally {
            try { if (inputStream != null) inputStream.close(); } catch (Exception ignored) {}
            try { if (outputStream != null) outputStream.close(); } catch (Exception ignored) {}
            if (connection != null) connection.disconnect();
        }
    }

    private void launchInstaller(File apkFile) {
        try {
            Uri apkUri = FileProvider.getUriForFile(
                    getContext(), getContext().getPackageName() + ".fileprovider", apkFile);
            Intent intent = new Intent(Intent.ACTION_VIEW);
            intent.setDataAndType(apkUri, "application/vnd.android.package-archive");
            intent.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);
            intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            getContext().startActivity(intent);
        } catch (Exception e) {
            Log.e(TAG, "Installer launch failed", e);
            notifyError("Download complete but installer failed. File saved at: " + apkFile.getAbsolutePath());
        }
    }

    private void notifyError(String message) {
        try {
            JSObject ret = new JSObject();
            ret.put("message", message);
            notifyListeners("onDownloadError", ret);
        } catch (Exception e) {
            Log.e(TAG, "notifyError failed", e);
        }
    }

    private void notifyProgressSafe(JSObject data) {
        try {
            notifyListeners("onDownloadProgress", data);
        } catch (Exception e) {
            Log.e(TAG, "notifyProgress failed", e);
        }
    }

    private void notifyCompleteSafe(JSObject data) {
        try {
            notifyListeners("onDownloadComplete", data);
        } catch (Exception e) {
            Log.e(TAG, "notifyComplete failed", e);
        }
    }
}

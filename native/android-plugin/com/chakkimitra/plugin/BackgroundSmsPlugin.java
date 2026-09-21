package com.chakkimitra.plugin;

import android.Manifest;
import android.content.Context;
import android.content.pm.PackageManager;
import android.telephony.SmsManager;
import android.telephony.SubscriptionInfo;
import android.telephony.SubscriptionManager;
import android.util.Log;

import androidx.core.content.ContextCompat;

import com.getcapacitor.JSObject;
import com.getcapacitor.PermissionState;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.annotation.Permission;
import com.getcapacitor.annotation.PermissionCallback;

import java.util.List;

@CapacitorPlugin(
    name = "BackgroundSms",
    permissions = {
        @Permission(
            strings = { Manifest.permission.SEND_SMS },
            alias = "sms"
        )
    }
)
public class BackgroundSmsPlugin extends Plugin {

    private static final String TAG = "BackgroundSms";

    @PluginMethod
    public void sendSms(PluginCall call) {
        String phoneNumber = call.getString("phoneNumber");
        String message = call.getString("message");

        Log.d(TAG, "sendSms called - phone: " + phoneNumber + " msg length: " + (message != null ? message.length() : 0));

        if (phoneNumber == null || phoneNumber.isEmpty()) {
            call.reject("Phone number is required");
            return;
        }
        if (message == null || message.isEmpty()) {
            call.reject("Message is required");
            return;
        }

        phoneNumber = cleanPhoneNumber(phoneNumber);
        Log.d(TAG, "Cleaned phone: " + phoneNumber);

        if (phoneNumber.length() < 10) {
            call.reject("Invalid phone number: too short after cleaning - got: " + phoneNumber);
            return;
        }

        if (getPermissionState("sms") != PermissionState.GRANTED) {
            Log.d(TAG, "Permission not granted, requesting...");
            requestPermissionForAlias("sms", call, "smsPermissionCallback");
            return;
        }

        Log.d(TAG, "Permission already granted, sending directly");
        sendSmsInternal(call, phoneNumber, message);
    }

    @PermissionCallback
    private void smsPermissionCallback(PluginCall call) {
        if (call == null) {
            Log.e(TAG, "Permission callback: call is null");
            return;
        }

        Log.d(TAG, "Permission callback received");
        PermissionState state = getPermissionState("sms");
        Log.d(TAG, "Permission state after callback: " + state);

        if (state == PermissionState.GRANTED) {
            String phone = call.getString("phoneNumber");
            String msg = call.getString("message");
            Log.d(TAG, "Permission granted, phone from call: " + phone);
            if (phone != null) phone = cleanPhoneNumber(phone);
            sendSmsInternal(call, phone, msg);
        } else {
            Log.e(TAG, "Permission denied by user");
            call.reject("SMS permission denied. Please enable it in Settings → Apps → चक्की मित्र → Permissions → SMS.");
        }
    }

    @PluginMethod
    public void checkPermission(PluginCall call) {
        JSObject ret = new JSObject();
        boolean granted = getPermissionState("sms") == PermissionState.GRANTED;
        ret.put("granted", granted);
        Log.d(TAG, "checkPermission: " + granted);
        call.resolve(ret);
    }

    private String cleanPhoneNumber(String phone) {
        phone = phone.replaceAll("[\\s\\-\\(\\)\\.]", "");
        // Only strip +91, 0 prefix — NOT bare "91" since valid 10-digit
        // Indian numbers can start with 91 (e.g. 9123456789)
        phone = phone.replaceAll("^\\+91", "");
        phone = phone.replaceAll("^0", "");
        return phone;
    }

    private void sendSmsInternal(PluginCall call, String phoneNumber, String message) {
        try {
            Log.d(TAG, "sendSmsInternal: to=" + phoneNumber + " len=" + message.length());

            SmsManager smsManager = SmsManager.getDefault();

            boolean isUnicode = !java.nio.charset.StandardCharsets.US_ASCII.newEncoder().canEncode(message);
            Log.d(TAG, "Unicode: " + isUnicode + " msgLen: " + message.length());

            if (isUnicode || message.length() > 70) {
                java.util.ArrayList<String> parts;
                if (isUnicode) {
                    int maxLen = 67;
                    parts = new java.util.ArrayList<>();
                    String remaining = message;
                    while (remaining.length() > 0) {
                        if (remaining.length() <= maxLen) {
                            parts.add(remaining);
                            break;
                        }
                        parts.add(remaining.substring(0, maxLen));
                        remaining = remaining.substring(maxLen);
                    }
                } else {
                    parts = smsManager.divideMessage(message);
                }
                Log.d(TAG, "Multipart SMS: " + parts.size() + " parts");
                smsManager.sendMultipartTextMessage(phoneNumber, null, parts, null, null);
            } else {
                Log.d(TAG, "Single SMS");
                smsManager.sendTextMessage(phoneNumber, null, message, null, null);
            }

            JSObject ret = new JSObject();
            ret.put("success", true);
            ret.put("message", "SMS sent successfully");
            ret.put("to", phoneNumber);
            call.resolve(ret);

            Log.d(TAG, "SMS sent successfully to: " + phoneNumber);
        } catch (Exception e) {
            Log.e(TAG, "Failed to send SMS", e);
            call.reject("Failed to send SMS: " + e.getClass().getSimpleName() + ": " + e.getMessage());
        }
    }
}

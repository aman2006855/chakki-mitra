package com.chakkimitra.plugin;

import android.Manifest;
import android.app.Activity;
import android.content.Context;
import android.content.pm.PackageManager;
import android.telephony.SmsManager;
import android.util.Log;

import androidx.core.app.ActivityCompat;
import androidx.core.content.ContextCompat;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.annotation.Permission;
import com.getcapacitor.annotation.PermissionCallback;

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
    private static final int SMS_SEND_REQUEST = 1001;
    private PluginCall pendingCall;

    @PluginMethod
    public void sendSms(PluginCall call) {
        String phoneNumber = call.getString("phoneNumber");
        String message = call.getString("message");

        if (phoneNumber == null || phoneNumber.isEmpty()) {
            call.reject("Phone number is required");
            return;
        }
        if (message == null || message.isEmpty()) {
            call.reject("Message is required");
            return;
        }

        if (!hasSmsPermission()) {
            pendingCall = call;
            requestPermissionForAlias("sms", "smsCallback", null);
            return;
        }

        sendSmsInternal(call, phoneNumber, message);
    }

    @PermissionCallback
    private void smsCallback(PluginCall call) {
        if (call == null) {
            call = pendingCall;
            pendingCall = null;
        }
        if (call == null) return;

        if (hasSmsPermission()) {
            String phoneNumber = call.getString("phoneNumber");
            String message = call.getString("message");
            sendSmsInternal(call, phoneNumber, message);
        } else {
            call.reject("SMS permission denied. Please enable it in Settings.");
        }
    }

    @PluginMethod
    public void checkPermission(PluginCall call) {
        JSObject ret = new JSObject();
        ret.put("granted", hasSmsPermission());
        call.resolve(ret);
    }

    private boolean hasSmsPermission() {
        Context context = getContext();
        return ContextCompat.checkSelfPermission(context, Manifest.permission.SEND_SMS)
                == PackageManager.PERMISSION_GRANTED;
    }

    private void sendSmsInternal(PluginCall call, String phoneNumber, String message) {
        try {
            SmsManager smsManager = SmsManager.getDefault();

            if (message.length() > 160) {
                java.util.ArrayList<String> parts = smsManager.divideMessage(message);
                smsManager.sendMultipartTextMessage(phoneNumber, null, parts, null, null);
            } else {
                smsManager.sendTextMessage(phoneNumber, null, message, null, null);
            }

            JSObject ret = new JSObject();
            ret.put("success", true);
            ret.put("message", "SMS sent successfully");
            ret.put("to", phoneNumber);
            call.resolve(ret);

            Log.d(TAG, "SMS sent to: " + phoneNumber);
        } catch (Exception e) {
            Log.e(TAG, "Failed to send SMS", e);
            call.reject("Failed to send SMS: " + e.getMessage());
        }
    }
}

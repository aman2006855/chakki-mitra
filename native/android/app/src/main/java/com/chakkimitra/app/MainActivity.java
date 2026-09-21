package com.chakkimitra.app;

import android.os.Bundle;

import com.getcapacitor.BridgeActivity;
import com.chakkimitra.plugin.BackgroundSmsPlugin;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(BackgroundSmsPlugin.class);
        super.onCreate(savedInstanceState);
    }
}

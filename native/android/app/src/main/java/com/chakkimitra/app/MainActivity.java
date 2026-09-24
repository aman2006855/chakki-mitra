package com.chakkimitra.app;

import android.os.Bundle;

import com.getcapacitor.BridgeActivity;
import com.chakkimitra.plugin.BackgroundSmsPlugin;
import com.chakkimitra.plugin.ApkUpdaterPlugin;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(BackgroundSmsPlugin.class);
        registerPlugin(ApkUpdaterPlugin.class);
        super.onCreate(savedInstanceState);
    }
}

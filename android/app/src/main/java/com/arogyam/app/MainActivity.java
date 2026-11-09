package com.arogyam.app;

import android.os.Bundle;
import android.webkit.WebSettings;
import android.webkit.WebView;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        configureWebViewAudio();
    }

    @Override
    public void onStart() {
        super.onStart();
        configureWebViewAudio();
    }

    private void configureWebViewAudio() {
        try {
            if (getBridge() != null && getBridge().getWebView() != null) {
                WebView webView = getBridge().getWebView();
                WebSettings settings = webView.getSettings();
                settings.setMediaPlaybackRequiresUserGesture(false);
            }
        } catch (Exception ignored) {
        }
    }
}


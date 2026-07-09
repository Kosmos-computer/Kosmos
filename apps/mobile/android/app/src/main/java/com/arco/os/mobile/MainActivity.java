package com.arco.os.mobile;

import android.content.pm.ApplicationInfo;
import android.net.http.SslError;
import android.webkit.SslErrorHandler;
import android.webkit.WebSettings;
import android.webkit.WebView;
import com.getcapacitor.BridgeActivity;
import com.getcapacitor.BridgeWebViewClient;

/**
 * Debug builds accept the Vite dev server's self-signed HTTPS cert (dev:chromebook).
 * Release builds use the default strict SSL validation.
 */
public class MainActivity extends BridgeActivity {

  @Override
  public void onStart() {
    super.onStart();
    if (this.bridge == null || !isDebuggable()) {
      return;
    }

    WebView webView = this.bridge.getWebView();
    webView.getSettings().setMixedContentMode(WebSettings.MIXED_CONTENT_ALWAYS_ALLOW);
    webView.setWebViewClient(
        new BridgeWebViewClient(this.bridge) {
          @Override
          public void onReceivedSslError(WebView view, SslErrorHandler handler, SslError error) {
            handler.proceed();
          }
        });
  }

  private boolean isDebuggable() {
    return (getApplicationInfo().flags & ApplicationInfo.FLAG_DEBUGGABLE) != 0;
  }
}

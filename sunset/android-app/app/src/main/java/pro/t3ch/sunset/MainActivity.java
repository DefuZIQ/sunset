package pro.t3ch.sunset;

import android.content.ActivityNotFoundException;
import android.content.ClipData;
import android.content.Intent;
import android.graphics.Color;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.speech.RecognizerIntent;
import android.view.Gravity;
import android.view.View;
import android.view.ViewGroup;
import android.view.WindowInsets;
import android.webkit.CookieManager;
import android.webkit.PermissionRequest;
import android.webkit.SslErrorHandler;
import android.net.http.SslError;
import android.webkit.ValueCallback;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceError;
import android.webkit.WebResourceRequest;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.Button;
import android.widget.FrameLayout;
import android.widget.LinearLayout;
import android.widget.ProgressBar;
import android.widget.TextView;
import android.widget.Toast;

import org.json.JSONObject;

import androidx.activity.ComponentActivity;
import androidx.activity.OnBackPressedCallback;

import java.util.ArrayList;
import java.util.Locale;

public final class MainActivity extends ComponentActivity {
    private static final String HOME_URL = "https://t3ch.pro/";
    private static final int PHOTO_REQUEST = 1001;
    private static final int VOICE_REQUEST = 1002;

    private WebView webView;
    private ProgressBar progressBar;
    private LinearLayout errorPanel;
    private ValueCallback<Uri[]> photoCallback;
    private OnBackPressedCallback backCallback;
    private boolean mainFrameFailed;

    @Override
    protected void onCreate(Bundle state) {
        super.onCreate(state);
        getWindow().setStatusBarColor(Color.rgb(33, 26, 23));
        getWindow().setNavigationBarColor(Color.rgb(33, 26, 23));

        FrameLayout root = new FrameLayout(this);
        root.setBackgroundColor(Color.rgb(247, 237, 227));
        if (Build.VERSION.SDK_INT >= 35) {
            root.setOnApplyWindowInsetsListener((view, insets) -> {
                android.graphics.Insets bars = insets.getInsets(WindowInsets.Type.systemBars());
                view.setPadding(bars.left, bars.top, bars.right, bars.bottom);
                return insets;
            });
        }

        webView = new WebView(this);
        webView.setBackgroundColor(Color.rgb(247, 237, 227));
        webView.getSettings().setJavaScriptEnabled(true);
        webView.getSettings().setDomStorageEnabled(true);
        webView.getSettings().setAllowFileAccess(false);
        webView.getSettings().setAllowContentAccess(true);
        webView.getSettings().setMixedContentMode(android.webkit.WebSettings.MIXED_CONTENT_NEVER_ALLOW);
        webView.getSettings().setSafeBrowsingEnabled(true);
        webView.getSettings().setMediaPlaybackRequiresUserGesture(true);
        webView.getSettings().setUserAgentString(
            webView.getSettings().getUserAgentString() + " SunsetAndroidApp/1.0");
        CookieManager.getInstance().setAcceptCookie(true);
        CookieManager.getInstance().setAcceptThirdPartyCookies(webView, false);
        WebView.setWebContentsDebuggingEnabled(false);
        backCallback = new OnBackPressedCallback(false) {
            @Override
            public void handleOnBackPressed() {
                webView.goBack();
            }
        };
        getOnBackPressedDispatcher().addCallback(this, backCallback);

        webView.setWebViewClient(new WebViewClient() {
            @Override
            public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
                if (!request.isForMainFrame()) return false;
                return handleNavigation(request.getUrl());
            }

            @Override
            public void onPageStarted(WebView view, String url, android.graphics.Bitmap favicon) {
                if (!isTrustedUrl(Uri.parse(url))) {
                    view.stopLoading();
                    showError();
                    return;
                }
                mainFrameFailed = false;
                errorPanel.setVisibility(View.GONE);
                webView.setVisibility(View.VISIBLE);
            }

            @Override
            public void onReceivedError(WebView view, WebResourceRequest request, WebResourceError error) {
                if (request.isForMainFrame()) showError();
            }

            @Override
            public void onReceivedHttpError(WebView view, WebResourceRequest request,
                                            android.webkit.WebResourceResponse response) {
                if (request.isForMainFrame() && response.getStatusCode() >= 500) showError();
            }

            @Override
            public void onReceivedSslError(WebView view, SslErrorHandler handler, SslError error) {
                handler.cancel();
                if (error.getUrl() != null && error.getUrl().startsWith(HOME_URL)) showError();
            }

            @Override
            public void onPageFinished(WebView view, String url) {
                progressBar.setVisibility(View.GONE);
                if (!mainFrameFailed) webView.setVisibility(View.VISIBLE);
                backCallback.setEnabled(view.canGoBack());
            }

            @Override
            public void doUpdateVisitedHistory(WebView view, String url, boolean isReload) {
                backCallback.setEnabled(view.canGoBack());
            }
        });

        webView.setWebChromeClient(new WebChromeClient() {
            @Override
            public void onProgressChanged(WebView view, int progress) {
                progressBar.setProgress(progress);
                progressBar.setVisibility(progress >= 100 || mainFrameFailed ? View.GONE : View.VISIBLE);
            }

            @Override
            public boolean onShowFileChooser(WebView view, ValueCallback<Uri[]> callback,
                                             FileChooserParams params) {
                if (photoCallback != null) photoCallback.onReceiveValue(null);
                photoCallback = callback;
                Intent picker = new Intent(Intent.ACTION_OPEN_DOCUMENT);
                picker.addCategory(Intent.CATEGORY_OPENABLE);
                picker.setType("image/*");
                picker.putExtra(Intent.EXTRA_ALLOW_MULTIPLE,
                    params.getMode() == FileChooserParams.MODE_OPEN_MULTIPLE);
                try {
                    startActivityForResult(picker, PHOTO_REQUEST);
                } catch (ActivityNotFoundException exception) {
                    photoCallback.onReceiveValue(null);
                    photoCallback = null;
                    Toast.makeText(MainActivity.this, "Галерея недоступна", Toast.LENGTH_SHORT).show();
                }
                return true;
            }

            @Override
            public void onPermissionRequest(PermissionRequest request) {
                // No remote page receives direct camera/microphone access.
                request.deny();
            }
        });

        root.addView(webView, new FrameLayout.LayoutParams(
            ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.MATCH_PARENT));
        errorPanel = createErrorPanel();
        root.addView(errorPanel, new FrameLayout.LayoutParams(
            ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.MATCH_PARENT));
        errorPanel.setVisibility(View.GONE);
        progressBar = new ProgressBar(this, null, android.R.attr.progressBarStyleHorizontal);
        progressBar.setIndeterminate(false);
        progressBar.setMax(100);
        progressBar.setProgressTintList(android.content.res.ColorStateList.valueOf(Color.rgb(157, 104, 77)));
        FrameLayout.LayoutParams progressLayout = new FrameLayout.LayoutParams(
            ViewGroup.LayoutParams.MATCH_PARENT, dp(3), Gravity.TOP);
        root.addView(progressBar, progressLayout);
        progressBar.setVisibility(View.GONE);
        setContentView(root);

        if (state != null) webView.restoreState(state);
        else webView.loadUrl(HOME_URL);
    }

    private LinearLayout createErrorPanel() {
        LinearLayout panel = new LinearLayout(this);
        panel.setOrientation(LinearLayout.VERTICAL);
        panel.setGravity(Gravity.CENTER);
        panel.setPadding(dp(32), dp(32), dp(32), dp(32));
        panel.setBackgroundColor(Color.rgb(247, 237, 227));

        TextView mark = new TextView(this);
        mark.setText("☀");
        mark.setTextSize(48);
        mark.setTextColor(Color.rgb(157, 104, 77));
        panel.addView(mark);

        TextView title = new TextView(this);
        title.setText(R.string.connection_error_title);
        title.setTextSize(22);
        title.setTextColor(Color.rgb(33, 26, 23));
        title.setGravity(Gravity.CENTER);
        LinearLayout.LayoutParams titleLayout = new LinearLayout.LayoutParams(
            ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT);
        titleLayout.topMargin = dp(16);
        panel.addView(title, titleLayout);

        TextView description = new TextView(this);
        description.setText(R.string.connection_error_description);
        description.setTextSize(15);
        description.setTextColor(Color.rgb(96, 79, 70));
        description.setGravity(Gravity.CENTER);
        LinearLayout.LayoutParams descriptionLayout = new LinearLayout.LayoutParams(
            ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT);
        descriptionLayout.topMargin = dp(10);
        panel.addView(description, descriptionLayout);

        Button retry = new Button(this);
        retry.setText(R.string.retry);
        retry.setOnClickListener(view -> {
            errorPanel.setVisibility(View.GONE);
            webView.setVisibility(View.VISIBLE);
            webView.loadUrl(HOME_URL);
        });
        LinearLayout.LayoutParams retryLayout = new LinearLayout.LayoutParams(
            ViewGroup.LayoutParams.WRAP_CONTENT, ViewGroup.LayoutParams.WRAP_CONTENT);
        retryLayout.topMargin = dp(24);
        panel.addView(retry, retryLayout);
        return panel;
    }

    private boolean handleNavigation(Uri uri) {
        if ("sunset".equals(uri.getScheme()) && "voice".equals(uri.getHost())) {
            if (isCurrentPageTrusted()) startVoiceInput();
            return true;
        }
        if (isTrustedUrl(uri)) return false;
        String scheme = uri.getScheme();
        if ("https".equalsIgnoreCase(scheme) || "mailto".equalsIgnoreCase(scheme)
            || "tel".equalsIgnoreCase(scheme) || "geo".equalsIgnoreCase(scheme)) {
            try { startActivity(new Intent(Intent.ACTION_VIEW, uri)); }
            catch (ActivityNotFoundException exception) {
                Toast.makeText(this, "Не удалось открыть ссылку", Toast.LENGTH_SHORT).show();
            }
        }
        return true;
    }

    private boolean isTrustedUrl(Uri uri) {
        return uri != null && "https".equalsIgnoreCase(uri.getScheme())
            && "t3ch.pro".equalsIgnoreCase(uri.getHost());
    }

    private boolean isCurrentPageTrusted() {
        String current = webView.getUrl();
        return current != null && isTrustedUrl(Uri.parse(current));
    }

    private void startVoiceInput() {
        Intent intent = new Intent(RecognizerIntent.ACTION_RECOGNIZE_SPEECH);
        intent.putExtra(RecognizerIntent.EXTRA_LANGUAGE_MODEL,
            RecognizerIntent.LANGUAGE_MODEL_FREE_FORM);
        intent.putExtra(RecognizerIntent.EXTRA_LANGUAGE, "ru-RU");
        intent.putExtra(RecognizerIntent.EXTRA_PROMPT, "Что вы ищете в SUNSET?");
        try { startActivityForResult(intent, VOICE_REQUEST); }
        catch (ActivityNotFoundException exception) {
            Toast.makeText(this, "Голосовой ввод недоступен на этом устройстве", Toast.LENGTH_LONG).show();
        }
    }

    @Override
    protected void onActivityResult(int requestCode, int resultCode, Intent data) {
        super.onActivityResult(requestCode, resultCode, data);
        if (requestCode == PHOTO_REQUEST) {
            if (photoCallback == null) return;
            ArrayList<Uri> accepted = new ArrayList<>();
            if (resultCode == RESULT_OK && data != null) {
                if (data.getData() != null) addImageUri(accepted, data.getData());
                ClipData selected = data.getClipData();
                if (selected != null) {
                    for (int index = 0; index < selected.getItemCount(); index++) {
                        addImageUri(accepted, selected.getItemAt(index).getUri());
                    }
                }
            }
            photoCallback.onReceiveValue(accepted.isEmpty() ? null : accepted.toArray(new Uri[0]));
            photoCallback = null;
        } else if (requestCode == VOICE_REQUEST && resultCode == RESULT_OK && data != null) {
            ArrayList<String> matches = data.getStringArrayListExtra(RecognizerIntent.EXTRA_RESULTS);
            if (matches != null && !matches.isEmpty() && isCurrentPageTrusted()) {
                webView.evaluateJavascript("window.dispatchEvent(new CustomEvent('sunset-native-voice-result', {detail: "
                    + JSONObject.quote(matches.get(0)) + "}));", null);
            }
        }
    }

    private void addImageUri(ArrayList<Uri> result, Uri uri) {
        if (uri == null || !"content".equalsIgnoreCase(uri.getScheme())) return;
        String type = getContentResolver().getType(uri);
        if (type != null && type.toLowerCase(Locale.ROOT).startsWith("image/")) result.add(uri);
    }

    private void showError() {
        mainFrameFailed = true;
        progressBar.setVisibility(View.GONE);
        webView.setVisibility(View.INVISIBLE);
        errorPanel.setVisibility(View.VISIBLE);
    }

    private int dp(int value) {
        return Math.round(value * getResources().getDisplayMetrics().density);
    }

    @Override
    protected void onPause() {
        super.onPause();
        CookieManager.getInstance().flush();
    }

    @Override
    protected void onSaveInstanceState(Bundle state) {
        webView.saveState(state);
        super.onSaveInstanceState(state);
    }

    @Override
    protected void onDestroy() {
        if (photoCallback != null) photoCallback.onReceiveValue(null);
        webView.destroy();
        super.onDestroy();
    }
}

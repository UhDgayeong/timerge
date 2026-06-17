package com.timerge.app;

import android.os.Bundle;
import androidx.core.view.WindowCompat;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
  @Override
  protected void onCreate(Bundle savedInstanceState) {
    super.onCreate(savedInstanceState);
    // Android 15 edge-to-edge 강제 설정: 시스템 바가 WebView 위로 오버레이되고
    // CSS env(safe-area-inset-*) 값이 WebView에 제대로 전달되도록 한다.
    WindowCompat.setDecorFitsSystemWindows(getWindow(), false);
  }
}

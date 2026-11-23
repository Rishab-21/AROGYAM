package com.arogyam.app;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;

public class WidgetWaterReceiver extends BroadcastReceiver {
    @Override public void onReceive(Context context, Intent intent) {
        SharedPreferences prefs = context.getSharedPreferences("arogyam_widget", Context.MODE_PRIVATE);
        String today = new java.text.SimpleDateFormat("yyyy-MM-dd", java.util.Locale.US).format(new java.util.Date());
        int previous = today.equals(prefs.getString("date", "")) ? prefs.getInt("water", 0) : 0;
        prefs.edit().putInt("water", previous + 250).putString("date", today).apply();
        ArogyamWidgetProvider.refresh(context);
        context.sendBroadcast(new Intent("com.arogyam.app.WATER_UPDATED").setPackage(context.getPackageName()));
    }
}

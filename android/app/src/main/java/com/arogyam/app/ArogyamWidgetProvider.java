package com.arogyam.app;

import android.app.PendingIntent;
import android.appwidget.AppWidgetManager;
import android.appwidget.AppWidgetProvider;
import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.widget.RemoteViews;

public class ArogyamWidgetProvider extends AppWidgetProvider {
    @Override public void onUpdate(Context context, AppWidgetManager manager, int[] ids) { update(context, manager, ids); }

    static void update(Context context, AppWidgetManager manager, int[] ids) {
        SharedPreferences prefs = context.getSharedPreferences("arogyam_widget", Context.MODE_PRIVATE);
        String today = new java.text.SimpleDateFormat("yyyy-MM-dd", java.util.Locale.US).format(new java.util.Date());
        boolean sameDay = today.equals(prefs.getString("date", ""));
        int steps = sameDay ? prefs.getInt("steps", 0) : 0;
        int water = sameDay ? prefs.getInt("water", 0) : 0;
        int stepGoal = prefs.getInt("stepGoal", 0);
        int waterGoal = prefs.getInt("waterGoal", 0);
        for (int id : ids) {
            RemoteViews views = new RemoteViews(context.getPackageName(), R.layout.arogyam_widget);
            views.setTextViewText(R.id.widget_steps, String.format(java.util.Locale.getDefault(), "%,d", steps));
            views.setTextViewText(R.id.widget_water, water + " ml");
            views.setTextViewText(R.id.widget_step_goal, stepGoal > 0 ? "of " + String.format(java.util.Locale.getDefault(), "%,d", stepGoal) + " steps" : "steps today");
            views.setTextViewText(R.id.widget_water_goal, waterGoal > 0 ? "of " + waterGoal + " ml" : "water today");
            Intent addWater = new Intent(context, WidgetWaterReceiver.class).setAction("com.arogyam.app.ADD_WATER").putExtra(AppWidgetManager.EXTRA_APPWIDGET_ID, id);
            PendingIntent waterIntent = PendingIntent.getBroadcast(context, id, addWater, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
            views.setOnClickPendingIntent(R.id.widget_add_water, waterIntent);
            Intent openApp = context.getPackageManager().getLaunchIntentForPackage(context.getPackageName());
            if (openApp != null) {
                PendingIntent openIntent = PendingIntent.getActivity(context, 0, openApp, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
                views.setOnClickPendingIntent(R.id.widget_steps, openIntent);
            }
            manager.updateAppWidget(id, views);
        }
    }

    static void refresh(Context context) {
        AppWidgetManager manager = AppWidgetManager.getInstance(context);
        int[] ids = manager.getAppWidgetIds(new ComponentName(context, ArogyamWidgetProvider.class));
        update(context, manager, ids);
    }
}

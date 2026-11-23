package com.arogyam.app;

import android.Manifest;
import android.content.Context;
import android.content.BroadcastReceiver;
import android.content.Intent;
import android.content.IntentFilter;
import android.content.SharedPreferences;
import android.hardware.Sensor;
import android.hardware.SensorEvent;
import android.hardware.SensorEventListener;
import android.hardware.SensorManager;
import android.os.Build;
import androidx.core.content.ContextCompat;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.annotation.PermissionCallback;

@CapacitorPlugin(name = "PhoneHealth", permissions = {
    @com.getcapacitor.annotation.Permission(alias = "activity", strings = { Manifest.permission.ACTIVITY_RECOGNITION })
})
public class PhoneHealthPlugin extends Plugin implements SensorEventListener {
    private SensorManager sensorManager;
    private Sensor stepSensor;
    private SharedPreferences prefs;
    private BroadcastReceiver waterReceiver;

    @Override
    public void load() {
        sensorManager = (SensorManager) getContext().getSystemService(Context.SENSOR_SERVICE);
        stepSensor = sensorManager == null ? null : sensorManager.getDefaultSensor(Sensor.TYPE_STEP_COUNTER);
        prefs = getContext().getSharedPreferences("arogyam_widget", Context.MODE_PRIVATE);
        waterReceiver = new BroadcastReceiver() {
            @Override public void onReceive(Context context, Intent intent) {
                JSObject result = new JSObject(); result.put("water", prefs.getInt("water", 0));
                notifyListeners("water", result);
            }
        };
        ContextCompat.registerReceiver(getContext(), waterReceiver, new IntentFilter("com.arogyam.app.WATER_UPDATED"), ContextCompat.RECEIVER_NOT_EXPORTED);
    }

    @PluginMethod
    public void start(PluginCall call) {
        if (stepSensor == null) {
            JSObject result = new JSObject(); result.put("steps", 0); result.put("available", false); call.resolve(result); return;
        }
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q && !hasPermission("activity")) {
            requestPermissionForAlias("activity", call, "activityPermissionResult"); return;
        }
        startSensor();
        call.resolve(reading(prefs.getInt("steps", 0)));
    }

    @PermissionCallback
    private void activityPermissionResult(PluginCall call) {
        if (!hasPermission("activity")) { call.reject("Activity recognition permission is needed to count steps."); return; }
        startSensor(); call.resolve(reading(prefs.getInt("steps", 0)));
    }

    @PluginMethod
    public void updateWidget(PluginCall call) {
        prefs.edit()
            .putInt("steps", Math.max(0, call.getInt("steps", 0)))
            .putInt("water", Math.max(0, call.getInt("water", 0)))
            .putInt("stepGoal", Math.max(0, call.getInt("stepGoal", 0)))
            .putInt("waterGoal", Math.max(0, call.getInt("waterGoal", 0)))
            .putString("date", today()).apply();
        refreshWidgets(); call.resolve();
    }

    private void startSensor() {
        if (sensorManager != null && stepSensor != null) sensorManager.registerListener(this, stepSensor, SensorManager.SENSOR_DELAY_NORMAL);
    }

    @Override
    public void onSensorChanged(SensorEvent event) {
        if (event.sensor.getType() != Sensor.TYPE_STEP_COUNTER || event.values.length == 0) return;
        float total = event.values[0];
        String today = today();
        String savedDate = prefs.getString("stepDate", "");
        float baseline = prefs.getFloat("stepBaseline", -1f);
        if (!today.equals(savedDate) || baseline < 0 || total < baseline) {
            baseline = total;
            prefs.edit().putString("stepDate", today).putFloat("stepBaseline", baseline).apply();
        }
        int steps = Math.max(0, Math.round(total - baseline));
        prefs.edit().putInt("steps", steps).putString("date", today).apply();
        JSObject result = reading(steps); result.put("available", true);
        notifyListeners("steps", result);
        refreshWidgets();
    }

    private JSObject reading(int steps) {
        JSObject result = new JSObject();
        boolean available = stepSensor != null;
        String today = today();
        result.put("steps", today.equals(prefs.getString("stepDate", "")) ? steps : 0);
        result.put("water", today.equals(prefs.getString("date", "")) ? prefs.getInt("water", 0) : 0);
        result.put("available", available); return result;
    }

    private String today() { return new java.text.SimpleDateFormat("yyyy-MM-dd", java.util.Locale.US).format(new java.util.Date()); }
    private void refreshWidgets() {
        ArogyamWidgetProvider.refresh(getContext());
    }
    @Override protected void handleOnResume() {
        super.handleOnResume();
        startSensor();
        JSObject reading = reading(prefs.getInt("steps", 0));
        notifyListeners("steps", reading);
        JSObject water = new JSObject(); water.put("water", reading.getInteger("water"));
        notifyListeners("water", water);
    }
    @Override protected void handleOnDestroy() {
        if (waterReceiver != null) getContext().unregisterReceiver(waterReceiver);
        super.handleOnDestroy();
    }
    @Override public void onAccuracyChanged(Sensor sensor, int accuracy) { }
}

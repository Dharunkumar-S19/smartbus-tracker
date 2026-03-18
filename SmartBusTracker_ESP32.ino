#include <WiFi.h>
#include <HTTPClient.h>
#include <HardwareSerial.h>
#include <TinyGPSPlus.h>
#include <ArduinoJson.h>

// Configuration
const char* WIFI_SSID     = "vivo y200e";
const char* WIFI_PASSWORD = "janani04";
const char* SERVER_URL    = "https://smartbus-tracker-z7tn.onrender.com/api/location";
const char* BUS_ID        = "BUS_001";
const int   SEND_INTERVAL = 5000;
const int   LED_PIN       = 2;

// GPS
HardwareSerial gpsSerial(2);
TinyGPSPlus gps;

// Timing
unsigned long lastSendTime = 0;
unsigned long lastBlinkTime = 0;
bool ledState = false;

void blinkLED(int times, int delayMs) {
  for (int i = 0; i < times; i++) {
    digitalWrite(LED_PIN, HIGH);
    delay(delayMs);
    digitalWrite(LED_PIN, LOW);
    delay(delayMs);
  }
}

void connectWiFi() {
  Serial.printf("[WiFi] Connecting to %s", WIFI_SSID);
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
  
  int attempts = 0;
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
    digitalWrite(LED_PIN, !digitalRead(LED_PIN));
    attempts++;
    if (attempts > 40) {
      Serial.println("\n[WiFi] Failed! Restarting...");
      ESP.restart();
    }
  }
  
  digitalWrite(LED_PIN, HIGH);
  Serial.println();
  Serial.printf("[WiFi] Connected! IP: %s\n",
    WiFi.localIP().toString().c_str());
}

bool sendLocation(float lat, float lng, float speed, float altitude, int satellites, float hdop) {
  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("[WiFi] Disconnected! Reconnecting...");
    connectWiFi();
    return false;
  }

  HTTPClient http;
  http.begin(SERVER_URL);
  http.addHeader("Content-Type", "application/json");
  http.setTimeout(10000);

  // Build JSON
  StaticJsonDocument<256> doc;
  doc["bus_id"]          = BUS_ID;
  doc["lat"]             = lat;
  doc["lng"]             = lng;
  doc["speed"]           = speed;
  doc["altitude"]        = altitude;
  doc["satellites"]      = satellites;
  doc["hdop"]            = hdop;
  doc["passenger_count"] = 24; // Static for prototype
  
  // Add timestamp
  char timestamp[30];
  snprintf(timestamp, sizeof(timestamp),
    "2024-01-01T%02d:%02d:%02dZ",
    (int)(millis()/3600000) % 24,
    (int)(millis()/60000) % 60,
    (int)(millis()/1000) % 60);
  doc["timestamp"] = timestamp;

  String payload;
  serializeJson(doc, payload);

  Serial.println("[HTTP] Sending location...");
  Serial.println("[HTTP] Payload: " + payload);

  int responseCode = http.POST(payload);
  
  if (responseCode > 0) {
    String response = http.getString();
    Serial.printf("[HTTP] Response %d: %s\n", responseCode, response.c_str());
    http.end();
    return responseCode == 200;
  } else {
    Serial.printf("[HTTP] Error: %s\n", http.errorToString(responseCode).c_str());
    http.end();
    blinkLED(3, 100);
    return false;
  }
}

void setup() {
  Serial.begin(115200);
  pinMode(LED_PIN, OUTPUT);
  
  // Start GPS serial
  gpsSerial.begin(9600, SERIAL_8N1, 16, 17);
  Serial.println("[GPS] Serial started on GPIO16/17");
  
  // Connect WiFi
  connectWiFi();
  
  Serial.println("[SYS] SmartBusTracker ESP32 Ready!");
  Serial.println("[GPS] Waiting for GPS fix...");
}

void loop() {
  // Feed GPS data continuously
  while (gpsSerial.available() > 0) {
    gps.encode(gpsSerial.read());
  }

  // Print GPS status every second
  static unsigned long lastPrint = 0;
  if (millis() - lastPrint > 1000) {
    if (gps.location.isValid()) {
      Serial.printf(
        "[GPS] Lat: %.6f Lng: %.6f Speed: %.1f km/h Sats: %d\n",
        gps.location.lat(),
        gps.location.lng(),
        gps.speed.kmph(),
        gps.satellites.value()
      );
    } else {
      Serial.printf("[GPS] No fix. Satellites: %d\n", gps.satellites.value());
    }
    lastPrint = millis();
  }

  // Send location every SEND_INTERVAL
  if (millis() - lastSendTime > SEND_INTERVAL) {
    if (gps.location.isValid()) {
      bool success = sendLocation(
        gps.location.lat(),
        gps.location.lng(),
        gps.speed.kmph(),
        gps.altitude.meters(),
        gps.satellites.value(),
        gps.hdop.hdop()
      );
      if (success) {
        digitalWrite(LED_PIN, HIGH);
      }
    } else {
      Serial.println("[GPS] Waiting for valid fix...");
      // Slow blink while waiting for GPS
      digitalWrite(LED_PIN, !digitalRead(LED_PIN));
    }
    lastSendTime = millis();
  }
}

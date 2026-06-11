#include <WiFi.h>
#include <WiFiClientSecure.h>
#include <HTTPClient.h>

#define RXD2 16

const char* ssid     = "hello";
const char* password = "11221122";

char raw[13];
String lastUID = "";
unsigned long lastSeenMillis  = 0;
unsigned long lastPrintMillis = 0;

const unsigned long IDLE_RESET_MS = 2000;
const unsigned long DEBOUNCE_MS   = 2000;

void setup() {
  Serial.begin(115200);
  Serial2.begin(9600, SERIAL_8N1, RXD2, -1);

  delay(100);
  while (Serial2.available()) Serial2.read();

  Serial.print("Connecting to ");
  Serial.println(ssid);
  WiFi.begin(ssid, password);

  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }

  Serial.println("\nWiFi connected!");
  Serial.print("IP Address: ");
  Serial.println(WiFi.localIP());

  Serial.print("Gateway: ");
Serial.println(WiFi.gatewayIP());
Serial.print("ESP32 IP: ");
Serial.println(WiFi.localIP());
}

bool readFrame() {
  unsigned long start = millis();
  while (Serial2.available() < 12) {
    if (millis() - start > 200) return false;
    delay(5);
  }
  Serial2.readBytes(raw, 12);
  raw[12] = '\0';
  return true;
}

// All 12 ASCII chars ARE the UID — just use them directly
String extractUID() {
  String uid = "";
  for (int i = 0; i < 12; i++) {
    uid += raw[i];
  }
  return uid;
}

void loop() {

  // WiFi reconnect
  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("WiFi lost, reconnecting...");
    WiFi.begin(ssid, password);
    unsigned long start = millis();
    while (WiFi.status() != WL_CONNECTED && millis() - start < 10000) {
      delay(500);
      Serial.print(".");
    }
    Serial.println(WiFi.status() == WL_CONNECTED ? "\nReconnected!" : "\nReconnect failed.");
  }

  if (Serial2.available() > 0) {

    if (!readFrame()) {
      while (Serial2.available()) Serial2.read();
      return;
    }

    String uid = extractUID();
    unsigned long now = millis();

    // Only print if new UID and debounce passed
    if (uid != lastUID && (now - lastPrintMillis > DEBOUNCE_MS)) {
  Serial.print("Card UID: ");
  Serial.println(uid);
  lastUID         = uid;
  lastPrintMillis = now;

  // Send API request
  if (WiFi.status() == WL_CONNECTED) {
  WiFiClientSecure client;
  //  WiFiClient client;  
  client.setInsecure(); // skip SSL cert verification (fine for ngrok)
  HTTPClient http;

  http.begin(client, "https://overmany-nonfluorescent-ailene.ngrok-free.dev/rfid-scan");
  http.addHeader("Content-Type", "application/json");
  http.addHeader("ngrok-skip-browser-warning", "true"); // skip ngrok browser warning page

  String payload = "{\"uid\": \"" + uid + "\"}";
  int httpCode = http.POST(payload);

  if (httpCode > 0) {
    Serial.print("API response code: ");
    Serial.println(httpCode);
    Serial.println(http.getString());
  } else {
    Serial.print("API call failed: ");
    Serial.println(http.errorToString(httpCode));
  }

  http.end();
}
}

    lastSeenMillis = now;

    while (Serial2.available()) Serial2.read();
  }

  // Reset after card removed
  if (lastUID != "" && (millis() - lastSeenMillis > IDLE_RESET_MS)) {
    lastUID = "";
    Serial.println("Card removed.");
  }
}
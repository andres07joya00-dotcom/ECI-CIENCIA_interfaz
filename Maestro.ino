#include <Arduino.h>

// =============================================
//   CONFIGURACIÓN UART (comunicación con Esclavo)
// =============================================
#define UART_TX_PIN  17
#define UART_RX_PIN  18

// =============================================
//   LED INTERNO
// =============================================
#define LED_PIN  2

// =============================================
//   Mostrar ranking como vector
//   Formato recibido:
//   "RANKING: #1=J3(245ms) #2=J1(312ms) ..."
// =============================================
void mostrarRankingVector(const char* msg) {

    const char* cursor = strstr(msg, "RANKING:");

    if (cursor == NULL) {
        Serial.printf("[MAESTRO] Mensaje recibido: %s\n", msg);
        return;
    }

    cursor += strlen("RANKING:");

    Serial.println("\n========== VECTOR DE RESULTADOS ==========");

    Serial.print("[");

    bool primero = true;

    while (*cursor != '\0') {

        while (*cursor == ' ') cursor++;

        if (*cursor == '\0') break;

        int puesto, jugador;
        unsigned long tiempo_ms;

        if (sscanf(cursor, "#%d=J%d(%lums)",
                   &puesto,
                   &jugador,
                   &tiempo_ms) == 3) {

            if (!primero) {
                Serial.print(", ");
            }

            // jugador;tiempo
            Serial.printf("{J%d;%lu}", jugador, tiempo_ms);

            primero = false;
        }

        const char* siguiente = strchr(cursor + 1, '#');

        if (siguiente == NULL) break;

        cursor = siguiente;
    }

    Serial.println("]");
    Serial.println("==========================================\n");
}

// =============================================
//   SETUP
// =============================================
void setup() {

    Serial.begin(115200);
    delay(2000);

    pinMode(LED_PIN, OUTPUT);
    digitalWrite(LED_PIN, LOW);

    // UART1
    Serial1.begin(115200, SERIAL_8N1,
                  UART_RX_PIN,
                  UART_TX_PIN);

    Serial.printf("[MAESTRO] UART1 configurado TX=%d RX=%d\n",
                  UART_TX_PIN,
                  UART_RX_PIN);

    Serial.println("\nEscribe algo para iniciar ronda.\n");
}

// =============================================
//   LOOP
// =============================================
void loop() {

    // =========================================
    // RECEPCIÓN DESDE EL ESCLAVO
    // =========================================
    if (Serial1.available()) {

        String msg = Serial1.readStringUntil('\n');
        msg.trim();

        if (msg.length() > 0) {

            digitalWrite(LED_PIN, HIGH);

            if (msg.indexOf("RANKING:") >= 0) {

                mostrarRankingVector(msg.c_str());

            } else {

                Serial.printf("[MAESTRO] %s\n", msg.c_str());
            }

            delay(50);
            digitalWrite(LED_PIN, LOW);
        }
    }

    // =========================================
    // ENVÍO MANUAL
    // =========================================
    if (Serial.available()) {

        String entrada = Serial.readString();
        entrada.trim();

        if (entrada.length() > 0) {

            digitalWrite(LED_PIN, HIGH);

            Serial.println("\n[MAESTRO] Iniciando ronda...\n");

            Serial1.println("A");

            delay(150);

            digitalWrite(LED_PIN, LOW);
        }
    }

    delay(10);
}
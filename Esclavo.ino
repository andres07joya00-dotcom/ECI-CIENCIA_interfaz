#include <Arduino.h>

// =============================================
#define UART_TX_PIN  17
#define UART_RX_PIN  18

#define NUM_BOTONES  6
const int BUTTON_PINS[NUM_BOTONES] = {1, 2, 8, 9, 13, 15};

#define TIEMPO_LIMITE 30000  // 30 segundos
#define NO_PRESIONADO 999999

bool contador_activo = false;
uint32_t tiempo_inicio = 0;

bool presionado[NUM_BOTONES];
uint32_t tiempos[NUM_BOTONES];
int last_state[NUM_BOTONES];

// =============================================
//   ENVIAR RESULTADOS
// =============================================
void enviarResultados() {

    Serial.println("\n=========== RESULTADOS ===========");

    int indices[NUM_BOTONES];
    for (int i = 0; i < NUM_BOTONES; i++) {
        indices[i] = i;
    }

    // Ordenar por tiempo
    for (int i = 0; i < NUM_BOTONES - 1; i++) {
        for (int j = i + 1; j < NUM_BOTONES; j++) {
            if (tiempos[indices[j]] < tiempos[indices[i]]) {
                int temp = indices[i];
                indices[i] = indices[j];
                indices[j] = temp;
            }
        }
    }

    char buffer[200];
    strcpy(buffer, "RANKING:");

    for (int i = 0; i < NUM_BOTONES; i++) {
        int jugador = indices[i];

        if (tiempos[jugador] == NO_PRESIONADO) {
            Serial.printf("%d. Jugador %d -> NO PRESIONO\n", i+1, jugador+1);

            char temp[40];
            sprintf(temp, " #%d=J%d(999999ms)", i+1, jugador+1);
            strcat(buffer, temp);
        } else {
            Serial.printf("%d. Jugador %d -> %lu ms\n",
                          i+1, jugador+1, tiempos[jugador]);

            char temp[40];
            sprintf(temp, " #%d=J%d(%lums)", i+1, jugador+1, tiempos[jugador]);
            strcat(buffer, temp);
        }
    }

    Serial.println("=================================");

    Serial1.println(buffer);

    contador_activo = false;
}

// =============================================
void setup() {
    Serial.begin(115200);
    Serial1.begin(115200, SERIAL_8N1, UART_RX_PIN, UART_TX_PIN);

    for (int i = 0; i < NUM_BOTONES; i++) {
        pinMode(BUTTON_PINS[i], INPUT_PULLUP);
        presionado[i] = false;
        last_state[i] = HIGH;
        tiempos[i] = NO_PRESIONADO;  // 🔥 IMPORTANTE
    }

    Serial.println("\n[ESCLAVO] Esperando comando 'A'...");
}

// =============================================
void loop() {

    // =========================
    // RECIBIR COMANDO
    // =========================
    if (Serial1.available()) {
        char cmd = Serial1.read();

        if (cmd == 'A') {

            for (int i = 0; i < NUM_BOTONES; i++) {
                presionado[i] = false;
                tiempos[i] = NO_PRESIONADO; // 🔥 CLAVE
            }

            tiempo_inicio = millis();
            contador_activo = true;
            
            Serial.println(">> INICIO (30s)");
            Serial1.println("LISTO");
        }
    }

    // =========================
    // LEER BOTONES
    // =========================
    for (int i = 0; i < NUM_BOTONES; i++) {

        int current = digitalRead(BUTTON_PINS[i]);

        if (last_state[i] == HIGH && current == LOW) {

            delay(50);

            if (digitalRead(BUTTON_PINS[i]) == LOW) {

                if (contador_activo && !presionado[i]) {

                    tiempos[i] = millis() - tiempo_inicio;
                    presionado[i] = true;

                    Serial.printf("Jugador %d: %lu ms\n", i+1, tiempos[i]);
                }
            }
        }

        last_state[i] = current;
    }

    // =========================
    // TIEMPO LÍMITE (30s)
    // =========================
    if (contador_activo && (millis() - tiempo_inicio >= TIEMPO_LIMITE)) {
        Serial.println("\n⏱️ Tiempo terminado");
        enviarResultados();
    }

    delay(5);
}
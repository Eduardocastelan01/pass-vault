package com.passvault.mobile.ui.screens

import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Fingerprint
import androidx.compose.material.icons.filled.Lock
import androidx.compose.material.icons.filled.Settings
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.passvault.mobile.ui.theme.NordBlue
import com.passvault.mobile.ui.theme.NordDark

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun LockScreen(
    userEmail: String?,
    serverUrl: String,
    onUnlockWithPassword: (email: String, masterPass: String) -> Unit,
    onUnlockWithBiometrics: () -> Unit,
    onSaveServerConfig: (url: String, email: String) -> Unit,
    isLoading: Boolean,
    errorMessage: String?
) {
    var email by remember { mutableStateOf(userEmail ?: "jelopezcas@outlook.com") }
    var password by remember { mutableStateOf("") }
    var showConfigDialog by remember { mutableStateOf(false) }
    var tempServerUrl by remember { mutableStateOf(serverUrl) }

    val fieldColors = OutlinedTextFieldDefaults.colors(
        focusedTextColor = Color.White,
        unfocusedTextColor = Color.White,
        focusedContainerColor = Color(0xFF0F1520),
        unfocusedContainerColor = Color(0xFF0F1520),
        focusedBorderColor = NordBlue,
        unfocusedBorderColor = Color(0xFF2D3B50),
        focusedLabelColor = NordBlue,
        unfocusedLabelColor = Color(0xFF94A3B8),
        cursorColor = NordBlue
    )

    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(NordDark),
        contentAlignment = Alignment.Center
    ) {
        Card(
            modifier = Modifier
                .fillMaxWidth(0.92f)
                .wrapContentHeight(),
            shape = RoundedCornerShape(20.dp),
            colors = CardDefaults.cardColors(containerColor = Color(0xFF161D2A)),
            border = BorderStroke(1.dp, Color(0xFF232E42))
        ) {
            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(28.dp),
                horizontalAlignment = Alignment.CenterHorizontally,
                verticalArrangement = Arrangement.spacedBy(16.dp)
            ) {
                // Isotipo PassVault
                Box(
                    modifier = Modifier
                        .size(60.dp)
                        .background(Color(0xFF0F1520), RoundedCornerShape(16.dp)),
                    contentAlignment = Alignment.Center
                ) {
                    Icon(
                        imageVector = Icons.Default.Lock,
                        contentDescription = "PassVault",
                        tint = Color(0xFF38BDF8),
                        modifier = Modifier.size(32.dp)
                    )
                }

                Text(
                    text = "PassVault",
                    fontSize = 24.sp,
                    fontWeight = FontWeight.Bold,
                    color = Color.White
                )

                Text(
                    text = "Bóveda Zero-Knowledge cifrada localmente",
                    fontSize = 13.sp,
                    color = Color(0xFF94A3B8)
                )

                Spacer(modifier = Modifier.height(4.dp))

                OutlinedTextField(
                    value = email,
                    onValueChange = { email = it },
                    label = { Text("Correo Electrónico") },
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(10.dp),
                    colors = fieldColors,
                    singleLine = true
                )

                OutlinedTextField(
                    value = password,
                    onValueChange = { password = it },
                    label = { Text("Contraseña Maestra") },
                    visualTransformation = PasswordVisualTransformation(),
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(10.dp),
                    colors = fieldColors,
                    singleLine = true
                )

                if (errorMessage != null) {
                    Text(
                        text = errorMessage,
                        color = Color(0xFFEF4444),
                        fontSize = 13.sp,
                        fontWeight = FontWeight.SemiBold
                    )
                }

                Button(
                    onClick = { onUnlockWithPassword(email, password) },
                    modifier = Modifier
                        .fillMaxWidth()
                        .height(48.dp),
                    shape = RoundedCornerShape(10.dp),
                    colors = ButtonDefaults.buttonColors(containerColor = NordBlue),
                    enabled = !isLoading && email.isNotBlank() && password.isNotBlank()
                ) {
                    if (isLoading) {
                        CircularProgressIndicator(color = Color.White, modifier = Modifier.size(20.dp))
                    } else {
                        Text("Desbloquear Bóveda", color = Color.White, fontWeight = FontWeight.Bold)
                    }
                }

                // Botón de Huella Ultrasónica (S25 Ultra)
                OutlinedButton(
                    onClick = onUnlockWithBiometrics,
                    modifier = Modifier
                        .fillMaxWidth()
                        .height(48.dp),
                    shape = RoundedCornerShape(10.dp),
                    border = BorderStroke(1.5.dp, Color(0xFF2D3B50)),
                    colors = ButtonDefaults.outlinedButtonColors(contentColor = Color(0xFF38BDF8))
                ) {
                    Icon(
                        imageVector = Icons.Default.Fingerprint,
                        contentDescription = "Huella",
                        tint = Color(0xFF38BDF8),
                        modifier = Modifier.size(24.dp)
                    )
                    Spacer(modifier = Modifier.width(8.dp))
                    Text("Huella Dactilar (S25 Ultra)", color = Color.White, fontWeight = FontWeight.SemiBold)
                }

                // Configuración de Servidor
                TextButton(onClick = { showConfigDialog = true }) {
                    Icon(
                        imageVector = Icons.Default.Settings,
                        contentDescription = "Configuración",
                        tint = Color(0xFF94A3B8),
                        modifier = Modifier.size(16.dp)
                    )
                    Spacer(modifier = Modifier.width(6.dp))
                    Text("Servidor: $serverUrl", fontSize = 12.sp, color = Color(0xFF94A3B8))
                }
            }
        }
    }

    if (showConfigDialog) {
        AlertDialog(
            onDismissRequest = { showConfigDialog = false },
            containerColor = Color(0xFF161D2A),
            titleContentColor = Color.White,
            textContentColor = Color(0xFF94A3B8),
            title = { Text("Servidor de Sincronización", fontWeight = FontWeight.Bold) },
            text = {
                Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
                    Text(
                        "IP local de tu laptop (por defecto: http://192.168.1.126:3000):",
                        fontSize = 13.sp,
                        color = Color(0xFF94A3B8)
                    )
                    OutlinedTextField(
                        value = tempServerUrl,
                        onValueChange = { tempServerUrl = it },
                        modifier = Modifier.fillMaxWidth(),
                        colors = fieldColors
                    )
                }
            },
            confirmButton = {
                Button(
                    onClick = {
                        onSaveServerConfig(tempServerUrl, email)
                        showConfigDialog = false
                    },
                    colors = ButtonDefaults.buttonColors(containerColor = NordBlue)
                ) {
                    Text("Guardar", color = Color.White)
                }
            },
            dismissButton = {
                TextButton(onClick = { showConfigDialog = false }) {
                    Text("Cancelar", color = Color(0xFF94A3B8))
                }
            }
        )
    }
}

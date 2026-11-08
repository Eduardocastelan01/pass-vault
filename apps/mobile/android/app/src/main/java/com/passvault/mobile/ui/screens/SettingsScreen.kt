package com.passvault.mobile.ui.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.ArrowBack
import androidx.compose.material.icons.filled.Fingerprint
import androidx.compose.material.icons.filled.Lock
import androidx.compose.material.icons.filled.Sync
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.passvault.mobile.ui.theme.NordDark
import com.passvault.mobile.ui.theme.NordRed
import com.passvault.mobile.ui.theme.NordTextMuted

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun SettingsScreen(
    userEmail: String?,
    serverUrl: String,
    isBiometricEnabled: Boolean,
    onToggleBiometric: (Boolean) -> Unit,
    onUpdateServerUrl: (String) -> Unit,
    onSyncNow: () -> Unit,
    onLockVault: () -> Unit,
    onLogout: () -> Unit,
    onBack: () -> Unit
) {
    var tempUrl by remember { mutableStateOf(serverUrl) }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Settings", fontWeight = FontWeight.Bold, fontSize = 18.sp) },
                navigationIcon = {
                    IconButton(onClick = onBack) {
                        Icon(imageVector = Icons.Default.ArrowBack, contentDescription = "Volver")
                    }
                },
                colors = TopAppBarDefaults.topAppBarColors(containerColor = Color.White)
            )
        }
    ) { padding ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(padding)
                .background(Color.White)
                .verticalScroll(rememberScrollState())
                .padding(20.dp),
            verticalArrangement = Arrangement.spacedBy(20.dp)
        ) {
            // Tarjeta de Usuario (Image 4)
            Card(
                shape = RoundedCornerShape(12.dp),
                colors = CardDefaults.cardColors(containerColor = NordDark),
                modifier = Modifier.fillMaxWidth()
            ) {
                Row(
                    modifier = Modifier.padding(16.dp),
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(14.dp)
                ) {
                    Box(
                        modifier = Modifier
                            .size(46.dp)
                            .background(Color(0xFFD97706), CircleShape),
                        contentAlignment = Alignment.Center
                    ) {
                        Text("Je", color = Color.White, fontWeight = FontWeight.Bold, fontSize = 16.sp)
                    }

                    Column {
                        Text(userEmail ?: "usuario@email.com", color = Color.White, fontWeight = FontWeight.Bold, fontSize = 15.sp)
                        Text("Free plan • Cifrado Zero-Knowledge", color = Color(0xFF94A3B8), fontSize = 12.sp)
                    }
                }
            }

            // Sección Seguridad
            Text("Seguridad y Biometría", fontWeight = FontWeight.Bold, fontSize = 14.sp)

            Card(
                shape = RoundedCornerShape(12.dp),
                colors = CardDefaults.cardColors(containerColor = Color(0xFFF8FAFC)),
                modifier = Modifier.fillMaxWidth()
            ) {
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(16.dp),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                        Icon(imageVector = Icons.Default.Fingerprint, contentDescription = null, tint = Color(0xFF0284C7))
                        Column {
                            Text("Sensor Ultrasónico S25 Ultra", fontWeight = FontWeight.SemiBold, fontSize = 14.sp)
                            Text("Desbloquear con huella dactilar", fontSize = 12.sp, color = NordTextMuted)
                        }
                    }

                    Switch(
                        checked = isBiometricEnabled,
                        onCheckedChange = onToggleBiometric
                    )
                }
            }

            // Sección Sincronización
            Text("Servidor de Sincronización", fontWeight = FontWeight.Bold, fontSize = 14.sp)

            Card(
                shape = RoundedCornerShape(12.dp),
                colors = CardDefaults.cardColors(containerColor = Color(0xFFF8FAFC)),
                modifier = Modifier.fillMaxWidth()
            ) {
                Column(modifier = Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(10.dp)) {
                    Text(
                        "URL del Servidor (Laptop o Nube)",
                        fontSize = 12.sp,
                        color = NordTextMuted
                    )
                    OutlinedTextField(
                        value = tempUrl,
                        onValueChange = {
                            tempUrl = it
                            onUpdateServerUrl(it)
                        },
                        modifier = Modifier.fillMaxWidth(),
                        shape = RoundedCornerShape(8.dp)
                    )

                    Button(
                        onClick = onSyncNow,
                        modifier = Modifier.fillMaxWidth(),
                        shape = RoundedCornerShape(8.dp),
                        colors = ButtonDefaults.buttonColors(containerColor = NordDark)
                    ) {
                        Icon(imageVector = Icons.Default.Sync, contentDescription = null, modifier = Modifier.size(16.dp))
                        Spacer(modifier = Modifier.width(8.dp))
                        Text("Sincronizar Bóveda Ahora")
                    }
                }
            }

            Spacer(modifier = Modifier.height(10.dp))

            // Botones de Bloqueo y Cierre de Sesión
            OutlinedButton(
                onClick = onLockVault,
                modifier = Modifier
                    .fillMaxWidth()
                    .height(48.dp),
                shape = RoundedCornerShape(10.dp)
            ) {
                Icon(imageVector = Icons.Default.Lock, contentDescription = null, modifier = Modifier.size(18.dp))
                Spacer(modifier = Modifier.width(8.dp))
                Text("Bloquear Bóveda", fontWeight = FontWeight.SemiBold)
            }

            Button(
                onClick = onLogout,
                modifier = Modifier
                    .fillMaxWidth()
                    .height(48.dp),
                shape = RoundedCornerShape(10.dp),
                colors = ButtonDefaults.buttonColors(containerColor = NordRed)
            ) {
                Text("Cerrar Sesión (Log Out)", fontWeight = FontWeight.Bold)
            }
        }
    }
}


package com.passvault.mobile.ui.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalClipboardManager
import androidx.compose.ui.text.AnnotatedString
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.passvault.mobile.model.DecryptedVaultItem
import com.passvault.mobile.model.Folder
import com.passvault.mobile.ui.theme.*

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun DetailScreen(
    item: DecryptedVaultItem,
    folders: List<Folder>,
    onBack: () -> Unit,
    onMoveToFolder: (folderId: String?) -> Unit
) {
    val clipboardManager = LocalClipboardManager.current
    var isPassVisible by remember { mutableStateOf(false) }
    var showMoveDialog by remember { mutableStateOf(false) }

    val folderObj = folders.find { it.id == item.folderId }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text(item.name, fontWeight = FontWeight.Bold, fontSize = 18.sp) },
                navigationIcon = {
                    IconButton(onClick = onBack) {
                        Icon(imageVector = Icons.Default.ArrowBack, contentDescription = "Volver")
                    }
                },
                actions = {
                    IconButton(onClick = { showMoveDialog = true }) {
                        Icon(imageVector = Icons.Default.DriveFileMove, contentDescription = "Mover de carpeta")
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
            verticalArrangement = Arrangement.spacedBy(16.dp)
        ) {
            // Hero Icon
            val (bgColor, icon) = when (item.type) {
                "card" -> NordPurple to Icons.Default.CreditCard
                "note" -> NordAmber to Icons.Default.Description
                "identity" -> NordGreen to Icons.Default.Person
                else -> NordBlue to Icons.Default.Key
            }

            Box(
                modifier = Modifier
                    .size(64.dp)
                    .background(bgColor, RoundedCornerShape(16.dp))
                    .align(Alignment.CenterHorizontally),
                contentAlignment = Alignment.Center
            ) {
                Icon(imageVector = icon, contentDescription = null, tint = Color.White, modifier = Modifier.size(32.dp))
            }

            Text(
                text = item.name,
                fontWeight = FontWeight.Bold,
                fontSize = 20.sp,
                modifier = Modifier.align(Alignment.CenterHorizontally)
            )

            // Carpeta asignada
            Surface(
                shape = RoundedCornerShape(20.dp),
                color = Color(0xFFF1F5F9),
                modifier = Modifier.align(Alignment.CenterHorizontally)
            ) {
                Text(
                    text = "📁 ${folderObj?.name ?: "Sin Carpeta"}",
                    fontSize = 12.sp,
                    fontWeight = FontWeight.Medium,
                    color = NordTextMuted,
                    modifier = Modifier.padding(horizontal = 12.dp, vertical = 6.dp)
                )
            }

            Spacer(modifier = Modifier.height(8.dp))

            // CAMPOS LOGIN
            if (item.type == "login") {
                val data = item.loginData
                DetailFieldGroup("Email or Username", data?.username ?: "") {
                    clipboardManager.setText(AnnotatedString(data?.username ?: ""))
                }

                Card(
                    shape = RoundedCornerShape(10.dp),
                    colors = CardDefaults.cardColors(containerColor = Color(0xFFF8FAFC)),
                    modifier = Modifier.fillMaxWidth()
                ) {
                    Column(modifier = Modifier.padding(14.dp)) {
                        Text("Password", fontSize = 11.sp, fontWeight = FontWeight.SemiBold, color = NordTextMuted)
                        Spacer(modifier = Modifier.height(4.dp))
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.SpaceBetween,
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Text(
                                text = if (isPassVisible) data?.password ?: "" else "••••••••••••",
                                fontWeight = FontWeight.Bold,
                                fontSize = 14.sp
                            )
                            Row {
                                IconButton(onClick = { isPassVisible = !isPassVisible }) {
                                    Icon(
                                        imageVector = if (isPassVisible) Icons.Default.VisibilityOff else Icons.Default.Visibility,
                                        contentDescription = "Ver"
                                    )
                                }
                                IconButton(onClick = {
                                    clipboardManager.setText(AnnotatedString(data?.password ?: ""))
                                }) {
                                    Icon(imageVector = Icons.Default.ContentCopy, contentDescription = "Copiar")
                                }
                            }
                        }
                    }
                }

                // Password Health badge estilo NordPass
                Surface(
                    shape = RoundedCornerShape(20.dp),
                    color = Color(0xFFECFDF5)
                ) {
                    Row(
                        modifier = Modifier.padding(horizontal = 12.dp, vertical = 6.dp),
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.spacedBy(6.dp)
                    ) {
                        Icon(imageVector = Icons.Default.CheckCircle, contentDescription = null, tint = NordGreen, modifier = Modifier.size(14.dp))
                        Text("Strong Password", color = NordGreen, fontWeight = FontWeight.Bold, fontSize = 12.sp)
                    }
                }

                if (!data?.uris.isNullOrEmpty()) {
                    DetailFieldGroup("Website Address", data?.uris?.first() ?: "")
                }
            }

            // CAMPOS CARD (Image 3 y 4)
            if (item.type == "card") {
                val data = item.cardData
                DetailFieldGroup("Cardholder Name", data?.cardholderName ?: "")
                DetailFieldGroup("Card Number", data?.number ?: "") {
                    clipboardManager.setText(AnnotatedString(data?.number ?: ""))
                }
                Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                    Box(modifier = Modifier.weight(1f)) {
                        DetailFieldGroup("Expiration", "${data?.expMonth}/${data?.expYear}")
                    }
                    Box(modifier = Modifier.weight(1f)) {
                        DetailFieldGroup("CVV", data?.cvv ?: "") {
                            clipboardManager.setText(AnnotatedString(data?.cvv ?: ""))
                        }
                    }
                }
            }

            // CAMPOS NOTE
            if (item.type == "note") {
                DetailFieldGroup("Note Content", item.noteData?.text ?: "") {
                    clipboardManager.setText(AnnotatedString(item.noteData?.text ?: ""))
                }
            }

            // CAMPOS IDENTITY
            if (item.type == "identity") {
                val data = item.identityData
                DetailFieldGroup("Name", "${data?.firstName} ${data?.lastName}".trim())
                DetailFieldGroup("Email", data?.email ?: "")
                DetailFieldGroup("Phone", data?.phone ?: "")
                DetailFieldGroup("Address", data?.address ?: "")
            }
        }
    }

    if (showMoveDialog) {
        AlertDialog(
            onDismissRequest = { showMoveDialog = false },
            title = { Text("Mover a Carpeta") },
            text = {
                Column(verticalArrangement = Arrangement.spacedBy(6.dp)) {
                    TextButton(
                        onClick = {
                            onMoveToFolder(null)
                            showMoveDialog = false
                        },
                        modifier = Modifier.fillMaxWidth()
                    ) {
                        Text("- Sin Carpeta (Raíz) -", modifier = Modifier.fillMaxWidth())
                    }
                    folders.forEach { f ->
                        TextButton(
                            onClick = {
                                onMoveToFolder(f.id)
                                showMoveDialog = false
                            },
                            modifier = Modifier.fillMaxWidth()
                        ) {
                            Text("📁 ${f.name}", modifier = Modifier.fillMaxWidth())
                        }
                    }
                }
            },
            confirmButton = {},
            dismissButton = {
                TextButton(onClick = { showMoveDialog = false }) {
                    Text("Cancelar")
                }
            }
        )
    }
}

@Composable
fun DetailFieldGroup(label: String, value: String, onCopy: (() -> Unit)? = null) {
    Card(
        shape = RoundedCornerShape(10.dp),
        colors = CardDefaults.cardColors(containerColor = Color(0xFFF8FAFC)),
        modifier = Modifier.fillMaxWidth()
    ) {
        Column(modifier = Modifier.padding(14.dp)) {
            Text(label, fontSize = 11.sp, fontWeight = FontWeight.SemiBold, color = NordTextMuted)
            Spacer(modifier = Modifier.height(4.dp))
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Text(
                    text = value.ifBlank { "(Sin información)" },
                    fontWeight = FontWeight.SemiBold,
                    fontSize = 14.sp,
                    color = NordTextDark
                )
                if (onCopy != null) {
                    IconButton(onClick = onCopy, modifier = Modifier.size(28.dp)) {
                        Icon(imageVector = Icons.Default.ContentCopy, contentDescription = "Copiar", modifier = Modifier.size(16.dp))
                    }
                }
            }
        }
    }
}

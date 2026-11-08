package com.passvault.mobile.ui.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
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
fun VaultScreen(
    items: List<DecryptedVaultItem>,
    folders: List<Folder>,
    userEmail: String?,
    onSelectItem: (DecryptedVaultItem) -> Unit,
    onOpenCreate: (type: String) -> Unit,
    onCreateFolder: (name: String) -> Unit,
    onOpenSettings: () -> Unit,
    onSyncNow: () -> Unit,
    isSyncing: Boolean
) {
    var searchQuery by remember { mutableStateOf("") }
    var selectedCategory by remember { mutableStateOf("all") }
    var selectedFolderId by remember { mutableStateOf<String?>(null) }
    var showCreateOptionsSheet by remember { mutableStateOf(false) }
    var showAddFolderDialog by remember { mutableStateOf(false) }
    var newFolderName by remember { mutableStateOf("") }

    val clipboardManager = LocalClipboardManager.current
    var toastMessage by remember { mutableStateOf<String?>(null) }

    val categories = listOf(
        "all" to "All Items",
        "login" to "🔑 Passwords",
        "card" to "💳 Cards",
        "note" to "📝 Notes",
        "identity" to "👤 Contact Info"
    )

    val filteredItems = items.filter { item ->
        val matchesCategory = when (selectedCategory) {
            "all" -> true
            else -> item.type == selectedCategory
        }

        val matchesFolder = if (selectedFolderId != null) {
            item.folderId == selectedFolderId
        } else true

        val matchesSearch = if (searchQuery.isNotBlank()) {
            val q = searchQuery.lowercase()
            item.name.lowercase().contains(q) ||
                    (item.loginData?.username?.lowercase()?.contains(q) == true) ||
                    (item.cardData?.cardholderName?.lowercase()?.contains(q) == true)
        } else true

        matchesCategory && matchesFolder && matchesSearch
    }

    Scaffold(
        topBar = {
            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .background(NordDark)
                    .padding(top = 16.dp, start = 16.dp, end = 16.dp, bottom = 12.dp)
            ) {
                // Header estilo NordPass
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Row(
                        verticalAlignment = Alignment.CenterVertically,
                        modifier = Modifier
                            .background(Color(0xFF1A2230), RoundedCornerShape(10.dp))
                            .padding(horizontal = 12.dp, vertical = 6.dp)
                    ) {
                        Text(
                            text = "Vault",
                            color = Color.White,
                            fontWeight = FontWeight.Bold,
                            fontSize = 15.sp
                        )
                        Icon(
                            imageVector = Icons.Default.UnfoldMore,
                            contentDescription = "Selector",
                            tint = Color.White,
                            modifier = Modifier.size(16.dp)
                        )
                    }

                    Row(
                        horizontalArrangement = Arrangement.spacedBy(10.dp),
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        IconButton(onClick = onSyncNow) {
                            Icon(
                                imageVector = Icons.Default.Sync,
                                contentDescription = "Sincronizar",
                                tint = if (isSyncing) NordBlue else Color.White
                            )
                        }

                        // Avatar con iniciales Je estilo NordPass
                        Box(
                            modifier = Modifier
                                .size(34.dp)
                                .background(Color(0xFFD97706), CircleShape)
                                .clickable { onOpenSettings() },
                            contentAlignment = Alignment.Center
                        ) {
                            Text(
                                text = "Je",
                                color = Color.White,
                                fontWeight = FontWeight.Bold,
                                fontSize = 13.sp
                            )
                        }
                    }
                }

                Spacer(modifier = Modifier.height(12.dp))

                // Barra de Búsqueda
                OutlinedTextField(
                    value = searchQuery,
                    onValueChange = { searchQuery = it },
                    placeholder = { Text("Search all items", color = Color(0xFF94A3B8), fontSize = 13.sp) },
                    leadingIcon = {
                        Icon(
                            imageVector = Icons.Default.Search,
                            contentDescription = "Buscar",
                            tint = Color(0xFF94A3B8),
                            modifier = Modifier.size(18.dp)
                        )
                    },
                    modifier = Modifier
                        .fillMaxWidth()
                        .height(48.dp),
                    shape = RoundedCornerShape(10.dp),
                    colors = OutlinedTextFieldDefaults.colors(
                        focusedContainerColor = Color(0xFF1A2230),
                        unfocusedContainerColor = Color(0xFF1A2230),
                        focusedBorderColor = Color(0xFF2D3B50),
                        unfocusedBorderColor = Color(0xFF2D3B50),
                        focusedTextColor = Color.White,
                        unfocusedTextColor = Color.White
                    ),
                    singleLine = true
                )
            }
        },
        floatingActionButton = {
            FloatingActionButton(
                onClick = { showCreateOptionsSheet = true },
                containerColor = NordDark,
                contentColor = Color.White,
                shape = CircleShape
            ) {
                Icon(imageVector = Icons.Default.Add, contentDescription = "Agregar elemento")
            }
        },
        bottomBar = {
            NavigationBar(
                containerColor = Color.White,
                tonalElevation = 8.dp
            ) {
                NavigationBarItem(
                    selected = true,
                    onClick = { },
                    icon = { Icon(Icons.Default.Lock, contentDescription = "Vault") },
                    label = { Text("Vault") }
                )
                NavigationBarItem(
                    selected = false,
                    onClick = { showAddFolderDialog = true },
                    icon = { Icon(Icons.Default.CreateNewFolder, contentDescription = "Folders") },
                    label = { Text("New Folder") }
                )
                NavigationBarItem(
                    selected = false,
                    onClick = onOpenSettings,
                    icon = { Icon(Icons.Default.Settings, contentDescription = "Settings") },
                    label = { Text("Settings") }
                )
            }
        }
    ) { padding ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(padding)
                .background(Color.White)
        ) {
            // Píldoras de Categoría
            LazyRow(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 16.dp, vertical = 12.dp),
                horizontalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                items(categories) { (catId, catLabel) ->
                    val isSelected = selectedCategory == catId
                    Surface(
                        modifier = Modifier.clickable { selectedCategory = catId },
                        shape = RoundedCornerShape(20.dp),
                        color = if (isSelected) NordDark else Color(0xFFF1F5F9),
                        contentColor = if (isSelected) Color.White else NordTextDark
                    ) {
                        Text(
                            text = catLabel,
                            fontSize = 12.sp,
                            fontWeight = FontWeight.SemiBold,
                            modifier = Modifier.padding(horizontal = 14.dp, vertical = 7.dp)
                        )
                    }
                }
            }

            // Contador de Elementos
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 16.dp, vertical = 4.dp),
                horizontalArrangement = Arrangement.SpaceBetween
            ) {
                Text(
                    text = "${filteredItems.size} items",
                    fontSize = 11.sp,
                    color = NordTextMuted,
                    fontWeight = FontWeight.SemiBold
                )
            }

            // Lista de Credenciales
            if (filteredItems.isEmpty()) {
                Box(
                    modifier = Modifier
                        .fillMaxSize()
                        .padding(32.dp),
                    contentAlignment = Alignment.Center
                ) {
                    Text(
                        text = if (searchQuery.isNotBlank()) "No se encontraron resultados" else "Tu bóveda está vacía.\nPresiona '+' para agregar un elemento.",
                        color = NordTextMuted,
                        fontSize = 14.sp
                    )
                }
            } else {
                LazyColumn(
                    modifier = Modifier.fillMaxSize(),
                    contentPadding = PaddingValues(bottom = 80.dp)
                ) {
                    items(filteredItems) { item ->
                        ItemRow(
                            item = item,
                            onClick = { onSelectItem(item) },
                            onCopyUser = {
                                val u = item.loginData?.username ?: item.cardData?.number ?: ""
                                clipboardManager.setText(AnnotatedString(u))
                                toastMessage = "Copiado al portapapeles"
                            },
                            onCopyPass = {
                                val p = item.loginData?.password ?: item.cardData?.cvv ?: ""
                                clipboardManager.setText(AnnotatedString(p))
                                toastMessage = "Secreto copiado al portapapeles"
                            }
                        )
                        HorizontalDivider(color = NordBorder.copy(alpha = 0.5f), thickness = 0.5.dp)
                    }
                }
            }
        }
    }

    // Modal de Creación Especializada (Image 2)
    if (showCreateOptionsSheet) {
        ModalBottomSheet(
            onDismissRequest = { showCreateOptionsSheet = false },
            containerColor = Color.White
        ) {
            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(20.dp),
                verticalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                Text("Create Item", fontSize = 18.sp, fontWeight = FontWeight.Bold)
                Spacer(modifier = Modifier.height(4.dp))

                CreateOptionRow("🔑 Password", "Credencial de sitio web o app") {
                    showCreateOptionsSheet = false
                    onOpenCreate("login")
                }
                CreateOptionRow("💳 Credit Card", "Número, CVV, PIN y vencimiento") {
                    showCreateOptionsSheet = false
                    onOpenCreate("card")
                }
                CreateOptionRow("📝 Secure Note", "Nota de texto cifrada") {
                    showCreateOptionsSheet = false
                    onOpenCreate("note")
                }
                CreateOptionRow("👤 Contact Info", "Nombre, dirección, teléfono") {
                    showCreateOptionsSheet = false
                    onOpenCreate("identity")
                }
            }
        }
    }

    // Modal Add New Folder (Image 5)
    if (showAddFolderDialog) {
        AlertDialog(
            onDismissRequest = { showAddFolderDialog = false },
            title = { Text("Add New Folder", fontWeight = FontWeight.Bold, fontSize = 18.sp) },
            text = {
                OutlinedTextField(
                    value = newFolderName,
                    onValueChange = { newFolderName = it },
                    placeholder = { Text("Folder name (required)") },
                    leadingIcon = {
                        Icon(
                            imageVector = Icons.Default.Folder,
                            contentDescription = "Folder",
                            tint = Color(0xFF38BDF8)
                        )
                    },
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(10.dp)
                )
            },
            confirmButton = {
                Button(
                    onClick = {
                        if (newFolderName.isNotBlank()) {
                            onCreateFolder(newFolderName.trim())
                            newFolderName = ""
                            showAddFolderDialog = false
                        }
                    },
                    colors = ButtonDefaults.buttonColors(containerColor = NordDark),
                    shape = RoundedCornerShape(10.dp)
                ) {
                    Text("Save")
                }
            },
            dismissButton = {
                TextButton(onClick = { showAddFolderDialog = false }) {
                    Text("Cancel")
                }
            }
        )
    }
}

@Composable
fun ItemRow(
    item: DecryptedVaultItem,
    onClick: () -> Unit,
    onCopyUser: () -> Unit,
    onCopyPass: () -> Unit
) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .clickable { onClick() }
            .padding(horizontal = 16.dp, vertical = 12.dp),
        verticalAlignment = Alignment.CenterVertically
    ) {
        // Badge de Icono
        val (bgColor, icon) = when (item.type) {
            "card" -> NordPurple to Icons.Default.CreditCard
            "note" -> NordAmber to Icons.Default.Description
            "identity" -> NordGreen to Icons.Default.Person
            else -> NordBlue to Icons.Default.Key
        }

        Box(
            modifier = Modifier
                .size(38.dp)
                .background(bgColor.copy(alpha = 0.15f), RoundedCornerShape(10.dp)),
            contentAlignment = Alignment.Center
        ) {
            Icon(
                imageVector = icon,
                contentDescription = null,
                tint = bgColor,
                modifier = Modifier.size(20.dp)
            )
        }

        Spacer(modifier = Modifier.width(12.dp))

        Column(modifier = Modifier.weight(1f)) {
            Text(
                text = item.name,
                fontWeight = FontWeight.SemiBold,
                fontSize = 14.sp,
                color = NordTextDark
            )
            val sub = when (item.type) {
                "card" -> "•••• ${item.cardData?.number?.takeLast(4) ?: "Card"}"
                "note" -> item.noteData?.text?.take(28) ?: "Nota segura"
                "identity" -> item.identityData?.email ?: "Contacto"
                else -> item.loginData?.username ?: "Sin usuario"
            }
            Text(
                text = sub,
                fontSize = 12.sp,
                color = NordTextMuted
            )
        }

        // Botones de acción rápida
        Row(horizontalArrangement = Arrangement.spacedBy(4.dp)) {
            IconButton(onClick = onCopyUser, modifier = Modifier.size(32.dp)) {
                Icon(
                    imageVector = Icons.Default.ContentCopy,
                    contentDescription = "Copiar",
                    tint = NordTextMuted,
                    modifier = Modifier.size(16.dp)
                )
            }
            if (item.type == "login" || item.type == "card") {
                IconButton(onClick = onCopyPass, modifier = Modifier.size(32.dp)) {
                    Icon(
                        imageVector = Icons.Default.Key,
                        contentDescription = "Copiar secreto",
                        tint = NordTextMuted,
                        modifier = Modifier.size(16.dp)
                    )
                }
            }
        }
    }
}

@Composable
fun CreateOptionRow(title: String, subtitle: String, onClick: () -> Unit) {
    Surface(
        modifier = Modifier
            .fillMaxWidth()
            .clickable { onClick() },
        shape = RoundedCornerShape(10.dp),
        color = Color(0xFFF8FAFC)
    ) {
        Column(modifier = Modifier.padding(14.dp)) {
            Text(text = title, fontWeight = FontWeight.Bold, fontSize = 14.sp)
            Text(text = subtitle, fontSize = 12.sp, color = NordTextMuted)
        }
    }
}

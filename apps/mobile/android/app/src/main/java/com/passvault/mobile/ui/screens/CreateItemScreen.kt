package com.passvault.mobile.ui.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.ArrowBack
import androidx.compose.material.icons.filled.Bolt
import androidx.compose.material.icons.filled.Visibility
import androidx.compose.material.icons.filled.VisibilityOff
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.compose.ui.text.input.VisualTransformation
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.passvault.mobile.model.*
import com.passvault.mobile.ui.theme.NordBlue
import com.passvault.mobile.ui.theme.NordDark
import com.passvault.mobile.ui.theme.NordTextMuted

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun CreateItemScreen(
    initialType: String,
    folders: List<Folder>,
    onBack: () -> Unit,
    onSave: (
        type: String,
        name: String,
        folderId: String?,
        login: LoginData?,
        card: CardData?,
        note: NoteData?,
        identity: IdentityData?
    ) -> Unit
) {
    var type by remember { mutableStateOf(initialType) }
    var title by remember { mutableStateOf("") }
    var selectedFolderId by remember { mutableStateOf<String?>(null) }
    var notes by remember { mutableStateOf("") }

    // Login state
    var loginUser by remember { mutableStateOf("") }
    var loginPass by remember { mutableStateOf("") }
    var loginUrl by remember { mutableStateOf("") }
    var isLoginPassVisible by remember { mutableStateOf(false) }

    // Card state (Image 3 y 4)
    var cardHolder by remember { mutableStateOf("") }
    var cardNumber by remember { mutableStateOf("") }
    var cardExp by remember { mutableStateOf("") }
    var cardCvv by remember { mutableStateOf("") }
    var cardPin by remember { mutableStateOf("") }
    var cardZip by remember { mutableStateOf("") }
    var isCvvVisible by remember { mutableStateOf(false) }
    var isPinVisible by remember { mutableStateOf(false) }

    // Note state
    var noteContent by remember { mutableStateOf("") }

    // Identity state
    var idFirst by remember { mutableStateOf("") }
    var idLast by remember { mutableStateOf("") }
    var idEmail by remember { mutableStateOf("") }
    var idPhone by remember { mutableStateOf("") }
    var idAddress by remember { mutableStateOf("") }

    val screenTitle = when (type) {
        "card" -> "Create Credit Card"
        "note" -> "Create Secure Note"
        "identity" -> "Create Contact Info"
        else -> "Create Password"
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text(screenTitle, fontWeight = FontWeight.Bold, fontSize = 18.sp) },
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
            verticalArrangement = Arrangement.spacedBy(14.dp)
        ) {
            OutlinedTextField(
                value = title,
                onValueChange = { title = it },
                label = { Text("Title (required)") },
                modifier = Modifier.fillMaxWidth(),
                shape = RoundedCornerShape(10.dp)
            )

            // 1. CAMPOS LOGIN
            if (type == "login") {
                OutlinedTextField(
                    value = loginUser,
                    onValueChange = { loginUser = it },
                    label = { Text("Email or Username") },
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(10.dp)
                )

                OutlinedTextField(
                    value = loginPass,
                    onValueChange = { loginPass = it },
                    label = { Text("Password") },
                    visualTransformation = if (isLoginPassVisible) VisualTransformation.None else PasswordVisualTransformation(),
                    trailingIcon = {
                        Row {
                            IconButton(onClick = { isLoginPassVisible = !isLoginPassVisible }) {
                                Icon(
                                    imageVector = if (isLoginPassVisible) Icons.Default.VisibilityOff else Icons.Default.Visibility,
                                    contentDescription = "Ver"
                                )
                            }
                            IconButton(onClick = {
                                loginPass = (1..20).map { (('a'..'z') + ('A'..'Z') + ('0'..'9') + "!@#$").random() }.joinToString("")
                                isLoginPassVisible = true
                            }) {
                                Icon(imageVector = Icons.Default.Bolt, contentDescription = "Generar", tint = NordBlue)
                            }
                        }
                    },
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(10.dp)
                )

                OutlinedTextField(
                    value = loginUrl,
                    onValueChange = { loginUrl = it },
                    label = { Text("Website Address (URL)") },
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(10.dp)
                )
            }

            // 2. CAMPOS CREDIT CARD (Image 3 y 4)
            if (type == "card") {
                Text("Card Details", fontWeight = FontWeight.Bold, fontSize = 14.sp)

                OutlinedTextField(
                    value = cardHolder,
                    onValueChange = { cardHolder = it },
                    label = { Text("Cardholder Name") },
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(10.dp)
                )

                OutlinedTextField(
                    value = cardNumber,
                    onValueChange = { cardNumber = it },
                    label = { Text("Card Number (required)") },
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(10.dp)
                )

                Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                    OutlinedTextField(
                        value = cardExp,
                        onValueChange = { cardExp = it },
                        label = { Text("Expiration Date (MM/YY)") },
                        modifier = Modifier.weight(1f),
                        shape = RoundedCornerShape(10.dp)
                    )
                    OutlinedTextField(
                        value = cardCvv,
                        onValueChange = { cardCvv = it },
                        label = { Text("CVV") },
                        visualTransformation = if (isCvvVisible) VisualTransformation.None else PasswordVisualTransformation(),
                        trailingIcon = {
                            IconButton(onClick = { isCvvVisible = !isCvvVisible }) {
                                Icon(imageVector = if (isCvvVisible) Icons.Default.VisibilityOff else Icons.Default.Visibility, contentDescription = "Ver")
                            }
                        },
                        modifier = Modifier.weight(1f),
                        shape = RoundedCornerShape(10.dp)
                    )
                }

                Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                    OutlinedTextField(
                        value = cardPin,
                        onValueChange = { cardPin = it },
                        label = { Text("Card PIN") },
                        visualTransformation = if (isPinVisible) VisualTransformation.None else PasswordVisualTransformation(),
                        trailingIcon = {
                            IconButton(onClick = { isPinVisible = !isPinVisible }) {
                                Icon(imageVector = if (isPinVisible) Icons.Default.VisibilityOff else Icons.Default.Visibility, contentDescription = "Ver")
                            }
                        },
                        modifier = Modifier.weight(1f),
                        shape = RoundedCornerShape(10.dp)
                    )
                    OutlinedTextField(
                        value = cardZip,
                        onValueChange = { cardZip = it },
                        label = { Text("ZIP Code") },
                        modifier = Modifier.weight(1f),
                        shape = RoundedCornerShape(10.dp)
                    )
                }
            }

            // 3. CAMPOS SECURE NOTE
            if (type == "note") {
                OutlinedTextField(
                    value = noteContent,
                    onValueChange = { noteContent = it },
                    label = { Text("Secure Note Content") },
                    modifier = Modifier
                        .fillMaxWidth()
                        .height(200.dp),
                    shape = RoundedCornerShape(10.dp)
                )
            }

            // 4. CAMPOS CONTACT INFO
            if (type == "identity") {
                Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                    OutlinedTextField(
                        value = idFirst,
                        onValueChange = { idFirst = it },
                        label = { Text("First Name") },
                        modifier = Modifier.weight(1f),
                        shape = RoundedCornerShape(10.dp)
                    )
                    OutlinedTextField(
                        value = idLast,
                        onValueChange = { idLast = it },
                        label = { Text("Last Name") },
                        modifier = Modifier.weight(1f),
                        shape = RoundedCornerShape(10.dp)
                    )
                }
                OutlinedTextField(
                    value = idEmail,
                    onValueChange = { idEmail = it },
                    label = { Text("Email") },
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(10.dp)
                )
                OutlinedTextField(
                    value = idPhone,
                    onValueChange = { idPhone = it },
                    label = { Text("Phone Number") },
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(10.dp)
                )
                OutlinedTextField(
                    value = idAddress,
                    onValueChange = { idAddress = it },
                    label = { Text("Address") },
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(10.dp)
                )
            }

            // NOTAS GENERALES
            if (type != "note") {
                OutlinedTextField(
                    value = notes,
                    onValueChange = { notes = it },
                    label = { Text("Notes") },
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(10.dp)
                )
            }

            Spacer(modifier = Modifier.height(10.dp))

            Button(
                onClick = {
                    if (title.isBlank()) return@Button

                    val loginData = if (type == "login") LoginData(username = loginUser, password = loginPass, uris = listOf(loginUrl), notes = notes) else null
                    val cardData = if (type == "card") {
                        val parts = cardExp.split("/")
                        CardData(
                            cardholderName = cardHolder,
                            number = cardNumber,
                            expMonth = parts.getOrNull(0) ?: "",
                            expYear = parts.getOrNull(1) ?: "",
                            cvv = cardCvv,
                            pin = cardPin,
                            notes = [if (cardZip.isNotBlank()) "ZIP: $cardZip" else "", notes].filter { it.isNotBlank() }.joinToString("\n")
                        )
                    } else null
                    val noteData = if (type == "note") NoteData(text = noteContent) else null
                    val idData = if (type == "identity") IdentityData(firstName = idFirst, lastName = idLast, email = idEmail, phone = idPhone, address = idAddress, notes = notes) else null

                    onSave(type, title, selectedFolderId, loginData, cardData, noteData, idData)
                },
                modifier = Modifier
                    .fillMaxWidth()
                    .height(50.dp),
                shape = RoundedCornerShape(10.dp),
                colors = ButtonDefaults.buttonColors(containerColor = NordDark),
                enabled = title.isNotBlank()
            ) {
                Text("Save to Vault", fontWeight = FontWeight.Bold)
            }
        }
    }
}

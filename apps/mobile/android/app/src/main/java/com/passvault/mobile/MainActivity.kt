package com.passvault.mobile

import android.os.Bundle
import android.widget.Toast
import androidx.activity.compose.setContent
import androidx.compose.runtime.*
import androidx.fragment.app.FragmentActivity
import androidx.lifecycle.lifecycleScope
import com.passvault.mobile.autofill.BiometricHelper
import com.passvault.mobile.data.VaultRepository
import com.passvault.mobile.model.DecryptedVaultItem
import com.passvault.mobile.ui.screens.*
import com.passvault.mobile.ui.theme.PassVaultTheme
import kotlinx.coroutines.launch

class MainActivity : FragmentActivity() {

    private lateinit var repository: VaultRepository
    private lateinit var biometricHelper: BiometricHelper

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        repository = VaultRepository(applicationContext)
        biometricHelper = BiometricHelper(this)

        setContent {
            PassVaultTheme {
                MainAppNav(
                    repository = repository,
                    biometricHelper = biometricHelper,
                    onAuthenticateBiometrics = { onBiometricsSuccess ->
                        biometricHelper.authenticateWithFingerprint(
                            onSuccess = { onBiometricsSuccess() },
                            onError = { err ->
                                Toast.makeText(this, err, Toast.LENGTH_SHORT).show()
                            }
                        )
                    }
                )
            }
        }
    }
}

enum class Screen {
    LOCK, VAULT, DETAIL, CREATE, SETTINGS
}

@Composable
fun MainAppNav(
    repository: VaultRepository,
    biometricHelper: BiometricHelper,
    onAuthenticateBiometrics: (onSuccess: () -> Unit) -> Unit
) {
    var currentScreen by remember { mutableStateOf(if (repository.isUnlocked) Screen.VAULT else Screen.LOCK) }
    var selectedItem by remember { mutableStateOf<DecryptedVaultItem?>(null) }
    var createType by remember { mutableStateOf("login") }
    var isLoading by remember { mutableStateOf(false) }
    var errorMessage by remember { mutableStateOf<String?>(null) }
    var isSyncing by remember { mutableStateOf(false) }

    val coroutineScope = rememberCoroutineScope()

    when (currentScreen) {
        Screen.LOCK -> {
            LockScreen(
                userEmail = repository.userEmail,
                serverUrl = repository.serverUrl,
                isLoading = isLoading,
                errorMessage = errorMessage,
                onUnlockWithPassword = { email, pass ->
                    isLoading = true
                    errorMessage = null
                    coroutineScope.launch {
                        val res = repository.unlock(pass, email)
                        isLoading = false
                        if (res.isSuccess) {
                            currentScreen = Screen.VAULT
                        } else {
                            errorMessage = res.exceptionOrNull()?.message ?: "Error al desbloquear"
                        }
                    }
                },
                onUnlockWithBiometrics = {
                    if (biometricHelper.isBiometricAvailable()) {
                        onAuthenticateBiometrics {
                            // Si ya hay salt en caché, desbloquear usando la sesión guardada
                            repository.decryptLocalCache()
                            currentScreen = Screen.VAULT
                        }
                    } else {
                        errorMessage = "Sensor biométrico no disponible en este dispositivo."
                    }
                },
                onSaveServerConfig = { url, email ->
                    repository.serverUrl = url
                    repository.userEmail = email
                }
            )
        }

        Screen.VAULT -> {
            VaultScreen(
                items = repository.decryptedItems,
                folders = repository.folders,
                userEmail = repository.userEmail,
                isSyncing = isSyncing,
                onSelectItem = { item ->
                    selectedItem = item
                    currentScreen = Screen.DETAIL
                },
                onOpenCreate = { type ->
                    createType = type
                    currentScreen = Screen.CREATE
                },
                onCreateFolder = { name ->
                    repository.addFolder(name)
                },
                onOpenSettings = {
                    currentScreen = Screen.SETTINGS
                },
                onSyncNow = {
                    isSyncing = true
                    coroutineScope.launch {
                        repository.sync()
                        isSyncing = false
                    }
                }
            )
        }

        Screen.DETAIL -> {
            selectedItem?.let { item ->
                DetailScreen(
                    item = item,
                    folders = repository.folders,
                    onBack = { currentScreen = Screen.VAULT },
                    onMoveToFolder = { newFolderId ->
                        coroutineScope.launch {
                            repository.saveItem(
                                id = item.id,
                                type = item.type,
                                name = item.name,
                                folderId = newFolderId,
                                login = item.loginData,
                                card = item.cardData,
                                note = item.noteData,
                                identity = item.identityData
                            )
                            selectedItem = repository.decryptedItems.find { it.id == item.id }
                        }
                    }
                )
            } ?: run {
                currentScreen = Screen.VAULT
            }
        }

        Screen.CREATE -> {
            CreateItemScreen(
                initialType = createType,
                folders = repository.folders,
                onBack = { currentScreen = Screen.VAULT },
                onSave = { type, name, folderId, login, card, note, identity ->
                    coroutineScope.launch {
                        repository.saveItem(
                            type = type,
                            name = name,
                            folderId = folderId,
                            login = login,
                            card = card,
                            note = note,
                            identity = identity
                        )
                        currentScreen = Screen.VAULT
                    }
                }
            )
        }

        Screen.SETTINGS -> {
            SettingsScreen(
                userEmail = repository.userEmail,
                serverUrl = repository.serverUrl,
                isBiometricEnabled = repository.isBiometricEnabled,
                onToggleBiometric = { repository.isBiometricEnabled = it },
                onUpdateServerUrl = { repository.serverUrl = it },
                onSyncNow = {
                    coroutineScope.launch { repository.sync() }
                },
                onLockVault = {
                    repository.lock()
                    currentScreen = Screen.LOCK
                },
                onLogout = {
                    repository.logout()
                    currentScreen = Screen.LOCK
                },
                onBack = { currentScreen = Screen.VAULT }
            )
        }
    }
}


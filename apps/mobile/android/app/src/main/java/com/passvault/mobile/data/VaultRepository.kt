package com.passvault.mobile.data

import android.content.Context
import android.content.SharedPreferences
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import com.passvault.mobile.crypto.CryptoEngine
import com.passvault.mobile.model.*
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import kotlinx.serialization.encodeToString
import kotlinx.serialization.json.Json
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.OkHttpClient
import okhttp3.Request
import okhttp3.RequestBody.Companion.toRequestBody
import org.json.JSONObject
import java.util.UUID
import java.util.concurrent.TimeUnit
import javax.crypto.SecretKey

class VaultRepository(private val context: Context) {

    private val prefs: SharedPreferences =
        context.getSharedPreferences("passvault_secure_store", Context.MODE_PRIVATE)

    private val json = Json { ignoreUnknownKeys = true; isLenient = true; encodeDefaults = true }
    private val httpClient = OkHttpClient.Builder()
        .connectTimeout(5, TimeUnit.SECONDS)
        .readTimeout(10, TimeUnit.SECONDS)
        .build()

    var isUnlocked: Boolean = false
        private set

    var vaultKey: SecretKey? = null
        private set

    var decryptedItems: List<DecryptedVaultItem> by mutableStateOf(emptyList())
        private set

    var folders: List<Folder> by mutableStateOf(emptyList())
        private set

    var serverUrl: String
        get() = prefs.getString("server_url", "http://192.168.1.126:3000") ?: "http://192.168.1.126:3000"
        set(value) = prefs.edit().putString("server_url", value).apply()

    var userEmail: String?
        get() = prefs.getString("user_email", null)
        set(value) = prefs.edit().putString("user_email", value).apply()

    var userSalt: String?
        get() = prefs.getString("user_salt", null)
        set(value) = prefs.edit().putString("user_salt", value).apply()

    var userToken: String?
        get() = prefs.getString("user_token", null)
        set(value) = prefs.edit().putString("user_token", value).apply()

    var isBiometricEnabled: Boolean
        get() = prefs.getBoolean("biometric_enabled", true)
        set(value) = prefs.edit().putBoolean("biometric_enabled", value).apply()

    init {
        loadCachedFolders()
    }

    private fun loadCachedFolders() {
        val raw = prefs.getString("cached_folders", null)
        if (raw != null) {
            try {
                folders = json.decodeFromString<List<Folder>>(raw)
            } catch (e: Exception) {
                folders = emptyList()
            }
        }
    }

    /**
     * Desbloquea la bóveda con la Contraseña Maestra (Zero-Knowledge)
     */
    suspend fun unlock(masterPassword: String, targetEmail: String? = null): Result<Unit> = withContext(Dispatchers.IO) {
        val email = targetEmail ?: userEmail ?: return@withContext Result.failure(Exception("Email no configurado"))
        userEmail = email

        var salt = userSalt
        var token: String? = null

        // 1. Intentar conectar con el servidor para prelogin
        try {
            val preloginBody = JSONObject().put("email", email).toString()
            val request = Request.Builder()
                .url("$serverUrl/api/v1/auth/prelogin")
                .post(preloginBody.toRequestBody("application/json".toMediaType()))
                .build()

            val response = httpClient.newCall(request).execute()
            if (response.isSuccessful) {
                val body = response.body?.string()
                if (body != null) {
                    val preloginJson = JSONObject(body)
                    salt = preloginJson.getString("salt")
                    userSalt = salt
                }
            }
        } catch (e: Exception) {
            // Servidor apagado (laptop apagada): se usa el salt guardado offline
        }

        if (salt == null) {
            return@withContext Result.failure(Exception("Sin conexión con el servidor y sin caché local previa."))
        }

        // 2. Derivar claves criptográficas
        val derived = CryptoEngine.deriveKeys(masterPassword, salt)
        vaultKey = derived.vaultKey

        // 3. Intentar login en el servidor si hay conexión
        try {
            val loginBody = JSONObject()
                .put("email", email)
                .put("authHash", derived.authHash)
                .toString()

            val loginReq = Request.Builder()
                .url("$serverUrl/api/v1/auth/login")
                .post(loginBody.toRequestBody("application/json".toMediaType()))
                .build()

            val loginRes = httpClient.newCall(loginReq).execute()
            if (loginRes.isSuccessful) {
                val resBody = loginRes.body?.string()
                if (resBody != null) {
                    val loginJson = JSONObject(resBody)
                    token = loginJson.getString("token")
                    userToken = token
                }
            } else if (loginRes.code == 401) {
                return@withContext Result.failure(Exception("Contraseña maestra incorrecta"))
            } else {
                return@withContext Result.failure(Exception("Error en servidor (${loginRes.code})"))
            }
        } catch (e: Exception) {
            // Modo Offline: si el servidor está apagado
        }

        isUnlocked = true

        // Guardar clave para acceso biométrico seguro en este dispositivo
        if (isBiometricEnabled && vaultKey != null) {
            val b64Key = android.util.Base64.encodeToString(vaultKey!!.encoded, android.util.Base64.NO_WRAP)
            prefs.edit().putString("biometric_vault_key", b64Key).apply()
        }

        // 4. Cargar y descifrar elementos de la caché local o sincronizar
        if (token != null) {
            syncInternal(token)
        } else {
            decryptLocalCache()
        }

        Result.success(Unit)
    }

    /**
     * Descifra la copia local guardada en el celular para acceso 100% offline
     */
    fun decryptLocalCache() {
        val key = vaultKey ?: return
        val raw = prefs.getString("cached_vault", null) ?: return

        try {
            val encryptedList = json.decodeFromString<List<EncryptedVaultItem>>(raw)
            val result = mutableListOf<DecryptedVaultItem>()

            for (enc in encryptedList) {
                try {
                    val plain = CryptoEngine.decrypt(enc.encryptedPayload, key)
                    var loginData: LoginData? = null
                    var cardData: CardData? = null
                    var noteData: NoteData? = null
                    var identityData: IdentityData? = null

                    when (enc.type) {
                        "login" -> loginData = json.decodeFromString<LoginData>(plain)
                        "card" -> cardData = json.decodeFromString<CardData>(plain)
                        "note" -> noteData = json.decodeFromString<NoteData>(plain)
                        "identity" -> identityData = json.decodeFromString<IdentityData>(plain)
                    }

                    result.add(
                        DecryptedVaultItem(
                            id = enc.id,
                            type = enc.type,
                            name = enc.name,
                            favorite = enc.favorite,
                            folderId = enc.folderId,
                            createdAt = enc.createdAt,
                            updatedAt = enc.updatedAt,
                            version = enc.version,
                            loginData = loginData,
                            cardData = cardData,
                            noteData = noteData,
                            identityData = identityData
                        )
                    )
                } catch (e: Exception) {
                    // Item no pudo descifrarse
                }
            }
            decryptedItems = result
        } catch (e: Exception) {
            e.printStackTrace()
        }
    }

    /**
     * Sincroniza en tiempo real con el servidor Fastify
     */
    suspend fun sync(): Result<Unit> = withContext(Dispatchers.IO) {
        val token = userToken ?: return@withContext Result.failure(Exception("No autenticado en el servidor"))
        syncInternal(token)
    }

    private fun syncInternal(token: String): Result<Unit> {
        return try {
            val req = Request.Builder()
                .url("$serverUrl/api/v1/vault/sync")
                .header("Authorization", "Bearer $token")
                .get()
                .build()

            val res = httpClient.newCall(req).execute()
            if (!res.isSuccessful) {
                decryptLocalCache()
                return Result.failure(Exception("Error servidor: ${res.code}"))
            }

            val body = res.body?.string() ?: return Result.failure(Exception("Respuesta vacía"))
            val syncResponse = json.decodeFromString<SyncResponse>(body)

            val activeItems = syncResponse.items.filter { !it.deleted }

            // Guardar copia local cifrada para acceso offline en el S25 Ultra
            prefs.edit().putString("cached_vault", json.encodeToString(activeItems)).apply()

            // Descifrar en memoria
            decryptLocalCache()
            Result.success(Unit)
        } catch (e: Exception) {
            decryptLocalCache()
            Result.failure(e)
        }
    }

    /**
     * Guarda un elemento nuevo o actualizado
     */
    suspend fun saveItem(
        id: String = UUID.randomUUID().toString(),
        type: String,
        name: String,
        folderId: String? = null,
        login: LoginData? = null,
        card: CardData? = null,
        note: NoteData? = null,
        identity: IdentityData? = null
    ): Result<Unit> = withContext(Dispatchers.IO) {
        val key = vaultKey ?: return@withContext Result.failure(Exception("Bóveda bloqueada"))

        val plaintext = when (type) {
            "login" -> json.encodeToString(login ?: LoginData())
            "card" -> json.encodeToString(card ?: CardData())
            "note" -> json.encodeToString(note ?: NoteData())
            "identity" -> json.encodeToString(identity ?: IdentityData())
            else -> "{}"
        }

        val encryptedPayload = CryptoEngine.encrypt(plaintext, key)
        val now = java.time.Instant.now().toString()

        val encryptedItem = EncryptedVaultItem(
            id = id,
            type = type,
            name = name,
            folderId = folderId,
            createdAt = now,
            updatedAt = now,
            encryptedPayload = encryptedPayload
        )

        // Actualizar lista en memoria
        val newDecrypted = DecryptedVaultItem(
            id = id,
            type = type,
            name = name,
            folderId = folderId,
            createdAt = now,
            updatedAt = now,
            loginData = login,
            cardData = card,
            noteData = note,
            identityData = identity
        )

        val updatedList = decryptedItems.filter { it.id != id }.toMutableList()
        updatedList.add(0, newDecrypted)
        decryptedItems = updatedList

        // Guardar en copia local cifrada
        val currentCachedRaw = prefs.getString("cached_vault", "[]") ?: "[]"
        val currentCached = json.decodeFromString<List<EncryptedVaultItem>>(currentCachedRaw).toMutableList()
        currentCached.removeAll { it.id == id }
        currentCached.add(0, encryptedItem)
        prefs.edit().putString("cached_vault", json.encodeToString(currentCached)).apply()

        // Si hay token, sincronizar con el servidor
        val token = userToken
        if (token != null) {
            try {
                val syncBody = JSONObject()
                    .put("items", org.json.JSONArray(listOf(JSONObject(json.encodeToString(encryptedItem)))))
                    .toString()

                val syncReq = Request.Builder()
                    .url("$serverUrl/api/v1/vault/sync")
                    .header("Authorization", "Bearer $token")
                    .post(syncBody.toRequestBody("application/json".toMediaType()))
                    .build()

                httpClient.newCall(syncReq).execute()
            } catch (e: Exception) {
                // Sincronización en diferido
            }
        }

        Result.success(Unit)
    }

    fun addFolder(name: String): Folder {
        val newFolder = Folder(id = UUID.randomUUID().toString(), name = name)
        folders = folders + newFolder
        prefs.edit().putString("cached_folders", json.encodeToString(folders)).apply()
        return newFolder
    }

    suspend fun deleteFolder(folderId: String) = withContext(Dispatchers.IO) {
        folders = folders.filter { it.id != folderId }
        prefs.edit().putString("cached_folders", json.encodeToString(folders)).apply()

        // Mover items de esa carpeta a la raíz
        for (item in decryptedItems.filter { it.folderId == folderId }) {
            saveItem(
                id = item.id,
                type = item.type,
                name = item.name,
                folderId = null,
                login = item.loginData,
                card = item.cardData,
                note = item.noteData,
                identity = item.identityData
            )
        }
    }

    fun canUnlockWithBiometrics(): Boolean {
        return isBiometricEnabled && prefs.getString("biometric_vault_key", null) != null && !userEmail.isNullOrBlank()
    }

    fun unlockWithBiometrics(): Boolean {
        if (!isBiometricEnabled) return false
        val b64Key = prefs.getString("biometric_vault_key", null) ?: return false
        return try {
            val keyBytes = android.util.Base64.decode(b64Key, android.util.Base64.NO_WRAP)
            vaultKey = javax.crypto.spec.SecretKeySpec(keyBytes, "AES")
            isUnlocked = true
            decryptLocalCache()
            true
        } catch (e: Exception) {
            false
        }
    }

    suspend fun testServerConnection(url: String): Boolean = withContext(Dispatchers.IO) {
        try {
            val req = Request.Builder().url("$url/health").get().build()
            val res = httpClient.newCall(req).execute()
            res.isSuccessful
        } catch (e: Exception) {
            false
        }
    }

    fun lock() {
        isUnlocked = false
        vaultKey = null
        decryptedItems = emptyList()
    }

    fun logout() {
        lock()
        prefs.edit().clear().apply()
    }
}


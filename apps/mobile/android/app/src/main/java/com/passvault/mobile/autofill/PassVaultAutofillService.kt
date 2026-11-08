package com.passvault.mobile.autofill

import android.app.assist.AssistStructure
import android.app.assist.AssistStructure.ViewNode
import android.os.CancellationSignal
import android.service.autofill.*
import android.view.autofill.AutofillId
import android.view.autofill.AutofillValue
import android.widget.RemoteViews
import com.passvault.mobile.R

/**
 * Servicio de Autollenado Nativo para Android (Optimizado para Samsung One UI 7 / Android 15 en S25 Ultra)
 * Permite que las contraseñas guardadas en la laptop se sugieran en el teclado o en pantalla
 * dentro de cualquier aplicación móvil o navegador en el dispositivo.
 */
class PassVaultAutofillService : AutofillService() {

    override fun onFillRequest(
        request: FillRequest,
        cancellationSignal: CancellationSignal,
        callback: FillCallback
    ) {
        val structure = request.fillContexts.lastOrNull()?.structure ?: run {
            callback.onSuccess(null)
            return
        }

        val packageName = structure.activityComponent.packageName
        var detectedDomain: String? = null
        var usernameId: AutofillId? = null
        var passwordId: AutofillId? = null

        // 1. Recorrer el árbol de vistas (AssistStructure) para identificar campos
        fun traverseNode(node: ViewNode) {
            val hints = node.autofillHints?.toList() ?: emptyList()
            val text = node.text?.toString() ?: ""
            val idEntry = node.idEntry?.lowercase() ?: ""

            // Detectar dominio web si se navega desde Brave, Chrome o Samsung Internet
            if (node.webDomain != null) {
                detectedDomain = node.webDomain
            }

            // Identificar campo de usuario / correo
            if (usernameId == null) {
                if (hints.contains(ViewNode.AUTOFILL_HINT_USERNAME) ||
                    hints.contains(ViewNode.AUTOFILL_HINT_EMAIL_ADDRESS) ||
                    idEntry.contains("user") || idEntry.contains("email") || idEntry.contains("login")
                ) {
                    usernameId = node.autofillId
                }
            }

            // Identificar campo de contraseña
            if (passwordId == null) {
                if (hints.contains(ViewNode.AUTOFILL_HINT_PASSWORD) ||
                    idEntry.contains("pass") || idEntry.contains("clave") || idEntry.contains("pwd")
                ) {
                    passwordId = node.autofillId
                }
            }

            for (i in 0 until node.childCount) {
                traverseNode(node.getChildAt(i))
            }
        }

        for (i in 0 until structure.windowNodeCount) {
            traverseNode(structure.getWindowNodeAt(i).rootViewNode)
        }

        // Si no se detectó al menos un campo de contraseña o usuario, no sugerir
        if (passwordId == null && usernameId == null) {
            callback.onSuccess(null)
            return
        }

        // 2. Consultar credenciales locales descifradas
        val targetQuery = detectedDomain ?: packageName
        val matchingLogins = VaultLocalCache.getMatchingLogins(targetQuery)

        // 3. Construir la respuesta
        val responseBuilder = FillResponse.Builder()

        // CONFIGURAR SAVEINFO PARA AUTOGUARDADO INTELIGENTE EN SAMSUNG S25 ULTRA
        // Permite que cuando el usuario escriba credenciales en cualquier app (Instagram, Netflix, banco)
        // o navegador, Android muestre automáticamente la ventana nativa: "¿Guardar en PassVault?"
        val requiredIds = mutableListOf<AutofillId>()
        if (passwordId != null) requiredIds.add(passwordId!!)

        val optionalIds = mutableListOf<AutofillId>()
        if (usernameId != null) optionalIds.add(usernameId!!)

        if (requiredIds.isNotEmpty()) {
            val saveInfoBuilder = SaveInfo.Builder(
                SaveInfo.SAVE_DATA_TYPE_PASSWORD or SaveInfo.SAVE_DATA_TYPE_USERNAME,
                requiredIds.toTypedArray()
            )
            if (optionalIds.isNotEmpty()) {
                saveInfoBuilder.setOptionalIds(optionalIds.toTypedArray())
            }
            saveInfoBuilder.setDescription("Guardar en PassVault")
            responseBuilder.setSaveInfo(saveInfoBuilder.build())
        }

        // Si tenemos credenciales coincidentes, poblar Datasets para sugerencias en Samsung Keyboard
        for (login in matchingLogins) {
            val presentation = RemoteViews(packageName, android.R.layout.simple_list_item_2).apply {
                setTextViewText(android.R.id.text1, login.title)
                setTextViewText(android.R.id.text2, login.username)
            }

            val datasetBuilder = Dataset.Builder()

            if (usernameId != null) {
                datasetBuilder.setValue(
                    usernameId!!,
                    AutofillValue.forText(login.username),
                    presentation
                )
            }

            if (passwordId != null) {
                datasetBuilder.setValue(
                    passwordId!!,
                    AutofillValue.forText(login.password),
                    presentation
                )
            }

            responseBuilder.addDataset(datasetBuilder.build())
        }

        // Si no hay logins pero sí hay campos para autoguardar, enviar response con SaveInfo
        if (matchingLogins.isEmpty() && requiredIds.isEmpty()) {
            callback.onSuccess(null)
            return
        }

        callback.onSuccess(responseBuilder.build())
    }

    override fun onSaveRequest(request: SaveRequest, callback: SaveCallback) {
        // Intercepta las credenciales enviadas en el celular y las guarda automáticamente en la bóveda
        val structure = request.fillContexts.lastOrNull()?.structure ?: run {
            callback.onSuccess()
            return
        }

        var detectedUsername = ""
        var detectedPassword = ""
        var domainOrPackage = structure.activityComponent.packageName

        fun extractValues(node: ViewNode) {
            if (node.webDomain != null) {
                domainOrPackage = node.webDomain
            }

            val hints = node.autofillHints?.toList() ?: emptyList()
            val text = node.text?.toString() ?: node.autofillValue?.textValue?.toString() ?: ""
            val idEntry = node.idEntry?.lowercase() ?: ""

            if (detectedPassword.isEmpty()) {
                if (hints.contains(ViewNode.AUTOFILL_HINT_PASSWORD) ||
                    idEntry.contains("pass") || idEntry.contains("clave") || idEntry.contains("pwd")
                ) {
                    if (text.isNotEmpty()) detectedPassword = text
                }
            }

            if (detectedUsername.isEmpty()) {
                if (hints.contains(ViewNode.AUTOFILL_HINT_USERNAME) ||
                    hints.contains(ViewNode.AUTOFILL_HINT_EMAIL_ADDRESS) ||
                    idEntry.contains("user") || idEntry.contains("email") || idEntry.contains("login")
                ) {
                    if (text.isNotEmpty()) detectedUsername = text
                }
            }

            for (i in 0 until node.childCount) {
                extractValues(node.getChildAt(i))
            }
        }

        for (i in 0 until structure.windowNodeCount) {
            extractValues(structure.getWindowNodeAt(i).rootViewNode)
        }

        if (detectedPassword.isNotEmpty()) {
            val title = domainOrPackage.replaceFirstChar { it.uppercase() }
            val newLogin = MobileLoginCredential(
                id = java.util.UUID.randomUUID().toString(),
                title = title,
                username = detectedUsername.ifEmpty { "Usuario móvil" },
                password = detectedPassword,
                domains = listOf(domainOrPackage)
            )
            VaultLocalCache.saveNewCredential(newLogin)
        }

        callback.onSuccess()
    }
}

/**
 * Cache local seguro y modelo de credenciales en Android
 */
data class MobileLoginCredential(
    val id: String,
    val title: String,
    val username: String,
    val password: String,
    val domains: List<String>
)

object VaultLocalCache {
    private val cachedLogins = mutableListOf<MobileLoginCredential>()

    fun setCredentials(logins: List<MobileLoginCredential>) {
        cachedLogins.clear()
        cachedLogins.addAll(logins)
    }

    fun getMatchingLogins(query: String): List<MobileLoginCredential> {
        val q = query.lowercase()
        return cachedLogins.filter { login ->
            login.domains.any { domain -> q.contains(domain.lowercase()) || domain.lowercase().contains(q) } ||
            login.title.lowercase().contains(q)
        }
    }

    fun saveNewCredential(credential: MobileLoginCredential) {
        cachedLogins.removeAll { it.title.equals(credential.title, ignoreCase = true) && it.username == credential.username }
        cachedLogins.add(0, credential)
    }
}


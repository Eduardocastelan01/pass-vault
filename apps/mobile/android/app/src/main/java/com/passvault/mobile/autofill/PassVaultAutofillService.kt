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

        if (matchingLogins.isEmpty()) {
            callback.onSuccess(null)
            return
        }

        // 3. Construir la respuesta con los Datasets para sugerencias en Samsung Keyboard / Gboard
        val responseBuilder = FillResponse.Builder()

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

        callback.onSuccess(responseBuilder.build())
    }

    override fun onSaveRequest(request: SaveRequest, callback: SaveCallback) {
        // Guarda credenciales nuevas introducidas en el celular y las envía al servidor de sincronización
        val structure = request.fillContexts.lastOrNull()?.structure
        if (structure != null) {
            VaultLocalCache.captureAndSaveNewCredentials(structure)
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

    fun captureAndSaveNewCredentials(structure: AssistStructure) {
        // Encola la sincronización en segundo plano con WorkManager
    }
}

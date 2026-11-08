package com.passvault.mobile.model

import kotlinx.serialization.Serializable

@Serializable
enum class ItemType {
    LOGIN, CARD, NOTE, IDENTITY
}

@Serializable
data class EncryptedPayload(
    val iv: String,
    val ciphertext: String,
    val tag: String
)

@Serializable
data class EncryptedVaultItem(
    val id: String,
    val type: String,
    val name: String,
    val favorite: Boolean = false,
    val folderId: String? = null,
    val createdAt: String = "",
    val updatedAt: String = "",
    val version: Int = 1,
    val deleted: Boolean = false,
    val encryptedPayload: EncryptedPayload
)

@Serializable
data class LoginData(
    val username: String = "",
    val password: String = "",
    val uris: List<String> = emptyList(),
    val totpSecret: String? = null,
    val notes: String? = null
)

@Serializable
data class CardData(
    val cardholderName: String = "",
    val brand: String = "other",
    val number: String = "",
    val expMonth: String = "",
    val expYear: String = "",
    val cvv: String = "",
    val pin: String? = null,
    val notes: String? = null
)

@Serializable
data class NoteData(
    val text: String = ""
)

@Serializable
data class IdentityData(
    val title: String? = null,
    val firstName: String = "",
    val lastName: String = "",
    val email: String? = null,
    val phone: String? = null,
    val address: String? = null,
    val passportOrId: String? = null,
    val notes: String? = null
)

data class DecryptedVaultItem(
    val id: String,
    val type: String,
    val name: String,
    val favorite: Boolean = false,
    val folderId: String? = null,
    val createdAt: String,
    val updatedAt: String,
    val version: Int = 1,
    val loginData: LoginData? = null,
    val cardData: CardData? = null,
    val noteData: NoteData? = null,
    val identityData: IdentityData? = null
)

@Serializable
data class Folder(
    val id: String,
    val name: String
)

@Serializable
data class SyncResponse(
    val items: List<EncryptedVaultItem> = emptyList(),
    val serverTime: String = ""
)


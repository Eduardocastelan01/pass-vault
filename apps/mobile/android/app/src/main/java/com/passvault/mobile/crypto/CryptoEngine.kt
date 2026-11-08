package com.passvault.mobile.crypto

import android.util.Base64
import com.passvault.mobile.model.EncryptedPayload
import java.nio.charset.StandardCharsets
import java.security.SecureRandom
import javax.crypto.Cipher
import javax.crypto.Mac
import javax.crypto.SecretKey
import javax.crypto.SecretKeyFactory
import javax.crypto.spec.GCMParameterSpec
import javax.crypto.spec.PBEKeySpec
import javax.crypto.spec.SecretKeySpec

data class DerivedKeys(
    val vaultKey: SecretKey,
    val authHash: String
)

/**
 * Motor Criptográfico Nativo Zero-Knowledge de PassVault para Android
 * Totalmente compatible con la extensión de navegador y servidor Fastify
 */
object CryptoEngine {
    private const val PBKDF2_ITERATIONS = 600000
    private const val KEY_LENGTH_BITS = 256
    private const val GCM_IV_LENGTH_BYTES = 12
    private const val GCM_TAG_LENGTH_BITS = 128

    /**
     * Deriva las claves a partir de la Contraseña Maestra y el Salt en Hexadecimal
     */
    fun deriveKeys(masterPassword: String, saltHex: String): DerivedKeys {
        val saltBytes = hexToBytes(saltHex)
        val spec = PBEKeySpec(
            masterPassword.toCharArray(),
            saltBytes,
            PBKDF2_ITERATIONS,
            KEY_LENGTH_BITS
        )
        val factory = SecretKeyFactory.getInstance("PBKDF2WithHmacSHA256")
        val masterKeyBytes = factory.generateSecret(spec).encoded

        // Subclave 1: vaultKey para cifrado AES-256-GCM
        val vaultKeyBytes = hkdfExpand(masterKeyBytes, "passvault-encryption-key".toByteArray(StandardCharsets.UTF_8), 32)
        val vaultKey = SecretKeySpec(vaultKeyBytes, "AES")

        // Subclave 2: authHash que se envía al servidor para autenticar
        val authHashBytes = hkdfExpand(masterKeyBytes, "passvault-authentication-hash".toByteArray(StandardCharsets.UTF_8), 32)
        val authHash = bytesToHex(authHashBytes)

        return DerivedKeys(vaultKey, authHash)
    }

    /**
     * Cifra una cadena JSON con AES-256-GCM
     */
    fun encrypt(plaintext: String, vaultKey: SecretKey): EncryptedPayload {
        val iv = ByteArray(GCM_IV_LENGTH_BYTES)
        SecureRandom().nextBytes(iv)

        val cipher = Cipher.getInstance("AES/GCM/NoPadding")
        val spec = GCMParameterSpec(GCM_TAG_LENGTH_BITS, iv)
        cipher.init(Cipher.ENCRYPT_MODE, vaultKey, spec)

        val encryptedWithTag = cipher.doFinal(plaintext.toByteArray(StandardCharsets.UTF_8))
        val tagLengthBytes = GCM_TAG_LENGTH_BITS / 8
        val ciphertextLength = encryptedWithTag.size - tagLengthBytes

        val ciphertext = ByteArray(ciphertextLength)
        val tag = ByteArray(tagLengthBytes)

        System.arraycopy(encryptedWithTag, 0, ciphertext, 0, ciphertextLength)
        System.arraycopy(encryptedWithTag, ciphertextLength, tag, 0, tagLengthBytes)

        return EncryptedPayload(
            iv = Base64.encodeToString(iv, Base64.NO_WRAP),
            ciphertext = Base64.encodeToString(ciphertext, Base64.NO_WRAP),
            tag = Base64.encodeToString(tag, Base64.NO_WRAP)
        )
    }

    /**
     * Descifra un EncryptedPayload con AES-256-GCM
     */
    fun decrypt(payload: EncryptedPayload, vaultKey: SecretKey): String {
        val iv = Base64.decode(payload.iv, Base64.DEFAULT)
        val ciphertext = Base64.decode(payload.ciphertext, Base64.DEFAULT)
        val tag = Base64.decode(payload.tag, Base64.DEFAULT)

        val combined = ByteArray(ciphertext.size + tag.size)
        System.arraycopy(ciphertext, 0, combined, 0, ciphertext.size)
        System.arraycopy(tag, 0, combined, ciphertext.size, tag.size)

        val cipher = Cipher.getInstance("AES/GCM/NoPadding")
        val spec = GCMParameterSpec(GCM_TAG_LENGTH_BITS, iv)
        cipher.init(Cipher.DECRYPT_MODE, vaultKey, spec)

        val decryptedBytes = cipher.doFinal(combined)
        return String(decryptedBytes, StandardCharsets.UTF_8)
    }

    private fun hkdfExpand(prk: ByteArray, info: ByteArray, length: Int): ByteArray {
        val mac = Mac.getInstance("HmacSHA256")
        mac.init(SecretKeySpec(prk, "HmacSHA256"))
        mac.update(info)
        mac.update(0x01.toByte())
        val output = mac.doFinal()
        return output.copyOf(length)
    }

    fun hexToBytes(hex: String): ByteArray {
        val len = hex.length
        val data = ByteArray(len / 2)
        var i = 0
        while (i < len) {
            data[i / 2] = ((Character.digit(hex[i], 16) shl 4) + Character.digit(hex[i + 1], 16)).toByte()
            i += 2
        }
        return data
    }

    fun bytesToHex(bytes: ByteArray): String {
        val hexChars = "0123456789abcdef"
        val result = StringBuilder(bytes.size * 2)
        for (b in bytes) {
            val v = b.toInt() and 0xFF
            result.append(hexChars[v ushr 4])
            result.append(hexChars[v and 0x0F])
        }
        return result.toString()
    }
}

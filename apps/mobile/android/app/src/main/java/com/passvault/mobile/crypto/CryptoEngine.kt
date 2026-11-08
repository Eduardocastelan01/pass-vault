package com.passvault.mobile.crypto

import android.util.Base64
import com.passvault.mobile.model.EncryptedPayload
import org.bouncycastle.crypto.generators.Argon2BytesGenerator
import org.bouncycastle.crypto.params.Argon2Parameters
import java.nio.charset.StandardCharsets
import java.security.MessageDigest
import java.security.SecureRandom
import javax.crypto.Cipher
import javax.crypto.Mac
import javax.crypto.SecretKey
import javax.crypto.spec.GCMParameterSpec
import javax.crypto.spec.SecretKeySpec

data class DerivedKeys(
    val vaultKey: SecretKey,
    val authHash: String
)

/**
 * Motor Criptográfico Nativo Zero-Knowledge de PassVault para Android
 * 100% Compatible a nivel de bits con @pass-vault/core (Argon2id + HKDF + AES-256-GCM)
 */
object CryptoEngine {
    private const val GCM_IV_LENGTH_BYTES = 12
    private const val GCM_TAG_LENGTH_BITS = 128

    /**
     * Deriva las claves a partir de la Contraseña Maestra y el Salt con Argon2id y HKDF
     * Exactamente igual que la extensión de navegador
     */
    fun deriveKeys(masterPassword: String, saltHex: String): DerivedKeys {
        val saltBytes = hexToBytes(saltHex)

        // 1. Derivación principal con Argon2id (RFC 9106)
        // parallelism: 4, iterations: 3, memorySize: 65536 KB, hashLength: 32 bytes (256 bits)
        val params = Argon2Parameters.Builder(Argon2Parameters.ARGON2_id)
            .withVersion(Argon2Parameters.ARGON2_VERSION_13)
            .withIterations(3)
            .withMemoryAsKB(65536)
            .withParallelism(4)
            .withSalt(saltBytes)
            .build()

        val generator = Argon2BytesGenerator()
        generator.init(params)
        val masterKeyBytes = ByteArray(32)
        generator.generateBytes(masterPassword.toByteArray(StandardCharsets.UTF_8), masterKeyBytes, 0, masterKeyBytes.size)

        // 2. HKDF Extract: PRK = HMAC-SHA256(key = ByteArray(0), data = masterKeyBytes)
        val prkMac = Mac.getInstance("HmacSHA256")
        prkMac.init(SecretKeySpec(ByteArray(0), "HmacSHA256"))
        val prk = prkMac.doFinal(masterKeyBytes)

        // 3. HKDF Expand para vaultKey (AES-256-GCM) con info: "vault-encryption"
        val vaultMac = Mac.getInstance("HmacSHA256")
        vaultMac.init(SecretKeySpec(prk, "HmacSHA256"))
        vaultMac.update("vault-encryption".toByteArray(StandardCharsets.UTF_8))
        vaultMac.update(0x01.toByte())
        val vaultKeyBytes = vaultMac.doFinal()
        val vaultKey = SecretKeySpec(vaultKeyBytes, "AES")

        // 4. HKDF Expand para authKeyBits con info: "server-auth"
        val authMac = Mac.getInstance("HmacSHA256")
        authMac.init(SecretKeySpec(prk, "HmacSHA256"))
        authMac.update("server-auth".toByteArray(StandardCharsets.UTF_8))
        authMac.update(0x01.toByte())
        val authKeyBits = authMac.doFinal()

        // 5. Hash SHA-256 final para authHash
        val md = MessageDigest.getInstance("SHA-256")
        val authHash = bytesToHex(md.digest(authKeyBits))

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


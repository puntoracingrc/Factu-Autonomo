package app.factu.fast.nfc

import android.app.Application
import com.stripe.stripeterminal.TerminalApplicationDelegate
import com.stripe.stripeterminal.taptopay.TapToPay
import com.stripe.stripeterminal.external.callable.ConnectionTokenProvider
import com.stripe.stripeterminal.external.callable.ConnectionTokenCallback
import com.stripe.stripeterminal.external.models.ConnectionTokenException
import org.json.JSONObject
import java.net.URL
import javax.net.ssl.HttpsURLConnection
import kotlin.concurrent.thread

class FastNfcApplication : Application() {
    override fun onCreate() {
        super.onCreate()
        if (TapToPay.isInTapToPayProcess()) return
        TerminalApplicationDelegate.onCreate(this)
    }
}

/** Terminal is process-wide. Its token provider must survive Activity recreation
 * without retaining a destroyed screen or an old Google/device credential. */
object NfcTokenProvider : ConnectionTokenProvider {
    @Volatile var grant: String? = null
    override fun fetchConnectionToken(callback: ConnectionTokenCallback) {
        val credential = grant
        if (credential == null) { callback.onFailure(ConnectionTokenException("Abre el cobro desde Fast.")); return }
        thread(name = "fast-nfc-token") {
            try {
                val connection = URL("https://fast.facturacion-autonomos.app/api/factu-rapido/terminal-device").openConnection() as HttpsURLConnection
                val response = try {
                    connection.requestMethod = "POST"; connection.instanceFollowRedirects = false
                    connection.connectTimeout = 15000; connection.readTimeout = 20000; connection.doOutput = true
                    connection.setRequestProperty("Authorization", "FastNfc $credential")
                    connection.setRequestProperty("Content-Type", "application/json")
                    connection.outputStream.use { it.write("{\"action\":\"token\"}".toByteArray(Charsets.UTF_8)) }
                    if (connection.responseCode !in 200..299) throw Exception()
                    val bytes = connection.inputStream.use { it.readNBytes(32769) }
                    if (bytes.size > 32768) throw Exception()
                    JSONObject(String(bytes, Charsets.UTF_8))
                } finally { connection.disconnect() }
                if (grant != credential || !response.optBoolean("ok")) throw Exception()
                callback.onSuccess(response.getString("secret"))
            } catch (_: Exception) { callback.onFailure(ConnectionTokenException("No se pudo autorizar el lector. Reabre el mismo cobro en Fast.")) }
        }
    }
}

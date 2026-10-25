package app.factu.fast.nfc

import android.Manifest
import android.app.Activity
import android.content.Intent
import android.content.pm.PackageManager
import android.net.Uri
import android.nfc.NfcAdapter
import android.os.Bundle
import android.provider.Settings
import android.view.WindowManager
import android.widget.Button
import android.widget.LinearLayout
import android.widget.TextView
import com.stripe.stripeterminal.Terminal
import com.stripe.stripeterminal.external.callable.*
import com.stripe.stripeterminal.external.models.*
import com.stripe.stripeterminal.log.LogLevel
import org.json.JSONObject
import java.net.URL
import java.text.NumberFormat
import java.util.Locale
import java.util.concurrent.Executors
import javax.net.ssl.HttpsURLConnection

/** Companion only: Chrome holds the Google session; Stripe owns all card/PIN UI.
 * Neither API keys, card data nor handoff credentials are stored on disk. */
class MainActivity : Activity() {
    private val worker = Executors.newSingleThreadExecutor()
    private lateinit var message: TextView
    private lateinit var amount: TextView
    private lateinit var pay: Button
    private lateinit var check: Button
    private var grant: String? = null
    private var details: JSONObject? = null
    private var active: Cancelable? = null
    private var busy = false
    private var discovering = false
    private var generation = 0
    private val noop = object : Callback {
        override fun onSuccess() {}
        override fun onFailure(e: TerminalException) {}
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        window.addFlags(WindowManager.LayoutParams.FLAG_SECURE)
        val layout = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            setPadding(48, 88, 48, 40)
            setBackgroundColor(0xfff5f8fb.toInt())
        }
        layout.addView(TextView(this).apply { text = "FAST · Cobro NFC"; textSize = 26f })
        amount = TextView(this).apply { textSize = 34f; setPadding(0, 48, 0, 24) }
        message = TextView(this).apply { textSize = 18f; setPadding(0, 16, 0, 40) }
        pay = Button(this).apply { text = "Acercar tarjeta para cobrar"; isEnabled = false; setOnClickListener { startPayment() } }
        check = Button(this).apply { text = "Comprobar este cobro"; isEnabled = false; setOnClickListener { verify() } }
        layout.addView(amount); layout.addView(message); layout.addView(pay); layout.addView(check)
        layout.addView(Button(this).apply { text = "Volver a Fast"; setOnClickListener {
            if (!busy) { startActivity(Intent(Intent.ACTION_VIEW, Uri.parse("https://fast.facturacion-autonomos.app/rapido/"))); finish() }
        } })
        setContentView(layout)
        accept(intent)
    }

    override fun onNewIntent(intent: Intent) {
        super.onNewIntent(intent)
        if (busy) { message.text = "Termina o comprueba el cobro actual antes de abrir otro."; return }
        setIntent(intent); accept(intent)
    }

    private fun accept(incoming: Intent) {
        generation++
        val candidate = incoming.getStringExtra("grant")
        grant = if (incoming.data?.scheme == "fastnfc" && incoming.data?.host == "collect" && candidate?.matches(Regex("[A-Za-z0-9_-]{43}")) == true) candidate else null
        NfcTokenProvider.grant = grant
        // Erase the transport from the Activity intent immediately.
        incoming.removeExtra("grant")
        incoming.data = null
        details = null; pay.isEnabled = false; check.isEnabled = grant != null
        if (grant == null) { message.text = "Abre un cobro en Fast y pulsa Cobrar por NFC."; return }
        api("intent") { response ->
            details = response
            val total = NumberFormat.getCurrencyInstance(Locale.forLanguageTag("es-ES")).format(response.getLong("amount") / 100.0)
            amount.text = total
            message.text = response.getString("description") + if (response.getBoolean("testMode")) "\nPRUEBA: no se cobra dinero real." else "\nEl cliente acercará su tarjeta o móvil cuando Stripe lo indique."
            pay.isEnabled = true
        }
    }

    private fun api(action: String, failure: ((String) -> Unit)? = null, done: (JSONObject) -> Unit) {
        val credential = grant ?: return
        val attempt = generation
        worker.execute {
            try {
                val connection = URL(BuildConfig.API_ORIGIN + "/api/factu-rapido/terminal-device").openConnection() as java.net.HttpURLConnection
                val result = try {
                    connection.requestMethod = "POST"; connection.instanceFollowRedirects = false
                    connection.connectTimeout = 15000; connection.readTimeout = 20000; connection.doOutput = true
                    connection.setRequestProperty("Authorization", "FastNfc $credential")
                    connection.setRequestProperty("Content-Type", "application/json")
                    connection.outputStream.use { it.write(JSONObject().put("action", action).toString().toByteArray(Charsets.UTF_8)) }
                    val stream = if (connection.responseCode in 200..299) connection.inputStream else connection.errorStream
                    val bytes = stream?.use { it.readNBytes(32769) } ?: throw Exception()
                    if (bytes.size > 32768) throw Exception()
                    JSONObject(String(bytes, Charsets.UTF_8))
                } finally { connection.disconnect() }
                runOnUiThread {
                    if (attempt != generation || isFinishing) return@runOnUiThread
                    if (!result.optBoolean("ok")) {
                        val reason = result.optString("message", "No se pudo comprobar. Vuelve al mismo cobro en Fast.")
                        if (failure != null) failure(reason) else fail(reason)
                    } else done(result)
                }
            } catch (_: Exception) {
                runOnUiThread { if (attempt == generation && !isFinishing) {
                    val reason = "No se pudo conectar. Comprueba este mismo cobro antes de reintentar; no crees otro."
                    if (failure != null) failure(reason) else fail(reason)
                } }
            }
        }
    }

    private fun startPayment() {
        val info = details ?: return
        if (busy) return
        if (NfcAdapter.getDefaultAdapter(this)?.isEnabled != true) { fail("Activa el NFC del teléfono y vuelve a intentarlo."); return }
        if (!info.getBoolean("testMode") && Settings.Global.getInt(contentResolver, Settings.Global.DEVELOPMENT_SETTINGS_ENABLED, 0) != 0) {
            fail("Desactiva Opciones de desarrollador en Ajustes antes de cobrar por NFC."); return
        }
        if (checkSelfPermission(Manifest.permission.ACCESS_FINE_LOCATION) != PackageManager.PERMISSION_GRANTED) {
            requestPermissions(arrayOf(Manifest.permission.ACCESS_FINE_LOCATION, Manifest.permission.ACCESS_COARSE_LOCATION), 41); return
        }
        busy = true; pay.isEnabled = false; check.isEnabled = false
        message.text = "Preparando lector seguro de Stripe…"
        try {
            if (!Terminal.isInitialized()) {
                Terminal.init(applicationContext, LogLevel.NONE, NfcTokenProvider, object : TerminalListener {}, null, LocaleConfig.CardLanguagePreferenceIfAvailable)
            }
            val terminal = Terminal.getInstance()
            if (terminal.connectedReader != null) { retrieveAndProcess(); return }
            var selected = false
            discovering = true
            active = terminal.discoverReaders(DiscoveryConfiguration.TapToPayDiscoveryConfiguration(info.getBoolean("testMode")),
                object : DiscoveryListener {
                    override fun onUpdateDiscoveredReaders(readers: List<Reader>) {
                        if (selected || readers.isEmpty() || isFinishing) return
                        selected = true
                        discovering = false
                        val config = ConnectionConfiguration.TapToPayConnectionConfiguration(TapUseCase.Pay(info.getString("locationId")), true, object : TapToPayReaderListener {}, info.getString("merchantName"))
                        terminal.connectReader(readers.first(), config, object : ReaderCallback {
                            override fun onSuccess(reader: Reader) { active = null; retrieveAndProcess() }
                            override fun onFailure(e: TerminalException) { sdkFailure(e) }
                        })
                    }
                }, object : Callback {
                    override fun onSuccess() { active = null; discovering = false }
                    override fun onFailure(e: TerminalException) { discovering = false; sdkFailure(e) }
                })
        } catch (_: Exception) { fail("No se pudo iniciar el lector. Comprueba el cobro y vuelve a abrirlo desde Fast.") }
    }

    override fun onRequestPermissionsResult(requestCode: Int, permissions: Array<out String>, grantResults: IntArray) {
        super.onRequestPermissionsResult(requestCode, permissions, grantResults)
        if (requestCode == 41) {
            if (checkSelfPermission(Manifest.permission.ACCESS_FINE_LOCATION) == PackageManager.PERMISSION_GRANTED) startPayment()
            else fail("Stripe necesita ubicación precisa para comprobar dónde se realiza el cobro. Actívala en los permisos de Fast NFC.")
        }
    }

    private fun retrieveAndProcess() {
        val secret = details?.optString("clientSecret") ?: return
        Terminal.getInstance().retrievePaymentIntent(secret, object : PaymentIntentCallback {
            override fun onFailure(e: TerminalException) { sdkFailure(e) }
            override fun onSuccess(paymentIntent: PaymentIntent) {
                // Stripe retains the same PaymentIntent after a decline or timeout.
                active = Terminal.getInstance().processPaymentIntent(paymentIntent,
                    CollectPaymentIntentConfiguration.Builder().build(), ConfirmPaymentIntentConfiguration.Builder().build(),
                    object : PaymentIntentCallback {
                        override fun onSuccess(paymentIntent: PaymentIntent) { active = null; verify() }
                        override fun onFailure(e: TerminalException) { active = null; sdkFailure(e) }
                    })
            }
        })
    }

    private fun verify() {
        busy = true; pay.isEnabled = false; check.isEnabled = false
        message.text = "Confirmando el cobro con Stripe y Factu…"
        api("check") { result ->
            busy = false; check.isEnabled = true
            val payment = result.getJSONObject("payment")
            when (payment.getString("status")) {
                "paid" -> { pay.isEnabled = false; message.text = if (payment.getBoolean("testMode")) "Prueba confirmada. No acredita dinero real ni marca la factura cobrada." else "Cobro confirmado por Stripe. Si hay una factura vinculada, puedes comprobarla en Fast y Factu." }
                "review" -> { pay.isEnabled = false; message.text = "Cobro en revisión. Comprueba Stripe antes de volver a cobrar." }
                "expired" -> { pay.isEnabled = false; message.text = "Este cobro NFC se cerró. Vuelve a Fast para elegir cómo cobrar." }
                else -> { pay.isEnabled = true; message.text = "Pago pendiente. Puedes reintentar este mismo cobro." }
            }
        }
    }

    private fun sdkFailure(error: TerminalException) {
        runOnUiThread { fail("Stripe no pudo completar el cobro (${error.errorCode}). Comprueba el mismo cobro. Revisa NFC, conexión, ubicación, actualizaciones y opciones de desarrollador.") }
    }
    private fun fail(text: String) {
        runOnUiThread { busy = false; message.text = text; pay.isEnabled = details != null; check.isEnabled = grant != null }
    }
    override fun onStop() {
        super.onStop()
        // Stripe's secure full-screen Activity can temporarily cover this one;
        // do not cancel an active transaction just because that screen opens.
        if (!busy || discovering) { active?.cancel(noop); active = null; discovering = false; busy = false }
    }
    override fun onDestroy() {
        generation++; NfcTokenProvider.grant = null; grant = null; details = null
        active?.cancel(noop); active = null
        worker.shutdown()
        super.onDestroy()
    }
}

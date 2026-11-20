plugins { id("com.android.application") }
android {
    namespace = "app.factu.fast.nfc"
    compileSdk = 37
    defaultConfig {
        applicationId = "app.factu.fast.nfc"
        minSdk = 33
        targetSdk = 37
        versionCode = 2
        versionName = "1.0.1"
    }
    buildFeatures { buildConfig = true }
    flavorDimensions += "environment"
    productFlavors {
        create("production") {
            dimension = "environment"
            buildConfigField("String", "API_ORIGIN", "\"https://fast.facturacion-autonomos.app\"")
            manifestPlaceholders["appLabel"] = "Fast NFC"
        }
        create("acceptance") {
            dimension = "environment"
            applicationIdSuffix = ".acceptance"
            versionNameSuffix = "-acceptance"
            // USB reverse into a disposable local DB; never a production URL.
            buildConfigField("String", "API_ORIGIN", "\"http://127.0.0.1:3111\"")
            manifestPlaceholders["appLabel"] = "Fast NFC pruebas"
        }
    }
    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }
    buildTypes {
        release {
            isDebuggable = false
            isMinifyEnabled = true
            proguardFiles(getDefaultProguardFile("proguard-android-optimize.txt"))
        }
    }
}
dependencies {
    implementation("com.stripe:stripeterminal-taptopay:6.0.0")
    implementation("com.stripe:stripeterminal-core:6.0.0")
}

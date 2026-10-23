plugins { id("com.android.application") }
android {
    namespace = "app.factu.fast.nfc"
    compileSdk = 37
    defaultConfig {
        applicationId = "app.factu.fast.nfc"
        minSdk = 33
        targetSdk = 37
        versionCode = 1
        versionName = "1.0.0"
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

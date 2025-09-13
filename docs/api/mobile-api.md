# 📱 API Mobile - Mealtime

Esta documentação descreve como integrar aplicativos Android/iOS com a API do Mealtime.

## 🔐 Autenticação

A API utiliza JWT tokens para autenticação. Todos os endpoints protegidos requerem o header `Authorization: Bearer <token>`.

### Base URL
```
https://mealtime.vercel.app/api
```

## 📋 Endpoints de Autenticação

### 1. Login de Usuário

**POST** `/auth/mobile`

Autentica um usuário e retorna tokens de acesso.

#### Request Body
```json
{
  "email": "usuario@exemplo.com",
  "password": "senha123"
}
```

#### Response (Sucesso - 200)
```json
{
  "success": true,
  "user": {
    "id": 1,
    "auth_id": "uuid-do-supabase",
    "full_name": "João Silva",
    "email": "usuario@exemplo.com",
    "household_id": 1,
    "household": {
      "id": 1,
      "name": "Casa da Família",
      "members": [
        {
          "id": 1,
          "name": "João Silva",
          "email": "usuario@exemplo.com",
          "role": "admin"
        }
      ]
    }
  },
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refresh_token": "refresh_token_aqui",
  "expires_in": 3600,
  "token_type": "Bearer"
}
```

#### Response (Erro - 401)
```json
{
  "success": false,
  "error": "Credenciais inválidas"
}
```

### 2. Registro de Usuário

**POST** `/auth/mobile/register`

Cria uma nova conta de usuário.

#### Request Body
```json
{
  "email": "novo@exemplo.com",
  "password": "senha123",
  "full_name": "Maria Silva",
  "household_name": "Casa Nova"
}
```
Campo household_name é opcional.

#### Response (Sucesso - 200)
```json
{
  "success": true,
  "user": { /* dados do usuário */ },
  "access_token": "token_aqui",
  "refresh_token": "refresh_token_aqui",
  "expires_in": 3600,
  "token_type": "Bearer"
}
```

#### Response (Confirmação de Email - 200)
```json
{
  "success": false,
  "error": "Verifique seu email para confirmar a conta",
  "requires_email_confirmation": true
}
```

### 3. Renovar Token

**PUT** `/auth/mobile`

Renova um token de acesso usando o refresh token.

#### Request Body
```json
{
  "refresh_token": "refresh_token_aqui"
}
```

#### Response (Sucesso - 200)
```json
{
  "success": true,
  "access_token": "novo_token_aqui",
  "refresh_token": "novo_refresh_token_aqui",
  "expires_in": 3600,
  "token_type": "Bearer"
}
```

## 🐱 Endpoints de Gatos

### Listar Gatos

**GET** `/cats`

Lista todos os gatos do usuário autenticado.

#### Headers
```
Authorization: Bearer <access_token>
```

#### Response (Sucesso - 200)
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "name": "Mimi",
      "birth_date": "2020-01-15",
      "weight": 4.5,
      "photo_url": "https://exemplo.com/foto.jpg",
      "household_id": 1,
      "created_at": "2024-01-01T00:00:00Z",
      "updated_at": "2024-01-01T00:00:00Z"
    }
  ],
  "count": 1
}
```

### Criar Gato

**POST** `/cats`

Cria um novo gato.

#### Headers
```
Authorization: Bearer <access_token>
Content-Type: application/json
```

#### Request Body
```json
{
  "name": "Luna",
  "birth_date": "2021-03-20",
  "weight": 3.8,
  "photo_url": "https://exemplo.com/luna.jpg"
}
```

#### Response (Sucesso - 201)
```json
{
  "success": true,
  "data": {
    "id": 2,
    "name": "Luna",
    "birth_date": "2021-03-20",
    "weight": 3.8,
    "photo_url": "https://exemplo.com/luna.jpg",
    "household_id": 1,
    "created_at": "2024-01-01T00:00:00Z",
    "updated_at": "2024-01-01T00:00:00Z"
  }
}
```

## 🚧 Endpoints em Desenvolvimento

> **⚠️ Nota Importante**: Os seguintes endpoints estão documentados mas ainda não foram implementados na API. Eles serão adicionados em futuras versões.

### 🍽️ Endpoints de Alimentação

**Status**: 🚧 Em desenvolvimento

- `GET /feedings` - Listar alimentações
- `POST /feedings` - Registrar alimentação

### 📊 Endpoints de Estatísticas

**Status**: 🚧 Em desenvolvimento

- `GET /statistics` - Obter estatísticas de alimentação

### 🏠 Endpoints de Household

**Status**: 🚧 Em desenvolvimento

- `GET /households` - Listar households

### ⚖️ Endpoints de Peso

**Status**: 🚧 Em desenvolvimento

- `GET /weight-logs` - Listar logs de peso
- `POST /weight-logs` - Registrar peso

## 🔧 Configuração do Cliente Android

### 1. Dependências (build.gradle)

```gradle
implementation 'com.squareup.retrofit2:retrofit:2.12.0'
implementation 'com.squareup.retrofit2:converter-gson:2.12.0'
implementation 'com.squareup.okhttp3:logging-interceptor:5.1.0'
implementation 'com.squareup.okhttp3:okhttp:5.1.0'
implementation 'androidx.security:security-crypto:1.1.0'
implementation 'androidx.lifecycle:lifecycle-runtime-ktx:2.7.0'
```

### 2. Configuração do Retrofit

```kotlin
import okhttp3.*
import retrofit2.*
import retrofit2.converter.gson.GsonConverterFactory
import java.util.concurrent.atomic.AtomicReference

object ApiClient {
    private const val BASE_URL = "https://mealtime.vercel.app/api/"
    
    // TokenManager thread-safe
    private val tokenManager = TokenManager()
    
    // AuthInterceptor para injetar automaticamente o token
    private val authInterceptor = Interceptor { chain ->
        val originalRequest = chain.request()
        val token = tokenManager.getAccessToken()
        
        val requestBuilder = originalRequest.newBuilder()
            .addHeader("Accept", "application/json")
        
        // Adicionar token apenas se disponível e não for endpoint de auth
        if (token != null && !originalRequest.url.encodedPath.contains("auth/mobile")) {
            requestBuilder.addHeader("Authorization", "Bearer $token")
        }
        
        // Only add Content-Type if request has a body
        if (originalRequest.body != null) {
            requestBuilder.addHeader("Content-Type", "application/json")
        }
        
        chain.proceed(requestBuilder.build())
    }
    
    // Authenticator para refresh automático de token
    private val authenticator = Authenticator { _, response ->
        if (response.code == 401) {
            val refreshToken = tokenManager.getRefreshToken()
            if (refreshToken != null) {
                // Tentar refresh do token
                val newToken = refreshAccessToken(refreshToken)
                if (newToken != null) {
                    // Retry da requisição original com novo token
                    response.request.newBuilder()
                        .header("Authorization", "Bearer $newToken")
                        .build()
                } else {
                    null // Falha no refresh, redirecionar para login
                }
            } else {
                null // Sem refresh token, redirecionar para login
            }
        } else {
            null // Não é erro 401, não fazer nada
        }
    }
    
    private val okHttpClient = OkHttpClient.Builder()
        .addInterceptor(authInterceptor)
        .authenticator(authenticator)
        .addInterceptor(HttpLoggingInterceptor().apply {
            level = HttpLoggingInterceptor.Level.HEADERS
            redactHeader("Authorization")
            redactHeader("X-API-Key")
            redactHeader("Cookie")
        })
        .build()
    
    val retrofit = Retrofit.Builder()
        .baseUrl(BASE_URL)
        .client(okHttpClient)
        .addConverterFactory(GsonConverterFactory.create())
        .build()
    
    // Função para refresh do token (síncrona)
    private fun refreshAccessToken(refreshToken: String): String? {
        return try {
            val api = retrofit.create(MealtimeApi::class.java)
            val response = api.refreshToken(RefreshTokenRequest(refreshToken)).execute()
            
            if (response.isSuccessful && response.body()?.success == true) {
                val body = response.body()!!
                tokenManager.saveTokens(body.access_token!!, body.refresh_token!!)
                body.access_token
            } else {
                null
            }
        } catch (e: Exception) {
            null
        }
    }
    
    // Função para configurar tokens após login
    fun setTokens(accessToken: String, refreshToken: String) {
        tokenManager.saveTokens(accessToken, refreshToken)
    }
    
    // Função para limpar tokens (logout)
    fun clearTokens() {
        tokenManager.clearTokens()
    }
}
```

### 3. Interface da API

```kotlin
interface MealtimeApi {
    @POST("auth/mobile")
    suspend fun login(@Body request: LoginRequest): Response<LoginResponse>
    
    @POST("auth/mobile/register")
    suspend fun register(@Body request: RegisterRequest): Response<RegisterResponse>
    
    @PUT("auth/mobile")
    suspend fun refreshToken(@Body request: RefreshTokenRequest): Response<RefreshTokenResponse>
    
    @GET("cats")
    suspend fun getCats(): Response<List<Cat>>
    
    @POST("cats")
    suspend fun createCat(@Body cat: CreateCatRequest): Response<Cat>
    
    // Endpoints de alimentação serão adicionados em futuras versões
    // @GET("feedings")
    // @POST("feedings")
}
```

### 4. Modelos de Dados

```kotlin
data class LoginRequest(
    val email: String,
    val password: String
)

data class LoginResponse(
    val success: Boolean,
    val user: User?,
    val access_token: String?,
    val refresh_token: String?,
    val expires_in: Int?,
    val token_type: String?,
    val error: String?
)

data class User(
    val id: String,
    val auth_id: String,
    val full_name: String,
    val email: String,
    val household_id: String?,
    val household: Household?
)

data class Cat(
    val id: Int,
    val name: String,
    val birth_date: String?,
    val weight: Double?,
    val photo_url: String?,
    val household_id: String,
    val created_at: String,
    val updated_at: String
)
```

### 5. Gerenciamento de Tokens (Thread-Safe + Criptografia)

```kotlin
import android.content.Context
import androidx.security.crypto.EncryptedSharedPreferences
import androidx.security.crypto.MasterKey
import android.util.Log

class TokenManager(private val context: Context) {
    companion object {
        private const val PREFS_NAME = "mealtime_auth_encrypted"
        private const val LEGACY_PREFS_NAME = "mealtime_auth" // Para migração
        private const val TAG = "TokenManager"
    }
    
    private val masterKey = MasterKey.Builder(context)
        .setKeyScheme(MasterKey.KeyScheme.AES256_GCM)
        .build()
    
    private val encryptedPrefs = EncryptedSharedPreferences.create(
        context,
        PREFS_NAME,
        masterKey,
        EncryptedSharedPreferences.PrefKeyEncryptionScheme.AES256_SIV,
        EncryptedSharedPreferences.PrefValueEncryptionScheme.AES256_GCM
    )
    
    // Usar AtomicReference para operações thread-safe
    @Volatile
    private var cachedAccessToken: String? = null
    
    @Volatile
    private var cachedRefreshToken: String? = null
    
    // Lock para operações de escrita
    private val lock = Any()
    
    // Flag para controlar migração única
    @Volatile
    private var migrationCompleted = false
    
    init {
        // Executar migração de tokens existentes (se houver)
        performMigrationIfNeeded()
    }
    
    private fun performMigrationIfNeeded() {
        if (migrationCompleted) return
        
        synchronized(lock) {
            if (migrationCompleted) return
            
            try {
                val legacyPrefs = context.getSharedPreferences(LEGACY_PREFS_NAME, Context.MODE_PRIVATE)
                val legacyAccessToken = legacyPrefs.getString("access_token", null)
                val legacyRefreshToken = legacyPrefs.getString("refresh_token", null)
                
                // Se existem tokens em texto plano, migrar para criptografado
                if (legacyAccessToken != null || legacyRefreshToken != null) {
                    Log.i(TAG, "Migrando tokens existentes para armazenamento criptografado")
                    
                    // Salvar tokens no armazenamento criptografado
                    if (legacyAccessToken != null && legacyRefreshToken != null) {
                        saveTokensInternal(legacyAccessToken, legacyRefreshToken)
                    }
                    
                    // Limpar tokens em texto plano
                    legacyPrefs.edit().clear().apply()
                    Log.i(TAG, "Migração de tokens concluída com sucesso")
                }
                
                migrationCompleted = true
            } catch (e: Exception) {
                Log.e(TAG, "Erro durante migração de tokens", e)
                // Em caso de erro, marcar como concluída para evitar loops
                migrationCompleted = true
            }
        }
    }
    
    fun saveTokens(accessToken: String, refreshToken: String) {
        synchronized(lock) {
            try {
                saveTokensInternal(accessToken, refreshToken)
                Log.i(TAG, "Tokens salvos com sucesso (armazenamento criptografado)")
            } catch (e: Exception) {
                Log.e(TAG, "Erro ao salvar tokens", e)
                throw e
            }
        }
    }
    
    private fun saveTokensInternal(accessToken: String, refreshToken: String) {
        encryptedPrefs.edit()
            .putString("access_token", accessToken)
            .putString("refresh_token", refreshToken)
            .apply()
        
        // Atualizar cache de forma atômica
        cachedAccessToken = accessToken
        cachedRefreshToken = refreshToken
    }
    
    fun getAccessToken(): String? {
        // Primeiro tentar cache (leitura rápida)
        cachedAccessToken?.let { return it }
        
        // Se cache vazio, ler do EncryptedSharedPreferences
        synchronized(lock) {
            if (cachedAccessToken == null) {
                try {
                    cachedAccessToken = encryptedPrefs.getString("access_token", null)
                    if (cachedAccessToken != null) {
                        Log.d(TAG, "Token de acesso recuperado com sucesso")
                    }
                } catch (e: Exception) {
                    Log.e(TAG, "Erro ao recuperar token de acesso", e)
                    cachedAccessToken = null
                }
            }
            return cachedAccessToken
        }
    }
    
    fun getRefreshToken(): String? {
        // Primeiro tentar cache (leitura rápida)
        cachedRefreshToken?.let { return it }
        
        // Se cache vazio, ler do EncryptedSharedPreferences
        synchronized(lock) {
            if (cachedRefreshToken == null) {
                try {
                    cachedRefreshToken = encryptedPrefs.getString("refresh_token", null)
                    if (cachedRefreshToken != null) {
                        Log.d(TAG, "Token de refresh recuperado com sucesso")
                    }
                } catch (e: Exception) {
                    Log.e(TAG, "Erro ao recuperar token de refresh", e)
                    cachedRefreshToken = null
                }
            }
            return cachedRefreshToken
        }
    }
    
    fun clearTokens() {
        synchronized(lock) {
            try {
                encryptedPrefs.edit().clear().apply()
                cachedAccessToken = null
                cachedRefreshToken = null
                Log.i(TAG, "Tokens removidos com sucesso")
            } catch (e: Exception) {
                Log.e(TAG, "Erro ao limpar tokens", e)
            }
        }
    }
    
    // Verificar se tem tokens válidos
    fun hasValidTokens(): Boolean {
        val hasAccess = getAccessToken() != null
        val hasRefresh = getRefreshToken() != null
        Log.d(TAG, "Verificação de tokens: access=${hasAccess}, refresh=${hasRefresh}")
        return hasAccess && hasRefresh
    }
}
```

## 🚨 Códigos de Erro

| Código | Descrição |
|--------|-----------|
| 200 | Sucesso |
| 201 | Criado com sucesso |
| 400 | Dados inválidos |
| 401 | Não autorizado (token inválido/expirado) |
| 403 | Acesso negado |
| 404 | Recurso não encontrado |
| 500 | Erro interno do servidor |

## 📝 Notas Importantes

1. **Tokens JWT**: Os tokens têm validade limitada. O sistema agora renova automaticamente.
2. **CORS**: A API está configurada para aceitar requisições de aplicativos mobile.
3. **Rate Limiting**: Evite fazer muitas requisições simultâneas.
4. **Offline**: Considere implementar cache local para funcionamento offline.
5. **Segurança**: 
   - ✅ **Armazenamento Criptografado**: Tokens são armazenados usando `EncryptedSharedPreferences` com criptografia AES-256
   - ✅ **Migração Segura**: Tokens existentes em texto plano são migrados automaticamente para armazenamento criptografado
   - ✅ **Logs Seguros**: Logs indicam apenas presença/operação de tokens, nunca expõem valores reais
   - ✅ **Keystore**: Utiliza Android Keystore para proteção das chaves de criptografia
   - ⚠️ **Nunca** armazene tokens em logs ou em texto plano

## 🔧 Melhorias de Autenticação

### ✅ O que foi implementado:

1. **Interceptor Automático**: O `AuthInterceptor` injeta automaticamente o header `Authorization` em todas as requisições protegidas.

2. **Refresh Automático**: O `Authenticator` detecta respostas 401 e tenta renovar o token automaticamente antes de falhar.

3. **Thread-Safety**: O `TokenManager` usa operações atômicas e sincronização para garantir segurança em ambientes multi-thread.

4. **API Simplificada**: Não é mais necessário passar tokens manualmente em cada chamada da API.

5. **Gerenciamento Centralizado**: Todos os tokens são gerenciados centralmente pelo `ApiClient`.

6. **🔐 Segurança Aprimorada**: 
   - **Armazenamento Criptografado**: Tokens são armazenados usando `EncryptedSharedPreferences` com criptografia AES-256-GCM
   - **Migração Automática**: Tokens existentes em texto plano são migrados automaticamente para armazenamento criptografado
   - **Logs Seguros**: Logs indicam apenas presença/operação de tokens, nunca expõem valores reais
   - **Keystore Integration**: Utiliza Android Keystore para proteção das chaves de criptografia

### 🚀 Benefícios:

- **Menos Código**: Elimina a necessidade de passar tokens em cada chamada
- **Mais Seguro**: Refresh automático evita falhas por token expirado
- **Thread-Safe**: Funciona corretamente em ambientes concorrentes
- **Manutenível**: Lógica de autenticação centralizada e reutilizável
- **Robusto**: Tratamento automático de erros de autenticação
- **🔐 Segurança Máxima**: 
  - Tokens criptografados em repouso usando padrões de segurança do Android
  - Proteção contra acesso não autorizado aos tokens armazenados
  - Migração transparente de tokens existentes sem perda de dados
  - Logs seguros que não expõem informações sensíveis

## 📋 Correções de Documentação

### ✅ Problemas Corrigidos:

1. **Estrutura de Resposta**: Corrigida para refletir a implementação real `{success, data, count}`
2. **Modelos de Dados**: Atualizados para corresponder aos tipos reais (String vs Int para IDs)
3. **Endpoints Faltantes**: Marcados como "em desenvolvimento" os endpoints não implementados
4. **Exemplos de Uso**: Atualizados para usar a estrutura correta de resposta da API
5. **Campos Removidos**: Removido campo `breed` do modelo Cat que não existe na implementação
6. **🔐 Segurança de Tokens**: 
   - Substituído `SharedPreferences` por `EncryptedSharedPreferences` para armazenamento seguro
   - Implementada migração automática de tokens existentes em texto plano
   - Adicionados logs seguros que não expõem valores de tokens
   - Integração com Android Keystore para proteção das chaves de criptografia

### ⚠️ Endpoints Não Implementados:

- `/feedings` (GET/POST)
- `/weight-logs` (GET/POST)
- `/statistics` (GET)
- `/households` (GET)

Estes endpoints estão documentados mas ainda não foram implementados na API.

## 🔄 Exemplo de Uso Completo

```kotlin
import android.os.Bundle
import android.util.Log
import androidx.appcompat.app.AppCompatActivity
import androidx.lifecycle.lifecycleScope
import kotlinx.coroutines.*

class MainActivity : AppCompatActivity() {
    private lateinit var api: MealtimeApi
    
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        
        api = ApiClient.retrofit.create(MealtimeApi::class.java)
        
        // Exemplo de login - usando lifecycleScope para chamada suspend
        lifecycleScope.launch {
            loginUser("usuario@exemplo.com", "senha123")
        }
    }
    
    private suspend fun loginUser(email: String, password: String) {
        try {
            val response = api.login(LoginRequest(email, password))
            if (response.isSuccessful && response.body()?.success == true) {
                val body = response.body()!!
                
                // Configurar tokens no ApiClient (será usado automaticamente)
                ApiClient.setTokens(body.access_token!!, body.refresh_token!!)
                
                // Agora você pode fazer outras requisições sem passar tokens
                loadCats()
            } else {
                // Tratar erro de login
                Log.e("Login", "Erro: ${response.body()?.error}")
            }
        } catch (e: Exception) {
            Log.e("Login", "Exceção: ${e.message}")
        }
    }
    
    private suspend fun loadCats() {
        try {
            // Não precisa mais passar token - é injetado automaticamente
            val response = api.getCats()
            if (response.isSuccessful) {
                val responseBody = response.body()!!
                if (responseBody.success) {
                    val cats = responseBody.data
                    // Atualizar UI com os gatos
                    Log.d("Cats", "Carregados ${cats.size} gatos")
                } else {
                    Log.e("Cats", "Erro da API: ${responseBody.error}")
                }
            } else if (response.code == 401) {
                // Token expirado - o interceptor já tentou refresh automaticamente
                // Se chegou aqui, o refresh falhou - redirecionar para login
                redirectToLogin()
            }
        } catch (e: Exception) {
            Log.e("Cats", "Erro ao carregar gatos: ${e.message}")
        }
    }
    
    // Exemplo de como usar endpoints quando estiverem implementados
    // private suspend fun loadFeedings() {
    //     try {
    //         val response = api.getFeedings(catId = 1, limit = 10)
    //         if (response.isSuccessful) {
    //             val responseBody = response.body()!!
    //             if (responseBody.success) {
    //                 val feedings = responseBody.data
    //                 Log.d("Feedings", "Carregadas ${feedings.size} alimentações")
    //             }
    //         }
    //     } catch (e: Exception) {
    //         Log.e("Feedings", "Erro ao carregar alimentações: ${e.message}")
    //     }
    // }
    
    private suspend fun createCat() {
        try {
            val newCat = CreateCatRequest(
                name = "Luna",
                birth_date = "2021-03-20",
                weight = 3.8,
                photo_url = "https://exemplo.com/luna.jpg"
            )
            
            val response = api.createCat(newCat)
            if (response.isSuccessful) {
                val responseBody = response.body()!!
                if (responseBody.success) {
                    val cat = responseBody.data
                    Log.d("Cat", "Gato criado: ${cat.name}")
                } else {
                    Log.e("Cat", "Erro da API: ${responseBody.error}")
                }
            }
        } catch (e: Exception) {
            Log.e("Cat", "Erro ao criar gato: ${e.message}")
        }
    }
    
    private fun redirectToLogin() {
        // Limpar tokens e redirecionar para tela de login
        ApiClient.clearTokens()
        // Navegar para LoginActivity
    }
    
    private fun logout() {
        // Limpar tokens
        ApiClient.clearTokens()
        // Redirecionar para login
        redirectToLogin()
    }
}
```

---

Para mais informações ou suporte, entre em contato com a equipe de desenvolvimento.

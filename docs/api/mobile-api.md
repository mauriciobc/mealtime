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
  "household_name": "Casa Nova" // opcional
}
```

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
[
  {
    "id": 1,
    "name": "Mimi",
    "breed": "Siamês",
    "birth_date": "2020-01-15",
    "weight": 4.5,
    "photo_url": "https://exemplo.com/foto.jpg",
    "household_id": 1,
    "created_at": "2024-01-01T00:00:00Z",
    "updated_at": "2024-01-01T00:00:00Z"
  }
]
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
  "breed": "Persa",
  "birth_date": "2021-03-20",
  "weight": 3.8,
  "photo_url": "https://exemplo.com/luna.jpg"
}
```

#### Response (Sucesso - 201)
```json
{
  "id": 2,
  "name": "Luna",
  "breed": "Persa",
  "birth_date": "2021-03-20",
  "weight": 3.8,
  "photo_url": "https://exemplo.com/luna.jpg",
  "household_id": 1,
  "created_at": "2024-01-01T00:00:00Z",
  "updated_at": "2024-01-01T00:00:00Z"
}
```

## 🍽️ Endpoints de Alimentação

### Listar Alimentações

**GET** `/feedings`

Lista todas as alimentações do usuário.

#### Query Parameters
- `cat_id` (opcional): Filtrar por gato específico
- `limit` (opcional): Número máximo de resultados (padrão: 50)
- `offset` (opcional): Número de resultados para pular (padrão: 0)

#### Response (Sucesso - 200)
```json
[
  {
    "id": 1,
    "cat_id": 1,
    "cat_name": "Mimi",
    "food_type": "Ração Seca",
    "amount": 50,
    "fed_at": "2024-01-01T08:00:00Z",
    "notes": "Comeu bem",
    "created_at": "2024-01-01T08:00:00Z"
  }
]
```

### Registrar Alimentação

**POST** `/feedings`

Registra uma nova alimentação.

#### Request Body
```json
{
  "cat_id": 1,
  "food_type": "Ração Seca",
  "amount": 50,
  "fed_at": "2024-01-01T08:00:00Z",
  "notes": "Comeu bem"
}
```

#### Response (Sucesso - 201)
```json
{
  "id": 1,
  "cat_id": 1,
  "food_type": "Ração Seca",
  "amount": 50,
  "fed_at": "2024-01-01T08:00:00Z",
  "notes": "Comeu bem",
  "created_at": "2024-01-01T08:00:00Z"
}
```

## 📊 Endpoints de Estatísticas

### Obter Estatísticas

**GET** `/statistics`

Obtém estatísticas de alimentação.

#### Query Parameters
- `period`: Período (7dias, 30dias, 90dias)
- `cat_id`: ID do gato (ou "todos")

#### Response (Sucesso - 200)
```json
{
  "total_feedings": 45,
  "average_daily": 3.2,
  "most_fed_cat": "Mimi",
  "feeding_trend": [
    { "date": "2024-01-01", "count": 3 },
    { "date": "2024-01-02", "count": 4 }
  ]
}
```

## 🏠 Endpoints de Household

### Listar Households

**GET** `/households`

Lista todos os households do usuário.

#### Response (Sucesso - 200)
```json
[
  {
    "id": 1,
    "name": "Casa da Família",
    "members": [
      {
        "id": 1,
        "name": "João Silva",
        "email": "joao@exemplo.com",
        "role": "admin"
      }
    ],
    "created_at": "2024-01-01T00:00:00Z"
  }
]
```

## ⚖️ Endpoints de Peso

### Listar Logs de Peso

**GET** `/weight-logs`

Lista todos os logs de peso.

#### Query Parameters
- `cat_id` (opcional): Filtrar por gato específico
- `limit` (opcional): Número máximo de resultados
- `offset` (opcional): Número de resultados para pular

#### Response (Sucesso - 200)
```json
[
  {
    "id": 1,
    "cat_id": 1,
    "cat_name": "Mimi",
    "weight": 4.5,
    "measured_at": "2024-01-01T10:00:00Z",
    "notes": "Peso normal",
    "created_at": "2024-01-01T10:00:00Z"
  }
]
```

### Registrar Peso

**POST** `/weight-logs`

Registra um novo peso.

#### Request Body
```json
{
  "cat_id": 1,
  "weight": 4.5,
  "measured_at": "2024-01-01T10:00:00Z",
  "notes": "Peso normal"
}
```

## 🔧 Configuração do Cliente Android

### 1. Dependências (build.gradle)

```gradle
implementation 'com.squareup.retrofit2:retrofit:2.9.0'
implementation 'com.squareup.retrofit2:converter-gson:2.9.0'
implementation 'com.squareup.okhttp3:logging-interceptor:4.11.0'
implementation 'androidx.security:security-crypto:1.1.0-alpha06'
```

### 2. Configuração do Retrofit

```kotlin
object ApiClient {
    private const val BASE_URL = "https://mealtime.vercel.app/api/"
    
    private val okHttpClient = OkHttpClient.Builder()
        .addInterceptor { chain ->
            val request = chain.request().newBuilder()
                .addHeader("Content-Type", "application/json")
                .addHeader("Accept", "application/json")
                .build()
            chain.proceed(request)
        }
        .addInterceptor(HttpLoggingInterceptor().apply {
            level = HttpLoggingInterceptor.Level.BODY
        })
        .build()
    
    val retrofit = Retrofit.Builder()
        .baseUrl(BASE_URL)
        .client(okHttpClient)
        .addConverterFactory(GsonConverterFactory.create())
        .build()
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
    suspend fun getCats(@Header("Authorization") token: String): Response<List<Cat>>
    
    @POST("cats")
    suspend fun createCat(
        @Header("Authorization") token: String,
        @Body cat: CreateCatRequest
    ): Response<Cat>
    
    @GET("feedings")
    suspend fun getFeedings(
        @Header("Authorization") token: String,
        @Query("cat_id") catId: Int? = null,
        @Query("limit") limit: Int? = null,
        @Query("offset") offset: Int? = null
    ): Response<List<Feeding>>
    
    @POST("feedings")
    suspend fun createFeeding(
        @Header("Authorization") token: String,
        @Body feeding: CreateFeedingRequest
    ): Response<Feeding>
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
    val id: Int,
    val auth_id: String,
    val full_name: String,
    val email: String,
    val household_id: Int?,
    val household: Household?
)

data class Cat(
    val id: Int,
    val name: String,
    val breed: String?,
    val birth_date: String?,
    val weight: Double?,
    val photo_url: String?,
    val household_id: Int,
    val created_at: String,
    val updated_at: String
)
```

### 5. Gerenciamento de Tokens

```kotlin
class TokenManager(private val context: Context) {
    private val prefs = context.getSharedPreferences("mealtime_auth", Context.MODE_PRIVATE)
    
    fun saveTokens(accessToken: String, refreshToken: String) {
        prefs.edit()
            .putString("access_token", accessToken)
            .putString("refresh_token", refreshToken)
            .apply()
    }
    
    fun getAccessToken(): String? = prefs.getString("access_token", null)
    fun getRefreshToken(): String? = prefs.getString("refresh_token", null)
    
    fun clearTokens() {
        prefs.edit().clear().apply()
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

1. **Tokens JWT**: Os tokens têm validade limitada. Use o refresh token para renovar.
2. **CORS**: A API está configurada para aceitar requisições de aplicativos mobile.
3. **Rate Limiting**: Evite fazer muitas requisições simultâneas.
4. **Offline**: Considere implementar cache local para funcionamento offline.
5. **Segurança**: Nunca armazene tokens em logs ou em texto plano.

## 🔄 Exemplo de Uso Completo

```kotlin
class MainActivity : AppCompatActivity() {
    private lateinit var api: MealtimeApi
    private lateinit var tokenManager: TokenManager
    
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        
        api = ApiClient.retrofit.create(MealtimeApi::class.java)
        tokenManager = TokenManager(this)
        
        // Exemplo de login
        loginUser("usuario@exemplo.com", "senha123")
    }
    
    private suspend fun loginUser(email: String, password: String) {
        try {
            val response = api.login(LoginRequest(email, password))
            if (response.isSuccessful && response.body()?.success == true) {
                val body = response.body()!!
                tokenManager.saveTokens(body.access_token!!, body.refresh_token!!)
                
                // Agora você pode fazer outras requisições
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
            val token = tokenManager.getAccessToken()
            if (token != null) {
                val response = api.getCats("Bearer $token")
                if (response.isSuccessful) {
                    val cats = response.body()!!
                    // Atualizar UI com os gatos
                    Log.d("Cats", "Carregados ${cats.size} gatos")
                }
            }
        } catch (e: Exception) {
            Log.e("Cats", "Erro ao carregar gatos: ${e.message}")
        }
    }
}
```

---

Para mais informações ou suporte, entre em contato com a equipe de desenvolvimento.

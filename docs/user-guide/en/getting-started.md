# Getting Started

Welcome to MealTime! This guide will help you get started using the app to manage your cat's feeding.

---

## Quick Tasks

| Task | Description | Time |
|------|-------------|------|
| [Create account](#creating-an-account) | Register a new user | 2 min |
| [Log in](#logging-in) | Enter the app | 1 min |
| [Add first cat](#adding-your-first-cat) | Register your feline | 3 min |
| [Create household](#creating-a-household) | Set up environment | 2 min |
| [Record feeding](#recording-a-feeding) | First meal recorded | 1 min |

---

## Creating an Account

![Signup Page](/user-guide/assets/screenshots/signup.png)

1. Go to the signup page at `/signup`
2. Fill in the fields:
   - **Full Name**: Your full name
   - **Email**: Your email address
   - **Password**: A secure password (minimum 6 characters)
   - **Confirm Password**: Repeat the password
3. Click **"Criar conta com Email"** (Create account with Email)
4. You can also use **"Criar conta com Google"** (Create account with Google) for quick login

---

## Logging In

![Login Page](/user-guide/assets/screenshots/login.png)

1. Go to the login page at `/login`
2. Enter your email and password
3. Click **"Entrar com Email"** (Login with Email)
4. Or use **"Entrar com Google"** (Login with Google) for Google authentication

---

## Adding Your First Cat

![Cats List](/user-guide/assets/screenshots/cats-list.png)

1. **On the home screen**, click **"Cadastrar meu primeiro gato"** (or go to `/cats/new`)
2. Fill in the required information:
   - **Name**: Your cat's name (required)
   - **Ideal Interval Between Meals**: Hours between meals (default: 8h)
3. Optional information:
   - **Photo**: Add a photo of your cat
   - **Birth Date**: To calculate age
   - **Weight**: Current weight in kg
   - **Recommended Portion**: Grams per meal
   - **Restrictions**: Allergies or dietary restrictions
   - **Notes**: Special notes
4. Click **"Adicionar Gato"** (Add Cat)

---

## Creating a Household

1. On the home screen, click **"Ir para configurações de residência"** (Go to household settings)
2. Or go to `/households/new`
3. Enter a name for the household (e.g., "Main House")
4. Click **"Criar"** (Create)

---

## Recording a Feeding

1. On the home screen, click the floating **"+"** button or **"Registrar nova alimentação"** (Record new feeding)
2. Select the cat
3. Choose the amount (grams)
4. Optional: select meal type and food
5. Click **"Salvar"** (Save)

---

## Basic Navigation

MealTime has a bottom navigation bar with quick access to main features:

| Item | Route | Function |
|------|-------|----------|
| 🏠 Home | `/` | Dashboard with statistics and summary |
| 🐱 Cats | `/cats` | Manage cat profiles |
| 🏠 Households | `/households` | Manage households |
| 📅 Schedule | `/schedules` | View schedules |
| ⚖️ Weight | `/weight` | Track weight |
| 📊 Statistics | `/statistics` | View charts and data |

---

## Helpful Tips

- Use the floating **"+"** button to quickly record feedings
- Enable **push notifications** to receive reminders
- Set **weight goals** to monitor your cat's health
- Create **schedules** for automatic feeding alerts

---

## Next Steps

Now that you know the basics, explore other guide sections:

- [Adding Cats](/docs/en/cats/managing-cats) - Manage multiple cats
- [Recording Feedings](/docs/en/feeding/recording-feedings) - Learn all options
- [Creating Households](/docs/en/households/creating-households) - Invite family members
- [Setting Up Schedules](/docs/en/schedules/managing-schedules) - Automate reminders

---

*MealTime - The best care for your cat!* 🐈

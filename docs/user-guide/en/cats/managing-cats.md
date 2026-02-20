# Adding and Managing Cats

Learn how to add, edit, and manage cat profiles in MealTime.

---

## Cat Management Tasks

### Quick Tasks

| Task | When to Use | Page |
|------|-------------|------|
| [Add new cat](#adding-a-new-cat) | First cat or new felines | `/cats/new` |
| [Edit information](#editing-a-cat) | Update cat data | `/cats/[id]/edit` |
| [View details](#viewing-cat-details) | View history and statistics | `/cats/[id]` |
| [Delete cat](#deleting-a-cat) | Remove cat permanently | `/cats` |
| [Record weight](#recording-weight) | Track growth | `/weight` |

---

## Adding a New Cat

### Step by Step

1. Go to the **Cats** page at `/cats`
2. Click the **"Adicionar Gato"** (Add Cat) button at the top of the page
3. Fill in the information:

| Field | Type | Description | Required |
|-------|------|-------------|----------|
| Name | Text | Your cat's name | ✅ Yes |
| Photo | File | Cat image (optional) | ❌ No |
| Birth Date | Date | Date of birth (optional) | ❌ No |
| Weight (kg) | Number | Current weight in kg | ❌ No |
| Ideal Interval Between Meals | Number | Hours between meals | ✅ Yes |
| Recommended Portion | Number | Grams per meal | ❌ No |
| Dietary Restrictions | Text | Allergies or restrictions | ❌ No |
| Additional Notes | Text | Special notes | ❌ No |

4. Click **"Adicionar Gato"** (Add Cat) to save
5. You will be redirected to the cats list

---

## Editing a Cat

1. Go to the cats list at `/cats`
2. On the cat's card you want to change, click the **"Editar"** (edit) button (pencil icon)
3. Modify the desired information
4. Click **"Salvar"** (Save) to confirm changes
5. You will see a success message

---

## Deleting a Cat

1. On the cats list (`/cats`), click the **"Excluir"** (trash) button on the cat's card
2. A confirmation modal will appear
3. Click **"Confirmar"** (Confirm) to permanently delete
4. **Warning**: This action cannot be undone!

---

## Viewing Cat Details

Click on the cat's name or photo in the list to view a complete page with:

- **Profile Information**: Name, photo, age, current weight
- **Feeding History**: List of all recorded meals
- **Statistics**: Average portions, feeding frequency
- **Schedules**: Reminders configured for this cat
- **Weight Chart**: Weight evolution over time

---

## Recording Weight

To record a cat's weight:

1. Go to `/weight`
2. Select the cat from the dropdown
3. Click **"Registrar Peso"** (Record Weight)
4. Fill in the weight in kg and the date
5. Click **"Salvar"** (Save)

---

## Tips

- **Keep weight updated**: Record weight monthly to monitor health
- **Set feeding interval**: This helps with automatic reminders
- **Add a photo**: Makes it easier to identify each cat in multi-cat homes
- **Note restrictions**: Very important for caregivers and visitors

---

## Next Steps

Now that you know how to manage cats, learn to:

- [Recording Feedings](/docs/en/feeding/recording-feedings) - Record daily meals
- [Tracking Weight](/docs/en/weight/tracking-weight) - Monitor health
- [Creating Schedules](/docs/en/schedules/managing-schedules) - Set up automatic reminders
- [Viewing Statistics](/docs/en/statistics) - Analyze feeding patterns

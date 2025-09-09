# Testing Language Persistence

## What We've Implemented

1. **Database Schema**: Added `languages` JSONB column to `agent_configs` table
2. **API Updates**: Modified POST/PUT endpoints to save/load `languages` field
3. **UI Updates**: Modified session configuration panel to:
   - Load selected languages from database on mount
   - Save selected languages to database on save
   - Show previously selected languages as checked

## How to Test

1. **Open the web app**: http://localhost:3000
2. **Go to Session Configuration panel**
3. **Select some languages** (e.g., English, Spanish, French)
4. **Save the configuration**
5. **Refresh the page**
6. **Verify**: The previously selected languages should be checked

## Expected Behavior

- ✅ Languages are saved to database when you save the configuration
- ✅ Languages are loaded from database when the page loads
- ✅ Previously selected languages appear as checked checkboxes
- ✅ Language instructions are still appended to the agent instructions

## Database Verification

You can check the database directly:
```sql
SELECT name, languages FROM agent_configs WHERE is_active = true;
```

Should show something like:
```
name | languages
-----|----------
Default Assistant | ["English", "Spanish", "French"]
```

## API Verification

You can test the API directly:
```bash
curl -s "http://localhost:3000/api/agent-config?active=true" | jq '.languages'
```

Should return the array of selected languages.

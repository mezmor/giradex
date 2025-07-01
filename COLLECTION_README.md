# GiraDex Collection System

This document describes the Pokemon collection tracking system added to GiraDex.

## Features

### Collection Tracking
- Track which Pokémon you own with checkboxes in the Attacker Rankings
- Store individual IV values (Attack, Defense, HP) for each Pokémon
- Visual quality indicators based on IV perfection percentage
- Persistent storage using localStorage

### Collection Management Page
- **Navigation**: Access via the "Collection" menu item in the header
- **Statistics**: View total Pokémon count, perfect IV count, and average perfection
- **Export**: Download collection as JSON or formatted text file
- **Import**: Upload and merge collection data from JSON files
- **Clear**: Remove all Pokémon from collection (with confirmation)

### Data Structure
Each Pokémon in the collection is uniquely identified by:
- Pokémon ID
- Form (Normal, Alolan, Galarian, etc.)
- Shadow status (true/false)

Stored data includes:
- Basic Pokémon information (ID, name, form, shadow status)
- IV values (Attack, Defense, HP ranging from 0-15)
- Date added to collection

## Architecture

### Abstraction Layer
The collection system uses a clean abstraction layer (`CollectionStore` class) that separates data access from the frontend:

- **CollectionStore**: Handles all data operations with localStorage
- **Legacy Functions**: Maintained for backward compatibility
- **Frontend Functions**: Handle UI interactions and display

This design allows for easy migration to different storage backends (e.g., database) in the future without changing frontend code.

### Key Classes and Functions

#### CollectionStore Class
- `has(pokemon)`: Check if Pokémon exists in collection
- `get(pokemon)`: Retrieve Pokémon data from collection
- `set(pokemon, data)`: Add or update Pokémon in collection
- `remove(pokemon)`: Remove Pokémon from collection
- `updateIVs(pokemon, ivs)`: Update IV values for existing Pokémon
- `getAll()`: Get all collection data
- `setAll(data)`: Set all collection data (for import)
- `clear()`: Clear entire collection
- `getStats()`: Get collection statistics

#### Frontend Functions
- `InitializeCollection()`: Initialize the collection system
- `InitializeCollectionPage()`: Initialize collection page functionality
- `ExportCollection()`: Export collection as JSON file
- `ImportCollection(jsonData)`: Import collection from JSON data
- `ClearCollection()`: Clear entire collection with UI refresh

## Testing

### Unit Tests
Comprehensive unit tests are provided in `tests/collection_tests.js`:

- **Basic Operations**: Add, remove, update, retrieve Pokémon
- **Key Generation**: Unique identification for different Pokémon forms
- **Statistics**: Collection statistics calculation
- **Persistence**: Data persistence across page reloads
- **Import/Export**: Data import and export functionality
- **Legacy Compatibility**: Backward compatibility with existing functions

### Running Tests

#### Browser Tests
1. Open `tests/test_runner.html` in your browser
2. Click "Run Tests" to execute the test suite
3. View results in the console output

#### Node.js Tests
```bash
cd tests
node collection_tests.js
```

## Usage

### Adding Pokémon to Collection
1. Go to Attacker Rankings page
2. Enable "Collection Display" in settings
3. Click checkboxes next to Pokémon to add them (defaults to perfect IVs)
4. Click quality indicators to edit IV values

### Managing Collection
1. Click "Collection" in the navigation menu
2. View collection statistics and list of owned Pokémon
3. Use Export/Import buttons to backup or share collection data
4. Use Clear button to reset collection (with confirmation)

### Import/Export Format
The collection data is stored in JSON format:
```json
{
  "1-Normal-false": {
    "id": 1,
    "form": "Normal",
    "shadow": false,
    "name": "Bulbasaur",
    "ivs": {
      "atk": 15,
      "def": 14,
      "hp": 13
    },
    "dateAdded": "2024-01-01T00:00:00.000Z"
  }
}
```

## Quality Indicators
IV perfection is calculated as `(ATK + DEF + HP) / 45 * 100` and color-coded:
- **Purple**: Perfect (98-100%)
- **Blue**: Excellent (91-97%)
- **Green**: Great (82-90%)
- **Yellow**: Good (67-81%)
- **Red**: Poor (<67%)

## Future Enhancements
The abstraction layer design allows for easy implementation of:
- Database storage backend
- Cloud synchronization
- Advanced filtering and sorting
- Collection sharing between users
- Import from other tools/formats 
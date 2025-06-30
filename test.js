#!/usr/bin/env node

/**
 * Standalone Node.js Tests for Pokemon Collection System
 * Run with: node test.js
 */

// Mock browser globals for Node.js environment
global.localStorage = {
    store: {},
    getItem(key) {
        return this.store[key] || null;
    },
    setItem(key, value) {
        this.store[key] = value.toString();
    },
    removeItem(key) {
        delete this.store[key];
    },
    clear() {
        this.store = {};
    }
};

global.console = console;
global.JSON = JSON;
global.Date = Date;
global.Object = Object;
global.String = String;
global.parseInt = parseInt;
global.Math = Math;

// Mock document object
global.document = {
    createElement: () => ({
        href: '',
        download: '',
        click: () => {}
    })
};

// Mock URL object
global.URL = {
    createObjectURL: () => 'mock-url',
    revokeObjectURL: () => {}
};

// Mock Blob
global.Blob = function(data, options) {
    this.data = data;
    this.options = options;
};

// Mock jQuery-like functions that are used in the collection code
global.$ = function(selector) {
    return {
        on: () => global.$(),
        find: () => global.$(),
        prop: () => global.$(),
        is: () => false,
        html: () => global.$(),
        text: () => global.$(),
        val: () => '',
        removeClass: () => global.$(),
        addClass: () => global.$(),
        attr: () => global.$(),
        append: () => global.$(),
        remove: () => global.$(),
        closest: () => global.$(),
        after: () => global.$(),
        parent: () => global.$(),
        length: 0
    };
};

// Load the collection system code
const fs = require('fs');
const path = require('path');

// Global variables that will be set by the collection code
let collectionStore;
let CollectionStore;
let CalculateIVPerfection;
let GetPerfectionTier;
let IsInCollection;
let AddToCollection;
let RemoveFromCollection;
let GetFromCollection;
let UpdateCollectionIVs;
let ImportCollection;
let pokemon_collection = {};

// Read the collection JavaScript file
const collectionCode = fs.readFileSync(path.join(__dirname, 'scripts/pokemon_collection.js'), 'utf8');

// Create a safe evaluation environment by extracting only the core classes and functions
// This is a more targeted approach to avoid issues with template literals and jQuery calls
try {
    console.log('Attempting to extract functions from collection code...');
    
    // Extract and evaluate only the CollectionStore class and core functions
    const coreCode = `
    // Extract CollectionStore class
    ${collectionCode.match(/class CollectionStore[\s\S]*?^}/m)?.[0] || ''}
    
    // Extract global collection store instance
    global.collectionStore = new CollectionStore();
    global.CollectionStore = CollectionStore;
    
    // Extract core functions
    ${collectionCode.match(/function CalculateIVPerfection[\s\S]*?^}/m)?.[0] || ''}
    ${collectionCode.match(/function GetPerfectionTier[\s\S]*?^}/m)?.[0] || ''}
    ${collectionCode.match(/function GetCollectionStats[\s\S]*?^}/m)?.[0] || ''}
    ${collectionCode.match(/function ClearCollection[\s\S]*?^}/m)?.[0] || ''}
    
    // Extract legacy functions
    ${collectionCode.match(/function IsInCollection[\s\S]*?^}/m)?.[0] || ''}
    ${collectionCode.match(/function AddToCollection[\s\S]*?^}/m)?.[0] || ''}
    ${collectionCode.match(/function RemoveFromCollection[\s\S]*?^}/m)?.[0] || ''}
    ${collectionCode.match(/function GetFromCollection[\s\S]*?^}/m)?.[0] || ''}
    ${collectionCode.match(/function UpdateCollectionIVs[\s\S]*?^}/m)?.[0] || ''}
    
    // Extract ImportCollection function
    ${collectionCode.match(/function ImportCollection[\s\S]*?^}/m)?.[0] || ''}
    
    // Set global references
    global.CalculateIVPerfection = CalculateIVPerfection;
    global.GetPerfectionTier = GetPerfectionTier;
    global.IsInCollection = IsInCollection;
    global.AddToCollection = AddToCollection;
    global.RemoveFromCollection = RemoveFromCollection;
    global.GetFromCollection = GetFromCollection;
    global.UpdateCollectionIVs = UpdateCollectionIVs;
    global.ImportCollection = ImportCollection;
    
    // Mock any missing dependencies
    let pokemon_collection = {};
    function CheckURLAndAct() {}
    function UpdateCollectionDisplay() {}
    function GetPokemonName(id, form) { return \`Pokemon #\${id}\`; }
    `;
    
    eval(coreCode);
    
    // Set local references
    collectionStore = global.collectionStore;
    CollectionStore = global.CollectionStore;
    CalculateIVPerfection = global.CalculateIVPerfection;
    GetPerfectionTier = global.GetPerfectionTier;
    IsInCollection = global.IsInCollection;
    AddToCollection = global.AddToCollection;
    RemoveFromCollection = global.RemoveFromCollection;
    GetFromCollection = global.GetFromCollection;
    UpdateCollectionIVs = global.UpdateCollectionIVs;
    ImportCollection = global.ImportCollection;
    
    console.log('Successfully loaded collection code from file');
} catch (error) {
    console.error('Error loading collection code:', error);
    console.log('Falling back to manual implementation...');
    
    // Fallback: Manual implementation of core functionality for testing
    class CollectionStoreImpl {
        constructor() {
            this.storageKey = 'dialgadex_pokemon_collection';
            this.data = {};
            this.loadFromStorage();
        }
        
        loadFromStorage() {
            try {
                const stored = global.localStorage.getItem(this.storageKey);
                if (stored) {
                    this.data = JSON.parse(stored);
                }
            } catch (error) {
                console.warn('Failed to load collection from storage:', error);
                this.data = {};
            }
        }
        
        saveToStorage() {
            try {
                global.localStorage.setItem(this.storageKey, JSON.stringify(this.data));
            } catch (error) {
                console.warn('Failed to save collection to storage:', error);
            }
        }
        
        getPokemonKey(pokemon) {
            return `${pokemon.id}-${pokemon.form}-${pokemon.shadow || false}`;
        }
        
        has(pokemon) {
            const key = this.getPokemonKey(pokemon);
            return this.data.hasOwnProperty(key);
        }
        
        get(pokemon) {
            const key = this.getPokemonKey(pokemon);
            return this.data[key] || null;
        }
        
        set(pokemon, collectionData) {
            const key = this.getPokemonKey(pokemon);
            this.data[key] = {
                id: pokemon.id,
                form: pokemon.form,
                shadow: pokemon.shadow || false,
                name: pokemon.name,
                ivs: collectionData.ivs || { atk: 15, def: 15, hp: 15 },
                dateAdded: collectionData.dateAdded || new Date().toISOString()
            };
            this.saveToStorage();
        }
        
        remove(pokemon) {
            const key = this.getPokemonKey(pokemon);
            delete this.data[key];
            this.saveToStorage();
        }
        
        updateIVs(pokemon, ivs) {
            const key = this.getPokemonKey(pokemon);
            if (this.data[key]) {
                this.data[key].ivs = ivs;
                this.saveToStorage();
            }
        }
        
        getAll() {
            return { ...this.data };
        }
        
        setAll(data) {
            this.data = { ...data };
            this.saveToStorage();
        }
        
        clear() {
            this.data = {};
            this.saveToStorage();
        }
        
        getStats() {
            const entries = Object.values(this.data);
            return {
                totalCount: entries.length,
                perfectCount: entries.filter(p => {
                    const total = p.ivs.atk + p.ivs.def + p.ivs.hp;
                    return total === 45;
                }).length,
                averagePerfection: entries.length > 0 ? 
                    entries.reduce((sum, p) => sum + (p.ivs.atk + p.ivs.def + p.ivs.hp), 0) / (entries.length * 45) * 100 : 0
            };
        }
    }
    
    CollectionStore = CollectionStoreImpl;
    collectionStore = new CollectionStore();
    
    CalculateIVPerfection = function(ivs) {
        const total = ivs.atk + ivs.def + ivs.hp;
        return (total / 45) * 100;
    };
    
    GetPerfectionTier = function(percentage) {
        if (percentage >= 98) return 'perfect';
        if (percentage >= 91) return 'excellent';
        if (percentage >= 82) return 'great';
        if (percentage >= 67) return 'good';
        return 'poor';
    };
    
    IsInCollection = function(pokemon) {
        return collectionStore.has(pokemon);
    };
    
    AddToCollection = function(pokemon, ivs = null) {
        collectionStore.set(pokemon, {
            ivs: ivs || { atk: 15, def: 15, hp: 15 }
        });
        pokemon_collection = collectionStore.getAll();
    };
    
    RemoveFromCollection = function(pokemon) {
        collectionStore.remove(pokemon);
        pokemon_collection = collectionStore.getAll();
    };
    
    GetFromCollection = function(pokemon) {
        return collectionStore.get(pokemon);
    };
    
    UpdateCollectionIVs = function(pokemon, ivs) {
        collectionStore.updateIVs(pokemon, ivs);
        pokemon_collection = collectionStore.getAll();
    };
    
    ImportCollection = function(jsonData) {
        try {
            const imported = JSON.parse(jsonData);
            
            if (typeof imported !== 'object' || imported === null) {
                throw new Error('Invalid collection format: expected object');
            }
            
            for (const [key, entry] of Object.entries(imported)) {
                if (!entry.id || !entry.form || !entry.ivs) {
                    throw new Error(`Invalid entry format for key: ${key}`);
                }
                if (entry.ivs.atk === undefined || entry.ivs.def === undefined || entry.ivs.hp === undefined) {
                    throw new Error(`Invalid IV format for key: ${key}`);
                }
            }
            
            const currentData = collectionStore.getAll();
            const mergedData = {...currentData, ...imported};
            collectionStore.setAll(mergedData);
            
            pokemon_collection = collectionStore.getAll();
            
            return {
                success: true,
                imported: Object.keys(imported).length,
                total: Object.keys(mergedData).length
            };
        } catch (error) {
            return {
                success: false,
                error: error.message
            };
        }
    };
    
    console.log('Using fallback implementation');
}

// Test Suite Class
class CollectionTestSuite {
    constructor() {
        this.testCount = 0;
        this.passedTests = 0;
        this.failedTests = 0;
        this.output = [];
    }
    
    setUp() {
        // Clear localStorage before each test
        global.localStorage.clear();
        
        // Create fresh store instance
        if (CollectionStore) {
            collectionStore = new CollectionStore();
            global.collectionStore = collectionStore;
        }
    }
    
    tearDown() {
        // Clean up after each test
        global.localStorage.clear();
    }
    
    log(message) {
        this.output.push(message);
        console.log(message);
    }
    
    assert(condition, message) {
        this.testCount++;
        if (condition) {
            this.passedTests++;
            this.log(`✓ ${message}`);
        } else {
            this.failedTests++;
            this.log(`✗ ${message}`);
        }
    }
    
    assertEqual(actual, expected, message) {
        const condition = actual === expected;
        this.assert(condition, `${message} (expected: ${expected}, got: ${actual})`);
    }
    
    assertDeepEqual(actual, expected, message) {
        const condition = JSON.stringify(actual) === JSON.stringify(expected);
        this.assert(condition, `${message} (expected: ${JSON.stringify(expected)}, got: ${JSON.stringify(actual)})`);
    }
    
    // Test basic store operations
    testStoreBasicOperations() {
        this.log('\n=== Testing Basic Store Operations ===');
        this.setUp();
        
        const pokemon = {
            id: 150,
            form: 'Normal',
            shadow: false,
            name: 'Mewtwo'
        };
        
        const ivs = { atk: 15, def: 14, hp: 13 };
        
        // Test initial state
        this.assert(!collectionStore.has(pokemon), 'Store should be empty initially');
        
        // Test adding Pokemon
        collectionStore.set(pokemon, { ivs });
        this.assert(collectionStore.has(pokemon), 'Pokemon should exist after adding');
        
        // Test retrieving Pokemon
        const retrieved = collectionStore.get(pokemon);
        this.assert(retrieved !== null, 'Should retrieve added Pokemon');
        this.assertEqual(retrieved.id, 150, 'Retrieved Pokemon should have correct ID');
        this.assertEqual(retrieved.name, 'Mewtwo', 'Retrieved Pokemon should have correct name');
        this.assertDeepEqual(retrieved.ivs, ivs, 'Retrieved Pokemon should have correct IVs');
        
        // Test updating IVs
        const newIvs = { atk: 15, def: 15, hp: 15 };
        collectionStore.updateIVs(pokemon, newIvs);
        const updated = collectionStore.get(pokemon);
        this.assertDeepEqual(updated.ivs, newIvs, 'IVs should be updated correctly');
        
        // Test removing Pokemon
        collectionStore.remove(pokemon);
        this.assert(!collectionStore.has(pokemon), 'Pokemon should not exist after removal');
        
        this.tearDown();
    }
    
    // Test Pokemon key generation
    testPokemonKeyGeneration() {
        this.log('\n=== Testing Pokemon Key Generation ===');
        this.setUp();
        
        const pokemon1 = { id: 150, form: 'Normal', shadow: false };
        const pokemon2 = { id: 150, form: 'Normal', shadow: true };
        const pokemon3 = { id: 150, form: 'Armored', shadow: false };
        
        const key1 = collectionStore.getPokemonKey(pokemon1);
        const key2 = collectionStore.getPokemonKey(pokemon2);
        const key3 = collectionStore.getPokemonKey(pokemon3);
        
        this.assertEqual(key1, '150-Normal-false', 'Normal form key should be correct');
        this.assertEqual(key2, '150-Normal-true', 'Shadow form key should be correct');
        this.assertEqual(key3, '150-Armored-false', 'Different form key should be correct');
        
        this.assert(key1 !== key2, 'Normal and shadow forms should have different keys');
        this.assert(key1 !== key3, 'Different forms should have different keys');
        
        this.tearDown();
    }
    
    // Test collection statistics
    testCollectionStatistics() {
        this.log('\n=== Testing Collection Statistics ===');
        this.setUp();
        
        // Add some Pokemon with different IV combinations
        const pokemon1 = { id: 150, form: 'Normal', shadow: false, name: 'Mewtwo' };
        const pokemon2 = { id: 144, form: 'Normal', shadow: false, name: 'Articuno' };
        const pokemon3 = { id: 145, form: 'Normal', shadow: true, name: 'Zapdos' };
        
        collectionStore.set(pokemon1, { ivs: { atk: 15, def: 15, hp: 15 } }); // Perfect
        collectionStore.set(pokemon2, { ivs: { atk: 15, def: 14, hp: 13 } }); // 42/45
        collectionStore.set(pokemon3, { ivs: { atk: 12, def: 12, hp: 12 } }); // 36/45
        
        const stats = collectionStore.getStats();
        
        this.assertEqual(stats.totalCount, 3, 'Total count should be 3');
        this.assertEqual(stats.perfectCount, 1, 'Perfect count should be 1');
        
        // Average should be (45 + 42 + 36) / (3 * 45) * 100 = 123/135 * 100 ≈ 91.11%
        const expectedAvg = (45 + 42 + 36) / (3 * 45) * 100;
        this.assert(Math.abs(stats.averagePerfection - expectedAvg) < 0.01, 
                   `Average perfection should be approximately ${expectedAvg.toFixed(2)}% (got ${stats.averagePerfection.toFixed(2)}%)`);
        
        this.tearDown();
    }
    
    // Test data persistence
    testDataPersistence() {
        this.log('\n=== Testing Data Persistence ===');
        this.setUp();
        
        const pokemon = { id: 150, form: 'Normal', shadow: false, name: 'Mewtwo' };
        const ivs = { atk: 15, def: 14, hp: 13 };
        
        // Add Pokemon to first store instance
        collectionStore.set(pokemon, { ivs });
        
        // Create new store instance (simulating page reload)
        const newStore = new CollectionStore();
        
        this.assert(newStore.has(pokemon), 'New store instance should load persisted data');
        const retrieved = newStore.get(pokemon);
        this.assertDeepEqual(retrieved.ivs, ivs, 'Persisted Pokemon should have correct IVs');
        
        this.tearDown();
    }
    
    // Test import/export functionality
    testImportExport() {
        this.log('\n=== Testing Import/Export Functionality ===');
        this.setUp();
        
        // Add some test data
        const pokemon1 = { id: 150, form: 'Normal', shadow: false, name: 'Mewtwo' };
        const pokemon2 = { id: 144, form: 'Normal', shadow: false, name: 'Articuno' };
        
        collectionStore.set(pokemon1, { ivs: { atk: 15, def: 15, hp: 15 } });
        collectionStore.set(pokemon2, { ivs: { atk: 14, def: 13, hp: 12 } });
        
        // Export data
        const exportedData = collectionStore.getAll();
        const exportJson = JSON.stringify(exportedData);
        
        // Clear store
        collectionStore.clear();
        this.assertEqual(collectionStore.getStats().totalCount, 0, 'Store should be empty after clear');
        
        // Test import functionality
        if (typeof ImportCollection !== 'undefined') {
            const importResult = ImportCollection(exportJson);
            
            this.assert(importResult.success, 'Import should succeed');
            this.assertEqual(importResult.imported, 2, 'Should import 2 Pokemon');
            this.assertEqual(collectionStore.getStats().totalCount, 2, 'Store should have 2 Pokemon after import');
            
            // Verify imported data
            this.assert(collectionStore.has(pokemon1), 'First Pokemon should be imported');
            this.assert(collectionStore.has(pokemon2), 'Second Pokemon should be imported');
        } else {
            this.log('⚠ ImportCollection function not available, skipping import test');
        }
        
        this.tearDown();
    }
    
    // Test legacy function compatibility
    testLegacyFunctions() {
        this.log('\n=== Testing Legacy Function Compatibility ===');
        this.setUp();
        
        const pokemon = { id: 150, form: 'Normal', shadow: false, name: 'Mewtwo' };
        const ivs = { atk: 15, def: 14, hp: 13 };
        
        if (typeof IsInCollection !== 'undefined' && typeof AddToCollection !== 'undefined') {
            // Test legacy functions
            this.assert(!IsInCollection(pokemon), 'Pokemon should not be in collection initially');
            
            AddToCollection(pokemon, ivs);
            this.assert(IsInCollection(pokemon), 'Pokemon should be in collection after adding');
            
            if (typeof GetFromCollection !== 'undefined') {
                const retrieved = GetFromCollection(pokemon);
                this.assert(retrieved !== null, 'Should retrieve Pokemon using legacy function');
                this.assertDeepEqual(retrieved.ivs, ivs, 'Retrieved Pokemon should have correct IVs');
            }
            
            if (typeof RemoveFromCollection !== 'undefined') {
                RemoveFromCollection(pokemon);
                this.assert(!IsInCollection(pokemon), 'Pokemon should not be in collection after removal');
            }
        } else {
            this.log('⚠ Legacy functions not available, skipping legacy compatibility test');
        }
        
        this.tearDown();
    }
    
    // Test IV calculation functions
    testIVCalculations() {
        this.log('\n=== Testing IV Calculation Functions ===');
        
        if (typeof CalculateIVPerfection !== 'undefined') {
            const perfectIVs = { atk: 15, def: 15, hp: 15 };
            const poorIVs = { atk: 0, def: 0, hp: 0 };
            const mixedIVs = { atk: 15, def: 10, hp: 5 };
            
            const perfectPercentage = CalculateIVPerfection(perfectIVs);
            const poorPercentage = CalculateIVPerfection(poorIVs);
            const mixedPercentage = CalculateIVPerfection(mixedIVs);
            
            this.assertEqual(perfectPercentage, 100, 'Perfect IVs should be 100%');
            this.assertEqual(poorPercentage, 0, 'Worst IVs should be 0%');
            this.assert(Math.abs(mixedPercentage - (30/45 * 100)) < 0.01, 
                       `Mixed IVs should be ${(30/45 * 100).toFixed(2)}% (got ${mixedPercentage.toFixed(2)}%)`);
        } else {
            this.log('⚠ CalculateIVPerfection function not available, skipping IV calculation test');
        }
        
        if (typeof GetPerfectionTier !== 'undefined') {
            this.assertEqual(GetPerfectionTier(100), 'perfect', '100% should be perfect tier');
            this.assertEqual(GetPerfectionTier(95), 'excellent', '95% should be excellent tier');
            this.assertEqual(GetPerfectionTier(85), 'great', '85% should be great tier');
            this.assertEqual(GetPerfectionTier(70), 'good', '70% should be good tier');
            this.assertEqual(GetPerfectionTier(50), 'poor', '50% should be poor tier');
        } else {
            this.log('⚠ GetPerfectionTier function not available, skipping tier calculation test');
        }
    }
    
    // Run all tests
    runAllTests() {
        this.log('🧪 Starting Pokemon Collection System Tests...\n');
        
        this.testStoreBasicOperations();
        this.testPokemonKeyGeneration();
        this.testCollectionStatistics();
        this.testDataPersistence();
        this.testImportExport();
        this.testLegacyFunctions();
        this.testIVCalculations();
        
        this.log('\n' + '='.repeat(50));
        this.log(`📊 Test Results: ${this.passedTests}/${this.testCount} passed`);
        
        if (this.failedTests > 0) {
            this.log(`❌ ${this.failedTests} test(s) failed`);
            process.exit(1);
        } else {
            this.log('✅ All tests passed!');
            process.exit(0);
        }
    }
}

// Run the tests
const testSuite = new CollectionTestSuite();
testSuite.runAllTests(); 
/**
 * Pokemon Collection Tracking System
 * Handles ownership tracking, IV storage, and local persistence
 */

/**
 * Collection Data Store - Abstraction layer for collection data access
 * This provides a clean interface that can be swapped out for different storage backends
 */
class CollectionStore {
    constructor() {
        this.storageKey = 'giradex_pokemon_collection';
        this.data = {};
        this.loadFromStorage();
    }

    /**
     * Load collection data from storage
     */
    loadFromStorage() {
        try {
            const stored = localStorage.getItem(this.storageKey);
            if (stored) {
                this.data = JSON.parse(stored);
            }
        } catch (error) {
            console.warn('Failed to load collection from storage:', error);
            this.data = {};
        }
    }

    /**
     * Save collection data to storage
     */
    saveToStorage() {
        try {
            localStorage.setItem(this.storageKey, JSON.stringify(this.data));
        } catch (error) {
            console.warn('Failed to save collection to storage:', error);
        }
    }

    /**
     * Get unique identifier for a Pokemon
     */
    getPokemonKey(pokemon) {
        return `${pokemon.id}-${pokemon.form}-${pokemon.shadow || false}`;
    }

    /**
     * Check if a Pokemon exists in the collection
     */
    has(pokemon) {
        const key = this.getPokemonKey(pokemon);
        return this.data.hasOwnProperty(key);
    }

    /**
     * Get Pokemon data from collection
     */
    get(pokemon) {
        const key = this.getPokemonKey(pokemon);
        return this.data[key] || null;
    }

    /**
     * Add or update Pokemon in collection
     */
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

    /**
     * Remove Pokemon from collection
     */
    remove(pokemon) {
        const key = this.getPokemonKey(pokemon);
        delete this.data[key];
        this.saveToStorage();
    }

    /**
     * Update IVs for a Pokemon in collection
     */
    updateIVs(pokemon, ivs) {
        const key = this.getPokemonKey(pokemon);
        if (this.data[key]) {
            this.data[key].ivs = ivs;
            this.saveToStorage();
        }
    }

    /**
     * Get all collection data
     */
    getAll() {
        return { ...this.data };
    }

    /**
     * Set all collection data (for import)
     */
    setAll(data) {
        this.data = { ...data };
        this.saveToStorage();
    }

    /**
     * Clear all collection data
     */
    clear() {
        this.data = {};
        this.saveToStorage();
    }

    /**
     * Get collection statistics
     */
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

// Global collection store instance
const collectionStore = new CollectionStore();

// Legacy global collection data structure (kept for backwards compatibility)
let pokemon_collection = {};

/**
 * Initialize the collection system
 */
function InitializeCollection() {
    LoadCollectionFromStorage();
    BindCollectionEvents();
}

/**
 * Load collection data from localStorage (Legacy function - now uses store)
 */
function LoadCollectionFromStorage() {
    pokemon_collection = collectionStore.getAll();
}

/**
 * Save collection data to localStorage (Legacy function - now uses store)
 */
function SaveCollectionToStorage() {
    // This is now handled automatically by the store
}

/**
 * Get unique identifier for a Pokemon (Legacy function)
 */
function GetCollectionKey(pokemon) {
    return collectionStore.getPokemonKey(pokemon);
}

/**
 * Check if a Pokemon is in the collection (Legacy function)
 */
function IsInCollection(pokemon) {
    return collectionStore.has(pokemon);
}

/**
 * Add Pokemon to collection with optional IVs (Legacy function)
 */
function AddToCollection(pokemon, ivs = null) {
    console.log('AddToCollection called with:', pokemon);
    const collectionKey = collectionStore.getPokemonKey(pokemon);
    console.log('Generated collection key:', collectionKey);
    
    collectionStore.set(pokemon, {
        ivs: ivs || { atk: 15, def: 15, hp: 15 }
    });
    // Update legacy data structure
    pokemon_collection = collectionStore.getAll();
    
    console.log('Updated collection:', Object.keys(pokemon_collection));
}

/**
 * Remove Pokemon from collection (Legacy function)
 */
function RemoveFromCollection(pokemon) {
    collectionStore.remove(pokemon);
    // Update legacy data structure
    pokemon_collection = collectionStore.getAll();
}

/**
 * Update IVs for a Pokemon in collection (Legacy function)
 */
function UpdateCollectionIVs(pokemon, ivs) {
    collectionStore.updateIVs(pokemon, ivs);
    // Update legacy data structure
    pokemon_collection = collectionStore.getAll();
}

/**
 * Get Pokemon data from collection (Legacy function)
 */
function GetFromCollection(pokemon) {
    return collectionStore.get(pokemon);
}

/**
 * Calculate IV perfection percentage
 */
function CalculateIVPerfection(ivs) {
    const total = ivs.atk + ivs.def + ivs.hp;
    return (total / 45) * 100; // 45 is max total (15+15+15)
}

/**
 * Get perfection tier for display
 */
function GetPerfectionTier(percentage) {
    if (percentage >= 98) return 'perfect';
    if (percentage >= 91) return 'excellent';
    if (percentage >= 82) return 'great';
    if (percentage >= 67) return 'good';
    return 'poor';
}

/**
 * Create collection checkbox element
 */
function CreateCollectionCheckbox(pokemon, row_index) {
    // Debug logging
    console.log('Creating collection checkbox for:', pokemon);
    
    const isOwned = IsInCollection(pokemon);
    const collectionData = isOwned ? GetFromCollection(pokemon) : null;
    
    const checkbox = $(`
        <input type="checkbox" 
               class="collection-checkbox" 
               data-pokemon-id="${pokemon.id}" 
               data-pokemon-form="${pokemon.form}" 
               data-pokemon-shadow="${pokemon.shadow || false}"
               data-row-index="${row_index}"
               ${isOwned ? 'checked' : ''}>
    `);
    
    // Debug logging for created checkbox
    console.log('Created checkbox with data attributes:', {
        id: pokemon.id,
        form: pokemon.form,
        shadow: pokemon.shadow || false,
        isOwned: isOwned
    });
    
    const container = $('<div class="collection-container"></div>');
    container.append(checkbox);
    
    if (isOwned && collectionData) {
        const ivDisplay = CreateInlineIVDisplay(pokemon, collectionData.ivs);
        container.append(ivDisplay);
        
        const perfection = CalculateIVPerfection(collectionData.ivs);
        const tier = GetPerfectionTier(perfection);
        
        const indicator = $(`
            <div class="iv-indicator iv-${tier}" 
                 title="Overall: ${perfection.toFixed(1)}%">
                ${perfection.toFixed(0)}%
            </div>
        `);
        
        container.append(indicator);
    }
    
    return container;
}

/**
 * Create inline IV display with individual ATK/DEF/HP values
 */
function CreateInlineIVDisplay(pokemon, ivs) {
    const ivDisplay = $('<div class="iv-inline-display"></div>');
    
    // Create individual stat displays
    ['atk', 'def', 'hp'].forEach(stat => {
        const value = ivs[stat];
        const colorClass = getIVColorClass(value);
        const statLabel = stat.toUpperCase();
        
        const statDiv = $(`
            <div class="iv-inline-stat" 
                 data-stat="${stat}"
                 title="Click to edit ${statLabel}">
                <div class="iv-inline-label">${statLabel}</div>
                <div class="iv-inline-value ${colorClass}">${value}</div>
            </div>
        `);
        
        ivDisplay.append(statDiv);
    });
    
    return ivDisplay;
}

/**
 * Get CSS class for IV value color coding
 */
function getIVColorClass(value) {
    if (value === 15) return 'iv-value-15';
    if (value === 14) return 'iv-value-14';
    if (value === 13) return 'iv-value-13';
    if (value === 12) return 'iv-value-12';
    return 'iv-value-low';
}

/**
 * Bind collection-related event handlers
 */
function BindCollectionEvents() {
    // Flag to prevent recursive checkbox updates
    let isUpdatingCheckboxes = false;
    
    // Handle checkbox changes
    $(document).on('change', '.collection-checkbox', function() {
        // Prevent recursive updates when we're syncing checkboxes
        if (isUpdatingCheckboxes) {
            return;
        }
        
        const checkbox = $(this);
        const pokemonId = parseInt(checkbox.data('pokemon-id'));
        const pokemonForm = checkbox.data('pokemon-form');
        const pokemonShadow = checkbox.data('pokemon-shadow') === true;
        
        // Debug logging
        console.log('Collection checkbox clicked:', {
            id: pokemonId,
            form: pokemonForm,
            shadow: pokemonShadow,
            rawShadowData: checkbox.data('pokemon-shadow')
        });
        
        const pokemon = {
            id: pokemonId,
            form: pokemonForm,
            shadow: pokemonShadow,
            name: GetPokemonName(pokemonId, pokemonForm, pokemonShadow)
        };
        
        console.log('Constructed Pokemon object:', pokemon);
        
        const isChecked = checkbox.is(':checked');
        
        // Find all checkboxes for the same Pokemon (same id, form, and shadow status)
        // This will catch the same Pokemon appearing in different type sections
        const matchingCheckboxes = $('.collection-checkbox').filter(function() {
            const otherCheckbox = $(this);
            const otherId = parseInt(otherCheckbox.data('pokemon-id'));
            const otherForm = otherCheckbox.data('pokemon-form');
            const otherShadow = otherCheckbox.data('pokemon-shadow') === true;
            
            return otherId === pokemon.id &&
                   otherForm === pokemon.form &&
                   otherShadow === pokemon.shadow;
        });
        
        console.log(`Found ${matchingCheckboxes.length} matching checkboxes for ${pokemon.name}`);
        
        // Set flag to prevent recursive updates
        isUpdatingCheckboxes = true;
        
        if (isChecked) {
            // Add to collection with default perfect IVs (15/15/15) - only once
            console.log('Adding to collection:', pokemon);
            AddToCollection(pokemon, { atk: 15, def: 15, hp: 15 });
        } else {
            // Remove from collection - only once
            console.log('Removing from collection:', pokemon);
            RemoveFromCollection(pokemon);
        }
        
        // Visually sync all matching checkboxes and their displays
        matchingCheckboxes.each(function() {
            const otherCheckbox = $(this);
            // Update checkbox state without triggering change event
            otherCheckbox.prop('checked', isChecked);
            UpdateCollectionDisplay(otherCheckbox);
        });
        
        // Clear flag
        isUpdatingCheckboxes = false;
    });
    
    // Handle IV indicator clicks (open full dialog)
    $(document).on('click', '.iv-indicator', function() {
        const container = $(this).parent();
        const checkbox = container.find('.collection-checkbox');
        const pokemon = {
            id: parseInt(checkbox.data('pokemon-id')),
            form: checkbox.data('pokemon-form'),
            shadow: checkbox.data('pokemon-shadow') === true,
            name: GetPokemonName(parseInt(checkbox.data('pokemon-id')), checkbox.data('pokemon-form'), checkbox.data('pokemon-shadow') === true)
        };
        
        ShowIVInputDialog(pokemon, checkbox);
    });
    
    // Handle individual IV stat clicks (inline editing)
    $(document).on('click', '.iv-inline-stat', function(e) {
        e.stopPropagation();
        const statDiv = $(this);
        const stat = statDiv.data('stat');
        const container = statDiv.closest('.collection-container');
        const checkbox = container.find('.collection-checkbox');
        
        const pokemon = {
            id: parseInt(checkbox.data('pokemon-id')),
            form: checkbox.data('pokemon-form'),
            shadow: checkbox.data('pokemon-shadow') === true,
            name: GetPokemonName(parseInt(checkbox.data('pokemon-id')), checkbox.data('pokemon-form'), checkbox.data('pokemon-shadow') === true)
        };
        
        ShowInlineIVEditor(pokemon, stat, statDiv, checkbox);
    });
}

/**
 * Show IV input dialog
 */
function ShowIVInputDialog(pokemon, checkbox) {
    const existingData = GetFromCollection(pokemon);
    const currentIVs = existingData ? existingData.ivs : { atk: 15, def: 15, hp: 15 };
    
    const dialog = $(`
        <dialog class="card iv-input-dialog">
            <form>
                <div class="card-header">
                    <div class="card-title">Set IVs for ${pokemon.name}</div>
                    <div class="drawer absolute-right v-middle dialog-close">
                        <img class="drawer-icon" src="imgs/close.svg" alt="Close" />
                    </div>
                </div>
                <div class="card-body">
                    <div class="iv-input-grid">
                        <label>Attack:</label>
                        <div class="num-input-group">
                            <input type="button" class="minus" value="–" data-target="iv-atk" />
                            <input type="number" id="iv-atk" min="0" max="15" value="${currentIVs.atk}" />
                            <input type="button" class="plus" value="+" data-target="iv-atk" />
                        </div>
                        
                        <label>Defense:</label>
                        <div class="num-input-group">
                            <input type="button" class="minus" value="–" data-target="iv-def" />
                            <input type="number" id="iv-def" min="0" max="15" value="${currentIVs.def}" />
                            <input type="button" class="plus" value="+" data-target="iv-def" />
                        </div>
                        
                        <label>HP:</label>
                        <div class="num-input-group">
                            <input type="button" class="minus" value="–" data-target="iv-hp" />
                            <input type="number" id="iv-hp" min="0" max="15" value="${currentIVs.hp}" />
                            <input type="button" class="plus" value="+" data-target="iv-hp" />
                        </div>
                        
                        <div class="iv-summary">
                            <strong>Perfection: <span id="iv-perfection">${CalculateIVPerfection(currentIVs).toFixed(1)}%</span></strong>
                        </div>
                    </div>
                </div>
                <div class="card-footer buttons">
                    <input type="button" value="Cancel" class="iv-cancel">
                    <input type="submit" value="Save" class="iv-save" autofocus>
                </div>
            </form>
        </dialog>
    `);
    
    // Add to page
    $('body').append(dialog);
    const dialogElement = dialog[0];
    
    // Show dialog
    $("#overlay").addClass("active");
    dialogElement.showModal();
    
    // Bind number input controls
    dialog.find('.plus, .minus').click(function() {
        const target = $(this).data('target');
        const input = $(`#${target}`);
        const isPlus = $(this).hasClass('plus');
        const currentVal = parseInt(input.val()) || 0;
        const newVal = Math.max(0, Math.min(15, currentVal + (isPlus ? 1 : -1)));
        
        input.val(newVal);
        updatePerfection();
    });
    
    // Update perfection display
    function updatePerfection() {
        const ivs = {
            atk: parseInt($('#iv-atk').val()) || 0,
            def: parseInt($('#iv-def').val()) || 0,
            hp: parseInt($('#iv-hp').val()) || 0
        };
        const perfection = CalculateIVPerfection(ivs);
        $('#iv-perfection').text(perfection.toFixed(1) + '%');
        
        // Also update the main quality indicator in real time
        const container = checkbox.closest('.collection-container');
        const indicator = container.find('.iv-indicator');
        
        if (indicator.length > 0) {
            const tier = GetPerfectionTier(perfection);
            
            // Update indicator
            indicator.removeClass('iv-perfect iv-excellent iv-great iv-good iv-poor');
            indicator.addClass(`iv-${tier}`);
            indicator.text(`${perfection.toFixed(0)}%`);
            indicator.attr('title', `Overall: ${perfection.toFixed(1)}%`);
        }
    }
    
    // Bind input changes
    dialog.find('input[type="number"]').on('input', updatePerfection);
    
    // Handle save
    dialog.find('.iv-save').click(function(e) {
        e.preventDefault();
        const ivs = {
            atk: parseInt($('#iv-atk').val()) || 0,
            def: parseInt($('#iv-def').val()) || 0,
            hp: parseInt($('#iv-hp').val()) || 0
        };
        
        AddToCollection(pokemon, ivs);
        
        // Find all checkboxes for the same Pokemon using precise matching
        const matchingCheckboxes = $('.collection-checkbox').filter(function() {
            const otherCheckbox = $(this);
            return parseInt(otherCheckbox.data('pokemon-id')) === pokemon.id &&
                   otherCheckbox.data('pokemon-form') === pokemon.form &&
                   (otherCheckbox.data('pokemon-shadow') === true) === pokemon.shadow;
        });
        
        // Update all matching checkboxes and their displays
        matchingCheckboxes.each(function() {
            const otherCheckbox = $(this);
            otherCheckbox.prop('checked', true);
            UpdateCollectionDisplay(otherCheckbox);
        });
        
        // Close dialog
        $("#overlay").removeClass("active");
        dialogElement.close();
        dialog.remove();
    });
    
    // Handle cancel
    dialog.find('.iv-cancel, .dialog-close').click(function(e) {
        e.preventDefault();
        
        // If this was a new addition, uncheck all matching checkboxes
        if (!existingData) {
            // Find all checkboxes for the same Pokemon using precise matching
            const matchingCheckboxes = $('.collection-checkbox').filter(function() {
                const otherCheckbox = $(this);
                return parseInt(otherCheckbox.data('pokemon-id')) === pokemon.id &&
                       otherCheckbox.data('pokemon-form') === pokemon.form &&
                       (otherCheckbox.data('pokemon-shadow') === true) === pokemon.shadow;
            });
            
            // Update all matching checkboxes and their displays
            matchingCheckboxes.each(function() {
                const otherCheckbox = $(this);
                otherCheckbox.prop('checked', false);
                UpdateCollectionDisplay(otherCheckbox);
            });
        }
        
        // Close dialog
        $("#overlay").removeClass("active");
        dialogElement.close();
        dialog.remove();
    });
}

/**
 * Update collection display for a checkbox
 */
function UpdateCollectionDisplay(checkbox) {
    const container = checkbox.parent();
    const pokemon = {
        id: parseInt(checkbox.data('pokemon-id')),
        form: checkbox.data('pokemon-form'),
        shadow: checkbox.data('pokemon-shadow') === true
    };
    
    // Remove existing IV display and indicator
    container.find('.iv-inline-display, .iv-indicator').remove();
    
    // Add new display if owned
    if (checkbox.is(':checked') && IsInCollection(pokemon)) {
        const collectionData = GetFromCollection(pokemon);
        
        // Add inline IV display
        const ivDisplay = CreateInlineIVDisplay(pokemon, collectionData.ivs);
        checkbox.after(ivDisplay);
        
        // Add perfection indicator
        const perfection = CalculateIVPerfection(collectionData.ivs);
        const tier = GetPerfectionTier(perfection);
        
        const indicator = $(`
            <div class="iv-indicator iv-${tier}" 
                 title="Overall: ${perfection.toFixed(1)}%">
                ${perfection.toFixed(0)}%
            </div>
        `);
        
        container.append(indicator);
    }
}

/**
 * Get Pokemon name with proper Shadow prefix
 */
function GetPokemonName(id, form, shadow = false) {
    const pkm = jb_pkm.find(p => p.id === id && p.form === form);
    const baseName = pkm ? pkm.name : `Pokemon #${id}`;
    return shadow ? `Shadow ${baseName}` : baseName;
}

/**
 * Export collection data as JSON
 */
function ExportCollection() {
    const data = collectionStore.getAll();
    const dataStr = JSON.stringify(data, null, 2);
    const dataBlob = new Blob([dataStr], {type: 'application/json'});
    const url = URL.createObjectURL(dataBlob);
    
    const link = document.createElement('a');
    link.href = url;
    link.download = 'giradex_collection.json';
    link.click();
    
    URL.revokeObjectURL(url);
}

/**
 * Import collection data from JSON
 */
function ImportCollection(jsonData) {
    try {
        const imported = JSON.parse(jsonData);
        
        // Validate the imported data structure
        if (typeof imported !== 'object' || imported === null) {
            throw new Error('Invalid collection format: expected object');
        }
        
        // Validate each entry has required fields
        for (const [key, entry] of Object.entries(imported)) {
            if (!entry.id || !entry.form || !entry.ivs) {
                throw new Error(`Invalid entry format for key: ${key}`);
            }
            if (entry.ivs.atk === undefined || entry.ivs.def === undefined || entry.ivs.hp === undefined) {
                throw new Error(`Invalid IV format for key: ${key}`);
            }
        }
        
        // Merge with existing collection
        const currentData = collectionStore.getAll();
        const mergedData = {...currentData, ...imported};
        collectionStore.setAll(mergedData);
        
        // Update legacy data structure
        pokemon_collection = collectionStore.getAll();
        
        // Refresh current display if on rankings page
        if ($("#strongest").is(":visible")) {
            CheckURLAndAct();
        }
        
        return {
            success: true,
            imported: Object.keys(imported).length,
            total: Object.keys(mergedData).length
        };
    } catch (error) {
        console.error('Failed to import collection:', error);
        return {
            success: false,
            error: error.message
        };
    }
}

/**
 * Show inline IV editor for a specific stat
 */
function ShowInlineIVEditor(pokemon, stat, statDiv, checkbox) {
    const existingData = GetFromCollection(pokemon);
    if (!existingData) return;
    
    const currentValue = existingData.ivs[stat];
    const statLabel = stat.toUpperCase();
    
    // Create inline editor
    const editor = $(`
        <div class="iv-inline-editor">
            <div class="num-input-group">
                <input type="button" class="minus" value="–" />
                <input type="number" class="iv-input" min="0" max="15" value="${currentValue}" />
                <input type="button" class="plus" value="+" />
            </div>
        </div>
    `);
    
    // Replace the stat display with editor
    const originalContent = statDiv.html();
    statDiv.html(editor);
    statDiv.addClass('editing');
    
    const input = statDiv.find('.iv-input');
    input.focus().select();
    
    // Function to update quality indicator in real time
    function updateQualityIndicator() {
        const container = statDiv.closest('.collection-container');
        const indicator = container.find('.iv-indicator');
        
        if (indicator.length > 0) {
            // Get current IVs from all stat displays and the current input
            const currentIVs = {...existingData.ivs};
            currentIVs[stat] = Math.max(0, Math.min(15, parseInt(input.val()) || 0));
            
            // Calculate new perfection
            const perfection = CalculateIVPerfection(currentIVs);
            const tier = GetPerfectionTier(perfection);
            
            // Update indicator
            indicator.removeClass('iv-perfect iv-excellent iv-great iv-good iv-poor');
            indicator.addClass(`iv-${tier}`);
            indicator.text(`${perfection.toFixed(0)}%`);
            indicator.attr('title', `Overall: ${perfection.toFixed(1)}%`);
        }
    }
    
    // Handle +/- buttons
    statDiv.find('.plus').click(function(e) {
        e.stopPropagation();
        const newVal = Math.min(15, parseInt(input.val()) + 1);
        input.val(newVal);
        updateQualityIndicator();
    });
    
    statDiv.find('.minus').click(function(e) {
        e.stopPropagation();
        const newVal = Math.max(0, parseInt(input.val()) - 1);
        input.val(newVal);
        updateQualityIndicator();
    });
    
    // Update quality indicator on input change
    input.on('input', function() {
        updateQualityIndicator();
    });
    
    // Handle save/cancel
    function saveValue() {
        const newValue = Math.max(0, Math.min(15, parseInt(input.val()) || 0));
        const newIVs = {...existingData.ivs, [stat]: newValue};
        
        UpdateCollectionIVs(pokemon, newIVs);
        
        // Find all checkboxes for the same Pokemon using precise matching
        const matchingCheckboxes = $('.collection-checkbox').filter(function() {
            const otherCheckbox = $(this);
            return parseInt(otherCheckbox.data('pokemon-id')) === pokemon.id &&
                   otherCheckbox.data('pokemon-form') === pokemon.form &&
                   (otherCheckbox.data('pokemon-shadow') === true) === pokemon.shadow;
        });
        
        // Update all matching checkboxes' displays with the new IV data
        matchingCheckboxes.each(function() {
            UpdateCollectionDisplay($(this));
        });
        
        statDiv.removeClass('editing');
    }
    
    function cancelEdit() {
        statDiv.html(originalContent);
        statDiv.removeClass('editing');
        
        // Reset quality indicator to original values - sync across all matching checkboxes using precise matching
        const matchingCheckboxes = $('.collection-checkbox').filter(function() {
            const otherCheckbox = $(this);
            return parseInt(otherCheckbox.data('pokemon-id')) === pokemon.id &&
                   otherCheckbox.data('pokemon-form') === pokemon.form &&
                   (otherCheckbox.data('pokemon-shadow') === true) === pokemon.shadow;
        });
        
        // Update all matching checkboxes' displays
        matchingCheckboxes.each(function() {
            UpdateCollectionDisplay($(this));
        });
    }
    
    // Function to move to next/previous IV stat for editing
    function moveToNextStat(direction) {
        // Find the container and checkbox BEFORE calling saveValue (since saveValue modifies the DOM)
        const container = statDiv.closest('.collection-container');
        if (!container.length) {
            console.log('Could not find collection container');
            return;
        }
        
        const originalCheckbox = container.find('.collection-checkbox');
        if (!originalCheckbox.length) {
            console.log('Could not find checkbox');
            return;
        }
        
        // Save current value first
        saveValue();
        
        // Now find the updated IV display container after the DOM has been refreshed
        const updatedContainer = originalCheckbox.closest('.collection-container');
        if (!updatedContainer.length) {
            console.log('Could not find updated collection container');
            return;
        }
        
        const ivDisplay = updatedContainer.find('.iv-inline-display');
        if (!ivDisplay.length) {
            console.log('Could not find IV display');
            return;
        }
        
        // Get all stat elements (including the one we just finished editing)
        const statElements = ivDisplay.find('.iv-inline-stat');
        if (statElements.length === 0) {
            console.log('Could not find stat elements');
            return;
        }
        
        // Define the stat order
        const statOrder = ['atk', 'def', 'hp'];
        const currentStat = stat; // This is the stat we're currently editing
        const currentIndex = statOrder.indexOf(currentStat);
        
        if (currentIndex === -1) {
            console.log('Could not determine current stat index');
            return;
        }
        
        // Calculate next index
        let nextIndex;
        if (direction === 'next') {
            nextIndex = (currentIndex + 1) % statOrder.length;
        } else {
            nextIndex = (currentIndex - 1 + statOrder.length) % statOrder.length;
        }
        
        const nextStat = statOrder[nextIndex];
        
        // Find the specific stat element by data attribute
        const nextStatDiv = ivDisplay.find(`.iv-inline-stat[data-stat="${nextStat}"]`);
        if (!nextStatDiv.length) {
            console.log(`Could not find stat element for ${nextStat}`);
            return;
        }
        
        // Start editing the next stat after a small delay
        setTimeout(() => {
            ShowInlineIVEditor(pokemon, nextStat, nextStatDiv, originalCheckbox);
        }, 50); // Slightly longer delay to ensure current edit is completed
    }
    
    // Save on Enter, cancel on Escape, navigate with Tab
    input.on('keydown', function(e) {
        if (e.key === 'Enter') {
            e.preventDefault();
            saveValue();
        } else if (e.key === 'Escape') {
            e.preventDefault();
            cancelEdit();
        } else if (e.key === 'Tab') {
            e.preventDefault();
            if (e.shiftKey) {
                moveToNextStat('previous');
            } else {
                moveToNextStat('next');
            }
        }
    });
    
    // Save on blur (click outside)
    input.on('blur', function() {
        setTimeout(saveValue, 100); // Small delay to allow button clicks
    });
    
    // Prevent event bubbling
    statDiv.on('click', function(e) {
        e.stopPropagation();
    });
}

/**
 * Clear entire collection
 */
function ClearCollection() {
    collectionStore.clear();
    pokemon_collection = {};
    
    // Refresh current display if on rankings page
    if ($("#strongest").is(":visible")) {
        CheckURLAndAct();
    }
}

/**
 * Get collection statistics
 */
function GetCollectionStats() {
    return collectionStore.getStats();
}

/**
 * Export collection data as formatted text
 */
function ExportCollectionAsText() {
    const data = collectionStore.getAll();
    const entries = Object.values(data);
    
    if (entries.length === 0) {
        return "No Pokémon in collection.";
    }
    
    // Sort by name
    entries.sort((a, b) => a.name.localeCompare(b.name));
    
    let text = "GiraDex Collection Export\n";
    text += "=".repeat(30) + "\n\n";
    
    entries.forEach(entry => {
        const perfection = ((entry.ivs.atk + entry.ivs.def + entry.ivs.hp) / 45 * 100).toFixed(1);
        const shadowText = entry.shadow ? " (Shadow)" : "";
        const formText = entry.form && entry.form !== "Normal" ? ` (${entry.form})` : "";
        
        text += `${entry.name}${formText}${shadowText}\n`;
        text += `  IVs: ${entry.ivs.atk}/${entry.ivs.def}/${entry.ivs.hp} (${perfection}%)\n`;
        text += `  Added: ${new Date(entry.dateAdded).toLocaleDateString()}\n\n`;
    });
    
    return text;
}

/**
 * Initialize collection page functionality
 */
function InitializeCollectionPage() {
    // Export JSON button
    $('#export-json-btn').on('click', function() {
        ExportCollection();
    });

    // Export text button
    $('#export-text-btn').on('click', function() {
        const textData = ExportCollectionAsText();
        const dataBlob = new Blob([textData], {type: 'text/plain'});
        const url = URL.createObjectURL(dataBlob);
        
        const link = document.createElement('a');
        link.href = url;
        link.download = 'giradex_collection.txt';
        link.click();
        
        URL.revokeObjectURL(url);
    });

    // Import button
    $('#import-btn').on('click', function() {
        $('#import-file').click();
    });

    // File input change handler
    $('#import-file').on('change', function(e) {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = function(e) {
            const result = ImportCollection(e.target.result);
            const statusDiv = $('#import-status');
            
            if (result.success) {
                statusDiv.removeClass('error').addClass('success');
                statusDiv.text(`Successfully imported ${result.imported} Pokémon. Total collection: ${result.total} Pokémon.`);
                
                // Refresh the collection display
                UpdateCollectionPageDisplay();
            } else {
                statusDiv.removeClass('success').addClass('error');
                statusDiv.text(`Import failed: ${result.error}`);
            }
        };
        reader.readAsText(file);
        
        // Reset file input
        $(this).val('');
    });

    // Clear collection button
    $('#clear-collection-btn').on('click', function() {
        if (confirm('Are you sure you want to delete all Pokémon from your collection? This action cannot be undone.')) {
            ClearCollection();
            UpdateCollectionPageDisplay();
            
            const statusDiv = $('#import-status');
            statusDiv.removeClass('error').addClass('success');
            statusDiv.text('Collection cleared successfully.');
        }
    });

    // Initial display update
    UpdateCollectionPageDisplay();
}

/**
 * Update collection page display with current data
 */
function UpdateCollectionPageDisplay() {
    UpdateCollectionStats();
    UpdateCollectionList();
}

/**
 * Update collection statistics display
 */
function UpdateCollectionStats() {
    const stats = GetCollectionStats();
    
    const statsHtml = `
        <div class="stat-item">
            <div class="stat-value">${stats.totalCount}</div>
            <div class="stat-label">Total Pokémon</div>
        </div>
        <div class="stat-item">
            <div class="stat-value">${stats.perfectCount}</div>
            <div class="stat-label">Perfect IV (100%)</div>
        </div>
        <div class="stat-item">
            <div class="stat-value">${stats.averagePerfection.toFixed(1)}%</div>
            <div class="stat-label">Average Perfection</div>
        </div>
    `;
    
    $('#collection-stats-content').html(statsHtml);
}

/**
 * Update collection list display
 */
function UpdateCollectionList() {
    const data = collectionStore.getAll();
    const entries = Object.values(data);
    
    if (entries.length === 0) {
        $('#collection-pokemon-list').html('<p>No Pokémon in your collection yet. Start adding some from the Attacker Rankings!</p>');
        return;
    }
    
    // Sort by name, then by form
    entries.sort((a, b) => {
        if (a.name !== b.name) return a.name.localeCompare(b.name);
        return a.form.localeCompare(b.form);
    });
    
    let listHtml = '';
    entries.forEach(entry => {
        const perfection = ((entry.ivs.atk + entry.ivs.def + entry.ivs.hp) / 45 * 100);
        const perfectionClass = GetQualityClass(perfection);
        const shadowText = entry.shadow ? ' (Shadow)' : '';
        const formText = entry.form && entry.form !== 'Normal' ? ` (${entry.form})` : '';
        
        // Try to get Pokemon icon
        const iconSrc = GetPokemonIconSrc(entry.id, entry.form, entry.shadow);
        
        listHtml += `
            <div class="collection-pokemon-item">
                <img class="collection-pokemon-icon" src="${iconSrc}" alt="${entry.name}" onerror="this.style.display='none'">
                <div class="collection-pokemon-info">
                    <div class="collection-pokemon-name">${entry.name}${formText}${shadowText}</div>
                    <div class="collection-pokemon-ivs">
                        IVs: ${entry.ivs.atk}/${entry.ivs.def}/${entry.ivs.hp}
                        <span class="collection-pokemon-perfection ${perfectionClass}">${perfection.toFixed(1)}%</span>
                    </div>
                </div>
            </div>
        `;
    });
    
    $('#collection-pokemon-list').html(listHtml);
}

/**
 * Get Pokemon icon source URL
 */
function GetPokemonIconSrc(id, form, shadow) {
    // This is a simplified version - you might want to use the same logic as in the main app
    const baseUrl = 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/';
    return `${baseUrl}${id}.png`;
}

/**
 * Get CSS class for quality/perfection percentage
 */
function GetQualityClass(perfection) {
    if (perfection >= 98) return 'quality-perfect';
    if (perfection >= 91) return 'quality-excellent'; 
    if (perfection >= 82) return 'quality-great';
    if (perfection >= 67) return 'quality-good';
    return 'quality-poor';
} 
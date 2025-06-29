/**
 * Pokemon Collection Tracking System
 * Handles ownership tracking, IV storage, and local persistence
 */

// Collection storage key for localStorage
const COLLECTION_STORAGE_KEY = 'dialgadex_pokemon_collection';

// Global collection data structure
let pokemon_collection = {};

/**
 * Initialize the collection system
 */
function InitializeCollection() {
    LoadCollectionFromStorage();
    BindCollectionEvents();
}

/**
 * Load collection data from localStorage
 */
function LoadCollectionFromStorage() {
    try {
        const stored = localStorage.getItem(COLLECTION_STORAGE_KEY);
        if (stored) {
            pokemon_collection = JSON.parse(stored);
        }
    } catch (error) {
        console.warn('Failed to load collection from storage:', error);
        pokemon_collection = {};
    }
}

/**
 * Save collection data to localStorage
 */
function SaveCollectionToStorage() {
    try {
        localStorage.setItem(COLLECTION_STORAGE_KEY, JSON.stringify(pokemon_collection));
    } catch (error) {
        console.warn('Failed to save collection to storage:', error);
    }
}

/**
 * Get unique identifier for a Pokemon
 */
function GetCollectionKey(pokemon) {
    return `${pokemon.id}-${pokemon.form}-${pokemon.shadow || false}`;
}

/**
 * Check if a Pokemon is in the collection
 */
function IsInCollection(pokemon) {
    const key = GetCollectionKey(pokemon);
    return pokemon_collection.hasOwnProperty(key);
}

/**
 * Add Pokemon to collection with optional IVs
 */
function AddToCollection(pokemon, ivs = null) {
    const key = GetCollectionKey(pokemon);
    pokemon_collection[key] = {
        id: pokemon.id,
        form: pokemon.form,
        shadow: pokemon.shadow || false,
        name: pokemon.name,
        ivs: ivs || { atk: 15, def: 15, hp: 15 },
        dateAdded: new Date().toISOString()
    };
    SaveCollectionToStorage();
}

/**
 * Remove Pokemon from collection
 */
function RemoveFromCollection(pokemon) {
    const key = GetCollectionKey(pokemon);
    delete pokemon_collection[key];
    SaveCollectionToStorage();
}

/**
 * Update IVs for a Pokemon in collection
 */
function UpdateCollectionIVs(pokemon, ivs) {
    const key = GetCollectionKey(pokemon);
    if (pokemon_collection[key]) {
        pokemon_collection[key].ivs = ivs;
        SaveCollectionToStorage();
    }
}

/**
 * Get Pokemon data from collection
 */
function GetFromCollection(pokemon) {
    const key = GetCollectionKey(pokemon);
    return pokemon_collection[key] || null;
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
    // Handle checkbox changes
    $(document).on('change', '.collection-checkbox', function() {
        const checkbox = $(this);
        const pokemon = {
            id: parseInt(checkbox.data('pokemon-id')),
            form: checkbox.data('pokemon-form'),
            shadow: checkbox.data('pokemon-shadow') === 'true',
            name: GetPokemonName(parseInt(checkbox.data('pokemon-id')), checkbox.data('pokemon-form'))
        };
        
        if (checkbox.is(':checked')) {
            // Add to collection with default perfect IVs (15/15/15)
            AddToCollection(pokemon, { atk: 15, def: 15, hp: 15 });
            UpdateCollectionDisplay(checkbox);
        } else {
            // Remove from collection
            RemoveFromCollection(pokemon);
            UpdateCollectionDisplay(checkbox);
        }
    });
    
    // Handle IV indicator clicks (open full dialog)
    $(document).on('click', '.iv-indicator', function() {
        const container = $(this).parent();
        const checkbox = container.find('.collection-checkbox');
        const pokemon = {
            id: parseInt(checkbox.data('pokemon-id')),
            form: checkbox.data('pokemon-form'),
            shadow: checkbox.data('pokemon-shadow') === 'true',
            name: GetPokemonName(parseInt(checkbox.data('pokemon-id')), checkbox.data('pokemon-form'))
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
            shadow: checkbox.data('pokemon-shadow') === 'true',
            name: GetPokemonName(parseInt(checkbox.data('pokemon-id')), checkbox.data('pokemon-form'))
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
        checkbox.prop('checked', true);
        UpdateCollectionDisplay(checkbox);
        
        // Close dialog
        $("#overlay").removeClass("active");
        dialogElement.close();
        dialog.remove();
    });
    
    // Handle cancel
    dialog.find('.iv-cancel, .dialog-close').click(function(e) {
        e.preventDefault();
        
        // If this was a new addition, uncheck the box
        if (!existingData) {
            checkbox.prop('checked', false);
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
        shadow: checkbox.data('pokemon-shadow') === 'true'
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
 * Get Pokemon name from ID and form
 */
function GetPokemonName(id, form) {
    const pkm = jb_pkm.find(p => p.id === id && p.form === form);
    return pkm ? pkm.name : `Pokemon #${id}`;
}

/**
 * Export collection data as JSON
 */
function ExportCollection() {
    const dataStr = JSON.stringify(pokemon_collection, null, 2);
    const dataBlob = new Blob([dataStr], {type: 'application/json'});
    const url = URL.createObjectURL(dataBlob);
    
    const link = document.createElement('a');
    link.href = url;
    link.download = 'dialgadex_collection.json';
    link.click();
    
    URL.revokeObjectURL(url);
}

/**
 * Import collection data from JSON
 */
function ImportCollection(jsonData) {
    try {
        const imported = JSON.parse(jsonData);
        pokemon_collection = {...pokemon_collection, ...imported};
        SaveCollectionToStorage();
        
        // Refresh current display if on rankings page
        if ($("#strongest").is(":visible")) {
            CheckURLAndAct();
        }
        
        return true;
    } catch (error) {
        console.error('Failed to import collection:', error);
        return false;
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
        UpdateCollectionDisplay(checkbox);
        
        statDiv.removeClass('editing');
    }
    
    function cancelEdit() {
        statDiv.html(originalContent);
        statDiv.removeClass('editing');
        
        // Reset quality indicator to original values
        UpdateCollectionDisplay(checkbox);
    }
    
    // Save on Enter, cancel on Escape
    input.on('keydown', function(e) {
        if (e.key === 'Enter') {
            e.preventDefault();
            saveValue();
        } else if (e.key === 'Escape') {
            e.preventDefault();
            cancelEdit();
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
/**
 * Gets the Pokemon GO stats of a specific pokemon. If level or ivs aren't
 * specified, they default to the settings level and the maximum ivs.
 */
function GetPokemonStats(pkm_obj, level = null, ivs = null) {

    if (!level) {
        level = settings_default_level[0];
    }
    if (!ivs)
        ivs = { atk: 15, def: 15, hp: 15 };

    let stats = pkm_obj.stats;

    let cpm = GetCPMForLevel(level);

    stats.atk = (stats.baseAttack + ivs.atk) * cpm;
    stats.def = (stats.baseDefense + ivs.def) * cpm;
    stats.hp = (stats.baseStamina + ivs.hp) * cpm;

    return {...stats}; // returns by copy to prevent reassignment of reference
}

/**
 * Gets the Pokemon GO stats of a specific raid boss, using the correct CPM
 * and HP value.
 */
function GetRaidStats(pkm_obj, tier = null) {

    if (!tier) {
        tier = 3;
        if (pkm_obj.class)
            tier = 5;
        if (pkm_obj.form == "Mega" || pkm_obj.form == "MegaY")
            tier = 4;
        if (pkm_obj.class && pkm_obj.form == "Mega")
            tier = 6;
    }
    
    const ivs = { atk: 15, def: 15, hp: 15 };
    const cpm = [,0.6,0.67,0.73,0.79,0.79,0.79,1.0][tier];

    let stats = {...pkm_obj.stats};
    
    stats.atk = (stats.baseAttack + ivs.atk) * cpm;
    stats.def = (stats.baseDefense + ivs.def) * cpm;
    stats.hp = [,600,,3600,9000,15000,22500,20000][tier];

    return stats; // returns by copy to prevent reassignment of reference
}



/**
 * Gets array of six arrays. The specified Pokemon's 
 * fast moves, elite fast moves, 
 * charged moves, elite charged moves,
 * pure-only charged moves, and shadow-only charged moves.
 */
function GetPokemonMoves(pkm_obj) {

    if (!pkm_obj.fm && !pkm_obj.cm)
        return [];

    let fm = pkm_obj.fm.slice();
    let elite_fm = [];
    if (pkm_obj.elite_fm)
        elite_fm = pkm_obj.elite_fm.slice();
    let cm = pkm_obj.cm.slice();
    let elite_cm = [];
    if (pkm_obj.elite_cm)
        elite_cm = pkm_obj.elite_cm.slice();

    // checks for hidden power
    if (fm.includes("Hidden Power") || elite_fm.includes("Hidden Power")) {
        for (let type of POKEMON_TYPES) {
            if (!["Normal", "Fairy"].includes(type) && pkm_obj.types.includes(type)) {
                if (fm.includes("Hidden Power"))
                    fm.push("Hidden Power " + type);
                if (elite_fm.includes("Hidden Power"))
                    elite_fm.push("Hidden Power " + type)
            }
        }
    }

    let shadow_only_cm = [];
    let pure_only_cm = [];
    if (pkm_obj.shadow_released) {
        //shadow_only_cm.push('Frustration'); // Ignore Frustration because BAD
        pure_only_cm.push('Return');
    }
    else if (pkm_obj.form == "Mega" || pkm_obj.form == "MegaY") { // Check Return for purified megas
        const def_form = GetPokemonForms(pkm_obj.id)[0];
        const def_pkm_obj = jb_pkm.find(e => e.id == pkm_obj.id && e.form == def_form);

        if (def_pkm_obj.shadow_released)
            pure_only_cm.push('Return');
    }

    // Add moves to Apex Forms
    if (pkm_obj.form == "S") {
        if (pkm_obj.id == 249) { // Apex Lugia
            shadow_only_cm.push('Aeroblast Plus');
            pure_only_cm.push('Aeroblast Plus Plus');
        }
        if (pkm_obj.id == 250) { // Apex Ho-Oh
            shadow_only_cm.push('Sacred Fire Plus');
            pure_only_cm.push('Sacred Fire Plus Plus');
        }
    }

    return [fm, cm, elite_fm, elite_cm, pure_only_cm, shadow_only_cm];
}


/**
 * Builds a unique string based on a pokemon for uses like hashing.
 * 
 * Expects either a member of jb_pkm or a moveset entry returned from 
 * a "Strongest Movesets" function.
 * 
 * If unique_shadow is false, shadows will hash to the same as their pure form.
 */
function GetUniqueIdentifier(pkm_obj, unique_shadow = true) {
    return pkm_obj.id + "-" + 
        pkm_obj.form + "-" + 
        (unique_shadow ? pkm_obj.shadow + "-" : "") + 
        (pkm_obj.level !== undefined ? pkm_obj.level : settings_default_level[0]);
}


/**
* Gets the pokemon id from a clean input (lowercase alphanumeric).
* The input could be the id itself or the pokemon name.
* Returns 0 if it doesn't find it.
*/
function GetPokemonId(clean_input) {

    // checks for an id
    if (/^\d+$/.test(clean_input)) { // if input is an integer
        if (clean_input >= 1 && clean_input <= jb_max_id)
            return parseInt(clean_input);
    }

    // checks for a name
    let pokemon_id = 0;
    Object.keys(jb_names).forEach(function (key) {
        if (CleanPokeName(jb_names[key].name) == clean_input)
            pokemon_id = key;
    });

    // if still didn't find anything
    if (pokemon_id == 0) {

        // checks for stupid nidoran
        if (clean_input == "nidoranf")
            return 29;
        else if (clean_input == "nidoranm")
            return 32;
    }

    if (pokemon_id > jb_max_id)
        return 0;

    return parseInt(pokemon_id);
}

/**
 * Gets a pokemon container div element set up with a specified pokemon.
 */
function GetPokemonContainer(pokemon_id, is_selected, form = "Normal") {

    const poke_obj = jb_pkm.find(e => e.id == pokemon_id && e.form == form);

    let pokemon_name;
    let can_be_shadow = false;
    if (poke_obj) {
        pokemon_name = poke_obj.name;
        can_be_shadow = poke_obj.shadow && poke_obj.shadow_released;
    }
    else {
        pokemon_name = jb_names[pokemon_id].name;
    }
    
    const img_src_name = GetPokemonImgSrcName(pokemon_id, form);
    let img_src = GIFS_URL + img_src_name + ".gif";
    const form_text = GetFormText(pokemon_id, form);

    // container div
    const pokemon_container_div = $("<div></div>");

    // form text p
    if (form_text.length > 0) {
        const form_text_div = $("<div class='pokemon-form'>"
                + "<p class='pokefont unselectable small-text'>"
                + form_text + "</p></div>");
        pokemon_container_div.append(form_text_div);
    }

    // shiny img
    const shiny_img =
        $("<div class=shiny-img-div><img src=imgs/shiny.png></img></div>");
    pokemon_container_div.append(shiny_img);

    // img container div
    let img_container_div = $("<div class=img-container></div>");
    if (is_selected)
        img_container_div.addClass('container-selected');
    img_container_div.append(
            $("<img class=loading src=imgs/loading.gif></img>"));
    img_container_div.append($("<img class=pokemon-img "
            + "onload ='HideLoading(this)' onerror='TryNextSrc(this)'"
            + " onclick='SwapShiny(this)' src="
            + img_src + "></img>"));
    pokemon_container_div.append(img_container_div);

    // pokemon name p
    const pokemon_name_p= $("<p class='pokemon-name pokefont unselectable'>#" 
            + pokemon_id + " "
            + pokemon_name
            + "</p>");
    pokemon_name_p.on('click', e => LoadPokedexAndUpdateURL(GetPokeDexMon(pokemon_id, form)));
    if (is_selected && poke_obj && form != "Mega" && form != "MegaY") {
        const shadow_icon = $("<img src='imgs/flame.svg' class='shadow-icon filter-" + (can_be_shadow ? 'shadow' : 'noshadow') + "'></img>");
        shadow_icon.on('click', function(e) { 
            poke_obj.shadow = !can_be_shadow;
            poke_obj.shadow_released = !can_be_shadow;
        })
        pokemon_name_p.append(shadow_icon);
    }
    pokemon_container_div.append(pokemon_name_p);

    // pokemon types
    const types = poke_obj !== undefined ? poke_obj.types : [];
    const pokemon_types_div = $("<div class=pokemon-types></div>");
    for (type of types) {
        pokemon_types_div.append($("<img src=imgs/types/"
                + type.toLowerCase() + ".gif" 
                + " onclick='LoadStrongestAndUpdateURL(\"" + type
                + "\", false)'></img>"));
    }
    pokemon_container_div.append(pokemon_types_div);

    return pokemon_container_div;
}

/**
 * Makes string clean, all lowercases and only alphanumeric characters.
 */
function CleanPokeName(string) {

    return string.toLowerCase().replace(/\W/g, "");
}

/**
 * Loops through all pokemon, finding those that match 'search_params' and
 * calling a helper function for all matches.
 * 
 * 'f_process_pokemon' hs signature function(pkm_obj, is_shadow, search_params)
 */
function SearchAll(search_params, f_process_pokemon) {
    for (let id = 1; id <= jb_max_id; id++) {
        const forms = GetPokemonForms(id);
        const def_form = forms[0];
    
        let pkm_obj = jb_pkm.find(entry =>
                entry.id == id && entry.form == def_form);
    
        // checks whether pokemon should be skipped
        // (not released or legendary when not allowed)
        if (!pkm_obj || (!search_params.unreleased && !pkm_obj.released)
                || (!search_params.legendary && pkm_obj.class)) {
            continue;
        }
    
        for (let level of settings_default_level) {
            if (pkm_obj.class == undefined && settings_xl_budget)
                level = 50;

            // default form
            f_process_pokemon(pkm_obj, false, level, search_params);
        
            // shadow (except not released when it shouldn't)
            if (search_params.shadow && pkm_obj.shadow
                && !(!search_params.unreleased && !pkm_obj.shadow_released)) {
                    f_process_pokemon(pkm_obj, true, level, search_params);
            }
        
            // other forms
            for (let form_i = 1; form_i < forms.length; form_i++) {
        
                pkm_obj = jb_pkm.find(entry =>
                        entry.id == id && entry.form == forms[form_i]);
        
                // checks whether pokemon should be skipped (form not released)
                if (!pkm_obj || (!search_params.unreleased && !pkm_obj.released)
                    || (!search_params.mega && (pkm_obj.form == "Mega" || pkm_obj.form == "MegaY")))
                    continue;
        
                f_process_pokemon(pkm_obj, false, level, search_params);                                                    
                // other forms and shadow (except not released when it shouldn't)
                if (search_params.shadow && pkm_obj.shadow
                    && !(!search_params.unreleased && !pkm_obj.shadow_released)) {
                        f_process_pokemon(pkm_obj, true, level, search_params);
                }
            }
        }
    }
    
}

/**
 * Take a pokemon object and convert it into an enemy that can be calc'd against
 */
function GetEnemyParams(enemy_pkm_obj) {
    return {
        moves: GetPokemonMoves(enemy_pkm_obj),
        types: enemy_pkm_obj.types,
        weakness: GetTypesEffectivenessAgainstTypes(enemy_pkm_obj.types),
        stats: GetRaidStats(enemy_pkm_obj)
    };
}

/**
 * Gets the Pokemon GO stats of a specific pokemon. If level or ivs aren't
 * specified, they default to the settings level and the maximum ivs.
 */
function GetPokemonStats(jb_pkm_obj, mega, mega_y, level = null, ivs = null) {

    if (!level) {
        level = settings_default_level[0];
    }
    if (!ivs)
        ivs = { atk: 15, def: 15, hp: 15 };

    let stats;

    if (mega && mega_y) // mega y
        stats = jb_pkm_obj.mega[1].stats;
    else if (mega) // mega x or normal mega
        stats = jb_pkm_obj.mega[0].stats;
    else // any form non mega
        stats = jb_pkm_obj.stats;

    let cpm = GetCPMForLevel(level);

    stats.atk = (stats.baseAttack + ivs.atk) * cpm;
    stats.def = (stats.baseDefense + ivs.def) * cpm;
    stats.hp = (stats.baseStamina + ivs.hp) * cpm;

    return {...stats}; // returns by copy to prevent reassignment of reference
}


/**
 * Gets array of six arrays. The specified Pokemon's 
 * fast moves, elite fast moves, 
 * charged moves, elite charged moves,
 * pure-only charged moves, and shadow-only charged moves.
 */
function GetPokemonMoves(jb_pkm_obj) {

    if (!jb_pkm_obj.fm && !jb_pkm_obj.cm)
        return [];

    let fm = jb_pkm_obj.fm.slice();
    let elite_fm = [];
    if (jb_pkm_obj.elite_fm)
        elite_fm = jb_pkm_obj.elite_fm.slice();
    let cm = jb_pkm_obj.cm.slice();
    let elite_cm = [];
    if (jb_pkm_obj.elite_cm)
        elite_cm = jb_pkm_obj.elite_cm.slice();

    // checks for hidden power
    if (fm.includes("Hidden Power") || elite_fm.includes("Hidden Power")) {
        for (let type of POKEMON_TYPES) {
            if (!["Normal", "Fairy"].includes(type) && jb_pkm_obj.types.includes(type)) {
                if (fm.includes("Hidden Power"))
                    fm.push("Hidden Power " + type);
                if (elite_fm.includes("Hidden Power"))
                    elite_fm.push("Hidden Power " + type)
            }
        }
    }

    let shadow_only_cm = [];
    let pure_only_cm = [];
    if (jb_pkm_obj.shadow_released) {
        //shadow_only_cm.push('Frustration'); // Ignore Frustration because BAD
        pure_only_cm.push('Return');
    }

    // Add moves to Apex Forms
    if (jb_pkm_obj.form == "S") {
        if (jb_pkm_obj.id == 249) { // Apex Lugia
            shadow_only_cm.push('Aeroblast Plus');
            pure_only_cm.push('Aeroblast Plus Plus');
        }
        if (jb_pkm_obj.id == 250) { // Apex Ho-Oh
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
        pkm_obj.mega + "-" + 
        pkm_obj.mega_y + "-" + 
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
 * Gets array of specific pokemon types. Takes into account form and whether
 * is mega.
 */
function GetPokemonTypesFromId(pokemon_id, form, mega, mega_y) {

    let jb_pkm_obj = jb_pkm.find(entry =>
            entry.id == pokemon_id && entry.form == form);
    return (jb_pkm_obj) ? GetPokemonTypes(jb_pkm_obj, mega, mega_y) : [];
}

/**
 * Gets array of specific pokemon types.
 */
function GetPokemonTypes(jb_pkm_obj, mega, mega_y) {

    types = [];

    if (mega_y) {
        if (jb_pkm_obj.mega && jb_pkm_obj.mega[1])
            types = jb_pkm_obj.mega[1].types;
    } else if (mega) {
        if (jb_pkm_obj.mega && jb_pkm_obj.mega[0])
            types = jb_pkm_obj.mega[0].types;
    } else {
        types = jb_pkm_obj.types;
    }

    return types;
}

/**
 * Gets a pokemon container div element set up with a specified pokemon.
 */
function GetPokemonContainer(pokemon_id, is_selected, form = "Normal",
        mega = false, mega_y = false) {

    const pokemon_name = jb_names[pokemon_id].name;
    const clean_name = CleanPokeName(pokemon_name);
    const img_src_name = GetPokemonImgSrcName(pokemon_id, clean_name, form,
            mega, mega_y);
    let img_src = GIFS_URL + img_src_name + ".gif";
    const can_be_mega_y = pokemon_id == 6 || pokemon_id == 150; 
    const poke_obj = jb_pkm.find(e => e.id == pokemon_id && e.form == form);
    const can_be_shadow = poke_obj !== undefined && poke_obj.shadow && poke_obj.shadow_released;
    const primal = mega && (pokemon_id == 382 || pokemon_id == 383);
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
    const pokemon_name_p= $("<p class='pokemon-name pokefont unselectable'"
            + "onclick='LoadPokedexAndUpdateURL(" + pokemon_id + ", \""
            + form + "\", " + mega + ", " + mega_y + ")'>#" + pokemon_id
            + ((primal) ? (" Primal ") : ((mega) ? " Mega " : " "))
            + pokemon_name
            + ((mega && can_be_mega_y) ? ((mega_y) ? " Y " : " X ") : "")
            + "</p>");
    if (is_selected && poke_obj !== undefined && !mega && !mega_y) {
        const shadow_icon = $("<img src='imgs/flame.svg' class='shadow-icon filter-" + (can_be_shadow ? 'shadow' : 'noshadow') + "'></img>");
        shadow_icon.on('click', function(e) { 
            poke_obj.shadow = !can_be_shadow;
            poke_obj.shadow_released = !can_be_shadow;
        })
        pokemon_name_p.append(shadow_icon);
    }
    pokemon_container_div.append(pokemon_name_p);

    // pokemon types
    const types = GetPokemonTypesFromId(pokemon_id, form, mega, mega_y);
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

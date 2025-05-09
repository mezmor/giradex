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
    
    stats.atk = (stats.baseAttack + ivs.atk) * Math.fround(cpm);
    stats.def = (stats.baseDefense + ivs.def) * Math.fround(cpm);
    stats.hp = [,600,,3600,9000,15000,22500,20000][tier];

    return stats; // returns by copy to prevent reassignment of reference
}

/**
 * Gets the Pokemon GO CP, based on effective stats.
 */
function GetPokemonCP(stats) {
    let cp = Math.floor(stats.atk * Math.pow(stats.def, 0.5)
                * Math.pow(stats.hp, 0.5) / 10);
    if (cp < 10)
        cp = 10;

    return cp;
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

    // Add moves if in customizations
    if (Array.isArray(pkm_obj.fm_add)) {
        for (const f of pkm_obj.fm_add) 
            elite_fm.push(f);
    }
    if (Array.isArray(pkm_obj.cm_add)) {
        for (const c of pkm_obj.cm_add) 
            elite_cm.push(c);
    }
    
    // Remove moves if in customizations
    if (Array.isArray(pkm_obj.fm_rem)) {
        fm = fm.filter(f=>!pkm_obj.fm_rem.includes(f));
        elite_fm = elite_fm.filter(f=>!pkm_obj.fm_rem.includes(f));
    }
    if (Array.isArray(pkm_obj.cm_rem)) {
        cm = cm.filter(c=>!pkm_obj.cm_rem.includes(c));
        elite_cm = elite_cm.filter(c=>!pkm_obj.cm_rem.includes(c));
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
function GetUniqueIdentifier(pkm_obj, unique_shadow = true, unique_level = true) {
    return pkm_obj.id + 
        "-" + pkm_obj.form + 
        (unique_shadow ? "-" + pkm_obj.shadow : "") + 
        (unique_level ? 
            "-" + (pkm_obj.level !== undefined ? pkm_obj.level : settings_default_level[0]) : "");
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
            let can_be_shadow = poke_obj.shadow && poke_obj.shadow_released;
            poke_obj.shadow = !can_be_shadow;
            poke_obj.shadow_released = !can_be_shadow;
            shadow_icon.removeClass("filter-" + (can_be_shadow ? 'shadow' : 'noshadow'));
            shadow_icon.addClass("filter-" + (can_be_shadow ? 'noshadow' : 'shadow'));
            ClearTypeTiers();
            UpdatePokemonStatsAndURL();
            e.stopPropagation();
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



/**
 * Some utils functions for working with arrays of sets
 */
function GetUnique(arr) { 
	return Array.from((new Set(arr)).values()); 
}
function UnionAllSets(sets_arr) {
	return sets_arr.reduce((accumulator, this_set)=>accumulator.union(this_set), new Set());
}
function IntersectAllSets(sets_arr) {
	return sets_arr.reduce((accumulator, this_set)=>accumulator.intersection(this_set), sets_arr[0]);
}
function SetEquals(set1, set2) {
	return set1.size === set2.size && Array.from(set1).every(x => set2.has(x));
}
function MapByID(arr) { 
	return arr.reduce((acc, x) => {
        if (!acc.has(x.id)) acc.set(x.id, []);
        acc.get(x.id).push(x)
        return acc;
    }, new Map()); 
}

/**
 * Take a list of pokemon (e.g. from rankings) and translate it into a reasonable, 
 * semi-optimized search string
 */
function GetSearchString(pkm_arr, 
        check_movesets = false, check_elite_only = true) {
    let str = "";
    
    // Allow all applicable mons by id
    str = str + GetUnique(pkm_arr.map(e=>e.id)).join(",");

    // Shadow forms
    if (pkm_arr.some(e=>e.shadow)) {
        str = str + "&" + GetUnique(pkm_arr.filter(e=>!e.shadow).map(e=>e.id)).join(",") + ",shadow";
    }

    // Mega forms
    if (pkm_arr.some(e=>e.form=="Mega"||e.form=="MegaY")) {
        str = str + "&" + GetUnique(pkm_arr.filter(e=>e.form!="Mega"&&e.form!="MegaY").map(e=>e.id)).join(",") + ",mega1-";
    }

    // Pure forms
    if (pkm_arr.some(e=>!(e.shadow||e.form=="Mega"||e.form=="MegaY"))) {
        str = str + "&" + GetUnique(pkm_arr.filter(e=>e.form!="Mega"&&e.form!="MegaY"&!e.shadow).map(e=>e.id)).join(",") + ",shadow,mega1-";
    }

    // Alternate (non-Mega) forms
    const has_alt_forms = GetUnique(pkm_arr.filter(e=>GetPokemonForms(e.id).filter(e=>e!="Mega"&&e!="MegaY").length > 1).map(e=>e.id));
    for (let pkm_id of has_alt_forms) {
        const all_possible_forms = new Set(GetPokemonForms(pkm_id).filter(f=>f!="Mega"&&f!="MegaY"&&jb_pkm.find(p=>p.id==pkm_id&&p.form==f)));
        const filtered_in_forms = new Set(pkm_arr.filter(e=>e.id==pkm_id).map(e=>e.form).filter(e=>e!="Mega"&&e!="MegaY"));

        // Check if we need to try filtering down more specifically than by id
        if (filtered_in_forms.size < all_possible_forms.size) {
            // Only regional filtering is needed
            /* Remove regional-based filtering until Niantic fixes the broken keywords
                if (all_possible_forms.difference(new Set(["Normal","Hisuian","Galarian","Alola","Paldea"])).size == 0) {
                    str = str + "&!" + pkm_id + "," + Array.from(filtered_in_forms.keys()).map(e=>GetRegionalFormName(pkm_id, e)).join(",");
                }
            */ 

            // Instead of complicated set logic, just do Darmanitan manually
            // because it's the only real exception not already handled above by "unique" typing per form
            if (pkm_id == 555) {
                str = str + "&" + GetDarmanitanFilters(filtered_in_forms).map(filt=>'!555,'+filt).join("&");
                continue;
            }


            // Try type-based filtering
            const all_type_combos = Array.from(all_possible_forms.keys()).map(e=>new Set(jb_pkm.find(f=>f.id==pkm_id&&f.form==e).types));
            const filtered_in_type_combos = Array.from(filtered_in_forms.keys()).map(e=>new Set(jb_pkm.find(f=>f.id==pkm_id&&f.form==e).types));
            //const filtered_in_types = UnionAllSets(filtered_in_type_combos);

            const all_shared_types = IntersectAllSets(all_type_combos); // Types that are common to every form
            if (all_type_combos.every(tc=>SetEquals(all_shared_types, tc))) // If all forms have identical typing, we can't use this filtering
                continue;

            // Types unique to every form we want
            const filtered_in_unshared_types = filtered_in_type_combos.map(e=>e.difference(all_shared_types)); // Unshared types among desired forms
            if (filtered_in_unshared_types.every(e=>e.size >= 1 && all_type_combos.reduce((acc, tc)=>(acc + (tc.has([...e][0]) ? 1 : 0)), 0) == 1)) { // Every desired form has an unshared type that is unique to them
                str = str + "&!" + pkm_id;
                for (const tc of filtered_in_unshared_types) {
                    str = str + "," + [...tc][0];
                }
                continue;
            }

            /*
            // Types common to every form we want
            const shared_types_among_filtered_in = IntersectAllSets(filtered_in_type_combos);
            const shared_filtered_in_unshared_types = shared_types_among_filtered_in.difference(all_shared_types); // Ignore types that every possible form has anyway (because that doesn't filter anything)
            for (const t of shared_filtered_in_unshared_types) {
                str = str + "&!" + pkm_id + "," + t; // Either a different Pokemon, or you have the required type(s)
            }

            // Types common to every form we don't want
            const filtered_out_forms = all_possible_forms.difference(filtered_in_forms); // Forms that we don't want
            const filtered_out_type_combos = Array.from(filtered_out_forms.keys()).map(e=>new Set(jb_pkm.find(f=>f.id==pkm_id&&f.form==e).types));
            const filtered_out_type_combos_still_included = filtered_out_type_combos.filter(s=>s.isSupersetOf(shared_filtered_in_unshared_types)); // Types held by forms we want to filter out
            const filtered_out_types = UnionAllSets(filtered_out_type_combos_still_included).difference(filtered_in_types); // Types held by forms we want to filter out, and not by forms we want to keep in
            for (const t of filtered_out_types) {
                str = str + "&!" + pkm_id + ",!" + t;
            }
            */
        }
    }

    if (check_movesets) {
        const mons_by_id = MapByID(pkm_arr.filter(e=>e.fm_is_elite||e.cm_is_elite||!check_elite_only)); // Filtered-in form map
        
        for (const p of pkm_arr) {
            const all_ps = mons_by_id.get(p.id);
            if (!all_ps) continue;

            if (all_ps.length > 1) { // Multiple filtered it, allow all movesets
                const fms = GetUnique(all_ps.filter(e=>e.fm_is_elite||!check_elite_only).map(e=>e.fm));
                if (fms.length > 0)
                    str = str + "&!" + p.id;
                for (const fm of fms) {
                    str = str + ",@" + fm;
                }

                const cms = GetUnique(all_ps.filter(e=>e.cm_is_elite||!check_elite_only).map(e=>e.cm));
                if (cms.length > 0)
                    str = str + "&!" + p.id;
                for (const cm of cms) {
                    str = str + ",@" + (cm == "Psychic" ? "Psychi" : cm.replace(" Plus", ""));
                }

                all_ps.length = 0; // Prevent duplicating when we encounter the other forms
            }
            else if (all_ps.length == 1) { // Force exactly this moveset
                if (p.fm_is_elite||!check_elite_only)
                    str = str + "&!" + p.id + ",@" + p.fm;
                if (p.cm_is_elite||!check_elite_only)
                    str = str + "&!" + p.id + ",@" + p.cm.replace(" Plus", ""); 
            }
            // else length == 0, which means we've seen it before
        }
    }
    /*
    // Suboptimal movesets exist
    if ((GetUnique(pkm_arr.map(e=>GetUniqueIdentifier(e, true)))).length < pkm_arr.length) {
        for (let pkm of pkm_arr) {

        }
    }
    */
    /*
    for (let pkm_id of GetUnique(pkm_arr.map(e=>e.id))) {
        let all_pkm_matches = pkm_arr.filter(e=>pkm_id==e.id);
        str = str + "&!" + pkm_id + "," + GetUnique(all_pkm_matches.map(e=>"@"+e.fm)).join(",");
        str = str + "&!" + pkm_id + "," + GetUnique(all_pkm_matches.map(e=>"@"+e.cm)).join(",");
    }
    */
    return str;
}

/**
 * Take a search string and return all movesets and pokemon that match
 * Uses CNF like Pokemon Go search function
 * 
 * Supports {id}, @{move}, {type}, "shadow" keyword, ! negation
 * Treats any keyword beginning with "mega" as filtering to mega forms
 *     (in game this could be something like "mega1-" or "megaevolve" to find
 *     candidates that can become the desired mega form)
 */
function RunSearchString(str,
        check_movesets = true, check_elite_only = false) {
    let pkm_arr = [];
    
    // Build up all possible mons and movesets
    for (let pkm of jb_pkm) {
        if (check_movesets && !(pkm.fm && pkm.cm)) continue;

        const moves = GetPokemonMoves(pkm);
        let fms = [], cms = [];
        if (check_movesets) {
            fms = fms.concat(moves[2]); // elite_fm
            cms = cms.concat(moves[3]); // elite_cm

            if (!check_elite_only) {
                fms = fms.concat(moves[0]); // fm
                cms = cms.concat(moves[1]); // cm
            }
        }
        else {
            fms.push(null);
            cms.push(null);
        }

        for (let fm of fms) {
            for (let cm of cms) {
                pkm_arr.push({
                    id: pkm.id,
                    name: pkm.name,
                    form: pkm.form,
                    shadow: false,
                    fm: fm,
                    cm: cm,
                    types: pkm.types
                });

                // List Shadow as a separate mon
                if (pkm.shadow) {
                    pkm_arr.push({
                        id: pkm.id,
                        name: "Shadow " + pkm.name,
                        form: pkm.form,
                        shadow: true,
                        fm: fm,
                        cm: cm,
                        types: pkm.types
                    });
                }
            }
        }
    }

    return ApplySearchString(str, pkm_arr);
}

/**
 * Filters an input pkm_arr based on the provided search string
 */
function ApplySearchString(str, pkm_arr) {
    // Break into AND'd clauses and progressively filter down by each
    for (let clause of str.split(/[&|]/)) {
        pkm_arr = pkm_arr.filter(p => {
            let clause_val = false;

            // Break into OR'd tokens and return true as soon as we pass any of them
            for (let tok of clause.split(/[,;:]/)) {
                let invert = false;
                if (tok[0]=="!") {
                    invert = true; // negation, to be XOR'd with the token's filter criteria
                    tok = tok.slice(1);
                }

                if (tok=="shadow") // shadow
                    clause_val = clause_val || (p.shadow ^ invert);
                if (tok.slice(0,4)=="mega") // mega/primal
                    clause_val = clause_val || ((p.form=="Mega"||p.form=="MegaY") ^ invert);
                if (!isNaN(tok)) // id
                    clause_val = clause_val || ((p.id==tok) ^ invert);
                if (tok[0]=="@") { // has attack
                    let move_name = tok.slice(1);
                    clause_val = clause_val || ((p.fm==move_name||p.cm==move_name) ^ invert);
                }
                if (POKEMON_TYPES.has(tok)) { // type
                    clause_val = clause_val || (p.types.includes(tok) ^ invert);
                }

                if (clause_val) return clause_val;
            }

            return false;
        });
    }

    return pkm_arr;
}

/**
 * Compares an input list of Pokemon (as would be sent to GetSearchString)
 * against an output list of matched Pokemon (as would be returned from RunSearchString)
 * 
 * Validates whether this a perfect mapping. Returns any possible issues with the string.
 */
function ValidateSearchString(input_arr, output_arr, 
        check_movesets = true, check_elite_only = true) {
    const all_inputs_uniq = new Set(input_arr.map(e=>GetUniqueIdentifier(e, true, false)));
    const all_outputs_uniq = new Set(output_arr.map(e=>GetUniqueIdentifier(e, true, false)));

    return [
        all_inputs_uniq.difference(all_outputs_uniq), // not found
        all_outputs_uniq.difference(all_inputs_uniq) // too many
    ];

}

/**
 * Returns a hand-crafted search string to handle all possible combinations of filtering in
 * Darmanitan forms (due to their strange overlapping types) 
 */
function GetDarmanitanFilters(filtered_in_forms) {
    const form_bitstring = 
        (filtered_in_forms.has("Galarian_zen") ? 8 : 0) +       // X: Fire/Ice
        (filtered_in_forms.has("Zen") ? 4 : 0) +                // Z: Fire/Psychic
        (filtered_in_forms.has("Galarian_standard") ? 2 : 0) +  // G: Ice
        (filtered_in_forms.has("Standard") ? 1 : 0)             // S: Fire

    return [
        [],                         // 0: 
        ['!Ice','!Psychic'],        // 1: S
        ['!Fire'],                  // 2: G
        ['!Psychic','!Ice,!Fire'],  // 3: SG
        ['Psychic'],                // 4: Z
        ['!Ice'],                   // 5: ZS
        ['Psychic,!Fire'],          // 6: ZG
        ['!Ice,!Fire'],             // 7: ZSG (!X)
        ['Ice','Fire'],             // 8: X
        ['Fire','!Psychic'],        // 9: XS
        ['Ice'],                    // 10: XG
        ['!Psychic'],               // 11: XSG (!Z)
        ['Fire','Psychic,Ice'],     // 12: XZ
        ['Fire'],                   // 13: XZS (!G)
        ['Psychic,Ice'],            // 14: XZG (!S)
        ['555'],                    // 15: XZSG
    ][form_bitstring];
}
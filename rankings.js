/**
 * Bind event handlers for a rankings table
 */
function BindRankings() {
    // Moveset count
    $("#chk-suboptimal").change(function() {
        $("#chk-grouped").prop("disabled", !this.checked);
    })

    // Enemy type
    $("#chk-versus").change(function() {
        const urlParams = new URLSearchParams(window.location.search);
        
        if (this.checked && urlParams.has('t') 
            && urlParams.get('t') != 'Each' && urlParams.get('t') != 'Any') {
            urlParams.set('v', '');
        }
        else if (urlParams.has('v')) urlParams.delete('v');
        
        window.history.pushState({}, "", "?" + urlParams.toString().replace(/=(?=&|$)/gm, ''));
    });

    // Refresh list when any options change
    $("#strongest :checkbox").change(function() {
        //LoadStrongest();
        CheckURLAndAct();
    });
}


/**
 * Loads the list of the strongest pokemon of a specific type in pokemon go.
 * The type can be 'each', 'any' or an actual type.
 */
function LoadStrongest(type = "Any") {

    if (!finished_loading)
        return;

    // displays what should be displayed 
    if ($("#pokedex").css("display") != "none")
        $("#pokedex").css("display", "none");
    if ($("#pokedex-page").css("display") != "none")
        $("#pokedex-page").css("display", "none");
    if ($("#strongest").css("display") == "none")
        $("#strongest").css("display", "initial");
    if ($("#legend").css("display") == "none")
        $("#legend").css("display", "initial");

    // Only enable suboptimal filters if we're searching a specific type (not "Each")
    if (type == null)
        $("#chk-suboptimal, #chk-grouped").prop("disabled", true);
    else 
        $("#chk-suboptimal, #chk-mixed").prop("disabled", false);

    // sets links
    let strongest_link_any = $("#strongest-links > ul:first() > li:nth-child(1)");
    let strongest_link_each = $("#strongest-links > ul:first() > li:nth-child(2)");
    strongest_link_any.removeClass("strongest-link-selected");
    strongest_link_each.removeClass("strongest-link-selected");
    if (type == "Any")
        strongest_link_any.addClass("strongest-link-selected");
    else if (type == "Each")
        strongest_link_each.addClass("strongest-link-selected");
    let links_types = $("#strongest-links-types");
    links_types.empty();

    let ndx = 0;
    for (const t of POKEMON_TYPES) {
        links_types.append("<li><a class='type-text bg-" + t
                + ((t == type) ? " strongest-link-selected" : "")
                + "' onclick='LoadStrongestAndUpdateURL(\"" + t
                + "\")'>" + t + "</a></li>");
        if ((ndx+1) % 6 == 0) { //every 6th type
            links_types.append("<li class='line-break'><li>");
        }
        ndx++;
    }

    // Handle logic for "versus"
    const versus_chk = $("#strongest input[value='versus']:checkbox");
    if (type == "Any" || type == "Each") { // disabled if not a specific type
        versus_chk.prop("checked", false);
        versus_chk.prop("disabled", true);
    }
    else {
        versus_chk.prop("disabled", false);
    }

    // sets titles
    let title = "Strongest Pokémon of " + type + " type";
    document.title = title + " - DialgaDex"; // page title
    $("#strongest-type-title").text(type);

    // removes previous table rows
    $("#strongest-table tbody tr").remove();

    // gets checkboxes filters
    let search_params = {};
    search_params.unreleased =
        $("#strongest input[value='unreleased']:checkbox").is(":checked");
    search_params.mega =
        $("#strongest input[value='mega']:checkbox").is(":checked");
    search_params.shadow =
        $("#strongest input[value='shadow']:checkbox").is(":checked");
    search_params.legendary =
        $("#strongest input[value='legendary']:checkbox").is(":checked");
    search_params.elite =
        $("#strongest input[value='elite']:checkbox").is(":checked");
    search_params.suboptimal =
        $("#strongest input[value='suboptimal']:checkbox").is(":checked");
    search_params.mixed =
        $("#strongest input[value='mixed']:checkbox").is(":checked");
    search_params.versus = 
        versus_chk.is(":checked");
    search_params.type = type;

    if (type != "Each") {
        SetTableOfStrongestOfOneType(search_params);
    } else {
        SetTableOfStrongestOfEachType(search_params);
    }

    // Display relevant footnotes
    $("#footnote-elite").css('display', search_params.elite ? 'block' : 'none');
    $("#footnote-mixed-moveset").css('display', search_params.mixed ? 'block' : 'none');
    $("#footnote-versus").css('display', search_params.versus ? 'block' : 'none');
    $("#footnote-party-power").css('display', settings_party_size > 1 ? 'block' : 'none');
}


/**
 * Calls the 'LoadStrongest' function and updates the url accordingly.
 */
function LoadStrongestAndUpdateURL(type = "Any", versus = null) {

    if (!finished_loading)
        return false;

    LoadStrongest(type);

    let url = "?strongest&t=" + type;
    if (versus === null) {
        if ($("#chk-versus").prop("checked")) 
            url += '&v';
    }
    else
        $("#chk-versus").prop("checked", versus);

    window.history.pushState({}, "", url);
}


/**
 * Searches the strongest pokemon of each type and sets the strongest
 * pokemon table with the result.
 */
function SetTableOfStrongestOfEachType(search_params) {
    search_params.type = null; // Find strongest movesets regardless of type

    // map of strongest pokemon and moveset found so far for each type
    let str_pokemons = new Map();

    /**
     * Checks if the any of the strongest movesets of a specific pokemon
     * is stronger than any of the current strongest pokemon of each type.
     * If it is, updates the strongest pokemon map.
     */
    function CheckIfStronger(pkm_obj, shadow) {

        const types_movesets = GetPokemonStrongestMovesets(pkm_obj, shadow, 1, search_params);

        for (const type of POKEMON_TYPES) {

            // checks that pokemon has a moveset of this type
            if (!types_movesets.has(type))
                continue;

            const moveset = types_movesets.get(type)[0];
            let is_stronger = false;

            if (!str_pokemons.has(type)) { // if no strong pkm yet...

                if (moveset.rat > 0)
                    is_stronger = true;

            } else { // if some strong pkm already...

                // if finds something better than worst in array...
                if (moveset.rat > str_pokemons.get(type).rat)
                    is_stronger = true;
            }

            if (is_stronger) {

                // adds pokemon to array of strongest
                const str_pokemon = {
                    rat: moveset.rat, id: pkm_obj.id,
                    name: pkm_obj.name, form: pkm_obj.form,
                    shadow: shadow, class: pkm_obj.class,
                    fm: moveset.fm, fm_is_elite: moveset.fm_is_elite, fm_type: moveset.fm_type,
                    cm: moveset.cm, cm_is_elite: moveset.cm_is_elite, cm_type: moveset.cm_type
                };
                str_pokemons.set(type, str_pokemon);
            }
        }
    }

    // searches for pokemons...

    for (let id = 1; id <= jb_max_id; id++) {

        const forms = GetPokemonForms(id);
        const def_form = forms[0];

        let pkm_obj = jb_pkm.find(entry =>
                entry.id == id && entry.form == def_form);

        // checks whether pokemon should be skipped
        // (not released or legendary when not allowed)
        if (!pkm_obj || !search_params.unreleased && !pkm_obj.released
                || !search_params.legendary && pkm_obj.class) {
            continue;
        }

        // default form
        CheckIfStronger(pkm_obj, false);

        // shadow (except not released when it shouldn't)
        if (search_params.shadow && pkm_obj.shadow
                && !(!search_params.unreleased && !pkm_obj.shadow_released)) {
            CheckIfStronger(pkm_obj, true);
        }

        // other forms
        for (let form_i = 1; form_i < forms.length; form_i++) {

            pkm_obj = jb_pkm.find(entry =>
                    entry.id == id && entry.form == forms[form_i]);

            // checks whether pokemon should be skipped (form not released)
            if (!pkm_obj || (!search_params.unreleased && !pkm_obj.released)
                || (!search_params.mega && (pkm_obj.form == "Mega" || pkm_obj.form == "MegaY")))
                continue;

            CheckIfStronger(pkm_obj, false);
            // other forms and shadow (except not released when it shouldn't)
            if (search_params.shadow && pkm_obj.shadow
                    && !(!search_params.unreleased && !pkm_obj.shadow_released)) {
                CheckIfStronger(pkm_obj, true);
            }
        }
    }

    // converts map into array
    let str_pokemons_array = [];
    for (const type of POKEMON_TYPES) {
        if (str_pokemons.has(type))
            str_pokemons_array.push(str_pokemons.get(type));
    }

    // sets table from array
    SetStrongestTableFromArray(str_pokemons_array);
}

/**
 * Searches the strongest pokemon of a specific type and sets the strongest
 * pokemon table with the result.
 * 
 * The number of rows in the table is set to match the table with one
 * pokemon of each type, therefore, there are as many rows as pkm types.
 */
function SetTableOfStrongestOfOneType(search_params) {

    // over-create list, then filter down later
    const num_rows = 200; //settings_strongest_count;

    // array of strongest pokemon and moveset found so far
    let str_pokemons = [];

    /**
     * Checks if the strongest moveset of a specific pokemon and type is
     * stronger than any of the current strongest pokemons. If it is,
     * updates the strongest pokemons array.
     *
     * The array is sorted every time so that it is always the weakest
     * pokemon in it that gets replaced.
     */
    function CheckIfStronger(pkm_obj, shadow, level) {

        // Consider max 5 best movesets per pokemon
        let moveset_count = (search_params.suboptimal) ? 5 : 1; 
        const types_movesets = GetPokemonStrongestMovesets(pkm_obj, shadow,
            moveset_count, search_params, level);
        
        if (!types_movesets.has(search_params.type))
            return;
        const movesets = types_movesets.get(search_params.type);

        for (let moveset of movesets) {
            let is_strong_enough = false;

            if (str_pokemons.length < num_rows) { // if array isn't full...

                if (moveset.rat > 0)
                    is_strong_enough = true;

            } else { // if array isn't empty...

                // if finds something better than worst in array...
                if (moveset.rat > str_pokemons[0].rat)
                    is_strong_enough = true;

            }

            if (is_strong_enough) {

                // adds pokemon to array of strongest
                const str_pokemon = {
                    rat: moveset.rat, id: pkm_obj.id,
                    name: pkm_obj.name, form: pkm_obj.form,
                    shadow: shadow, class: pkm_obj.class,
                    fm: moveset.fm, fm_is_elite: moveset.fm_is_elite, fm_type: moveset.fm_type,
                    cm: moveset.cm, cm_is_elite: moveset.cm_is_elite, cm_type: moveset.cm_type,
                    level: level
                };

                if (str_pokemons.length < num_rows)
                    str_pokemons.push(str_pokemon);
                else
                    str_pokemons[0] = str_pokemon;


                // sorts array
                str_pokemons.sort(function compareFn(a , b) {
                    return ((a.rat > b.rat) || - (a.rat < b.rat));
                });
            }
        }
    }

    // searches for pokemons...
    for (lvl of settings_default_level) {
        for (let id = 1; id <= jb_max_id; id++) {

            const forms = GetPokemonForms(id);
            const def_form = forms[0];

            let pkm_obj = jb_pkm.find(entry =>
                    entry.id == id && entry.form == def_form);

            let search_level = lvl
            if (settings_xl_budget && pkm_obj !== undefined && !pkm_obj.class)
                search_level = 50;

            // checks whether pokemon should be skipped
            // (not released or legendary when not allowed)
            if (!pkm_obj || !search_params.unreleased && !pkm_obj.released
                    || !search_params.legendary && pkm_obj.class) {
                continue;
            }

            // default form
            CheckIfStronger(pkm_obj, false, search_level);

            // shadow (except not released when it shouldn't)
            if (search_params.shadow && pkm_obj.shadow
                    && !(!search_params.unreleased && !pkm_obj.shadow_released)) {
                CheckIfStronger(pkm_obj, true, search_level);
            }

            // other forms
            for (let form_i = 1; form_i < forms.length; form_i++) {

                pkm_obj = jb_pkm.find(entry =>
                        entry.id == id && entry.form == forms[form_i]);

                // checks whether pokemon should be skipped (form not released)
                if (!pkm_obj || (!search_params.unreleased && !pkm_obj.released)
                    || (!search_params.mega && (pkm_obj.form == "Mega" || pkm_obj.form == "MegaY")))
                    continue;

                CheckIfStronger(pkm_obj, false, search_level);
                // other forms and shadow (except not released when it shouldn't)
                if (search_params.shadow && pkm_obj.shadow
                        && !(!search_params.unreleased && !pkm_obj.shadow_released)) {
                    CheckIfStronger(pkm_obj, true, search_level);
                }
            }
        }
    }

    // reverses strongest pokemon array
    str_pokemons.reverse();

    const display_grouped =
        $("#strongest input[value='grouped']:checkbox").is(":checked") && search_params.suboptimal;
    
    let top_compare;
    const best_mon = str_pokemons[0].rat;
    
    switch (settings_compare) {
        case "top":
            top_compare = best_mon;
            break;
        case "budget":
            try {
                top_compare = str_pokemons.find(e => e.class == undefined && !e.shadow && !e.mega).rat;
            } catch (err) {
                top_compare = str_pokemons[str_pokemons.length-1].rat; // budget must be even lower
            }
            break;
        case "ESpace":
            try {
                top_compare = str_pokemons.find(e => !(e.class !== undefined && e.shadow) && 
                                                    !e.mega && !e.mega_y && 
                                                    !(e.name == 'Rayquaza' && e.cm == 'Dragon Ascent') &&
                                                    !(e.name == 'Necrozma' && e.form != 'Normal')
                                                ).rat;
            } catch (err) {
                top_compare = str_pokemons[str_pokemons.length-1].rat; // budget must be even lower
            }
            break;
    }

    // re-order array based on the optimal movesets of each pokemon
    if (display_grouped) {
        str_pokemons.length = Math.min(str_pokemons.length, settings_strongest_count); //truncate to top movesets early

        let str_pokemons_optimal = new Map(); // map of top movesets per mon
        let rat_order = 0;

        for (let str_pok of str_pokemons) {
            const pok_uniq_id = GetUniqueIdentifier(str_pok);
            if (!str_pokemons_optimal.has(pok_uniq_id)) {
                // array was already sorted, so first instance of mon is strongest
                str_pokemons_optimal.set(pok_uniq_id, [rat_order, str_pok.rat]);
                str_pok.grouped_rat = rat_order;
                str_pok.pct = 100 * str_pok.rat / top_compare;
                str_pok.pct_display = str_pok.pct;
                rat_order++;
            }
            // map all instances of this mon to the same "grouped" ranking
            const gp_compare = str_pokemons_optimal.get(pok_uniq_id);
            str_pok.grouped_rat = gp_compare[0];
            str_pok.pct = 100 * str_pok.rat / gp_compare[1];
            str_pok.pct_display = str_pok.pct;
        }

        // re-sort by grouped ranking, then individual moveset rank
        str_pokemons.sort((a,b) => a.grouped_rat - b.grouped_rat || b.rat - a.rat);
    }
    else { // determine tiers
        for (let str_pok of str_pokemons) {
            str_pok.pct = 100.0 * str_pok.rat / top_compare;
            str_pok.pct_display = str_pok.pct * (top_compare / best_mon);
        }
        BuildTiers(str_pokemons, top_compare);
    
        str_pokemons.length = Math.min(str_pokemons.length, settings_strongest_count); // truncate late so all movesets could be evaluated
    }

    // sets table from array
    SetStrongestTableFromArray(str_pokemons, str_pokemons.length, display_grouped, true, true, true, (best_mon / top_compare));
}

/**
 * Modifies str_pokemons to include a "tier" attribute
 * Can rely on each entry in str_pokemons having "rat" attribute (current metric rating)
 *    and "pct" attribute (rating vs comparison mon aka [this.rat/top_compare])
 * 
 * Tier-making methods can optionally use the top_compare parameter as a benchmark
 */
function BuildTiers(str_pokemons, top_compare) {
    const best_mon = str_pokemons[0].rat;

    // Compare to benchmark, building tiers based on ratio (str_pok.pct)
    if (settings_tiermethod == "broad" || settings_tiermethod == "ESpace") {
        let S_breakpoint = 100.0;
        let S_tier_size = 20.0;
        let letter_tier_size = 10.0;
        if (settings_tiermethod == "ESpace") { // slightly tweak tier sizes and breakpoints
            S_breakpoint = 105.0;
            S_tier_size = 10.0;
            letter_tier_size = 5.0;
        }

        for (let str_pok of str_pokemons) {
            if (str_pok.pct >= S_breakpoint + 0.00001) { //S+
                const num_S = Math.floor((str_pok.pct - S_breakpoint + 0.00001)/S_tier_size)+1;
                if (num_S > 3 && str_pok.name == "Rayquaza" && str_pok.mega) 
                    str_pok.tier = "MRay";
                else if (num_S >= 3)
                    str_pok.tier = "SSS";
                else 
                    str_pok.tier = "S".repeat(num_S);
            }
            else {
                let tier_cnt = Math.floor((S_breakpoint + 0.00001 - str_pok.pct)/letter_tier_size);
                if (settings_tiermethod == "ESpace" && tier_cnt >=1) // Shift to an "A" breakpoint of 95.0
                    tier_cnt--;
                if (tier_cnt >= 4) // Everything past D -> F
                    tier_cnt = 5;
                str_pok.tier = String.fromCharCode("A".charCodeAt(0) + tier_cnt);
            }
        }
    }
    // Compare to benchmark, generally trying to set the benchmark into "A" tier within reason
    // Using Jenks Natural Breaks to compute reasonable tier breaks
    // (Minimize internal tier variance, while maximizing variance between tiers)
    else if (settings_tiermethod == "jenks") {
        const n = Math.min(100, str_pokemons.length); // only consider top 100

        let tier_breaks = jenks_wrapper(str_pokemons.map(e => e.rat).slice(0, n), 5); // truncate to only those above breakpoint
        let compare_tier = tier_breaks.findIndex(e => e < top_compare);
        if (compare_tier == -1) compare_tier = 5; //not found
        if (compare_tier >= 2) { // need more tiers
            tier_breaks = jenks_wrapper(str_pokemons.map(e => e.rat).slice(0, n), 5 + compare_tier); // truncate to only those above breakpoint
            //compare_tier = tier_breaks.findIndex(e => e < top_compare);
        }

        let this_tier_idx = 0;
        let this_tier = (compare_tier >= 2 ? 1 - compare_tier : 0); // if necessary, shift tiers down to make "top_compare" mon A-tier
        for (let str_pok of str_pokemons) {
            if (str_pok.rat <= tier_breaks[this_tier_idx]) {
                this_tier_idx++;
                this_tier++;
            }
            
            if (this_tier <= 0) {
                if (str_pok.rat == best_mon && str_pok.name == "Rayquaza" && str_pok.mega)
                    str_pok.tier = "MRay";
                else
                    str_pok.tier = "S".repeat(1 - this_tier);
            }
            else {
                str_pok.tier = String.fromCharCode("A".charCodeAt(0) + this_tier + (this_tier == 5 ? 0 : -1));
            }
        }
    }
    // Hand-tuned tier listing based on overall, objective evaluation of the Pokemon
    // This is compared to the generalist "Any" ranking and tuned using the Jenks method
    // Helps reveal situations where a Pokemon, despite being good *within its limited type context*
    //   is actually suboptimal overall due to that type's inherent weakness
    //   (e.g. Poison/Bug/Fairy tend to have very weak options and are often poor counters)
    // Basic philosophy is that an "S" tier mon should actually be GOOD, not just better than
    //   its counterparts
    else if (settings_tiermethod == "absolute") {
        for (let str_pok of str_pokemons) {
            const rescale = $("#settings input[value='rescale']:checkbox").is(":checked");
            let check_rat = str_pok.rat;
            if ((!rescale || (settings_metric == 'DPS' || settings_metric == 'TDO')) 
                && (search_params.versus || (search_params.type != 'Any' && search_params.mixed))) {
                check_rat /= 1.6;
            }
            switch (settings_metric) {
                case 'DPS':
                    if (check_rat >= 20.0) str_pok.tier = 'SSS';
                    else if (check_rat >= 19.5) str_pok.tier = 'SS';
                    else if (check_rat >= 19.0) str_pok.tier = 'S';
                    else if (check_rat >= 18.5) str_pok.tier = 'A';
                    else if (check_rat >= 17.5) str_pok.tier = 'B';
                    else if (check_rat >= 17.0) str_pok.tier = 'C';
                    else if (check_rat >= 16.0) str_pok.tier = 'D';
                    else str_pok.tier = 'F';
                    break;
                case 'TDO':
                    if (check_rat >= 750) str_pok.tier = 'SSS';
                    else if (check_rat >= 700) str_pok.tier = 'SS';
                    else if (check_rat >= 650) str_pok.tier = 'S';
                    else if (check_rat >= 600) str_pok.tier = 'A';
                    else if (check_rat >= 550) str_pok.tier = 'B';
                    else if (check_rat >= 500) str_pok.tier = 'C';
                    else if (check_rat >= 450) str_pok.tier = 'D';
                    else str_pok.tier = 'F';
                    break;
                case 'ER':
                    if (check_rat >= 57.0) str_pok.tier = 'SSS';
                    else if (check_rat >= 53.5) str_pok.tier = 'SS';
                    else if (check_rat >= 49.0) str_pok.tier = 'S';
                    else if (check_rat >= 45.0) str_pok.tier = 'A';
                    else if (check_rat >= 42.5) str_pok.tier = 'B';
                    else if (check_rat >= 41.0) str_pok.tier = 'C';
                    else if (check_rat >= 39.0) str_pok.tier = 'D';
                    else str_pok.tier = 'F';
                    break;
                case 'EER':
                    if (check_rat >= 50.0) str_pok.tier = 'SSS';
                    else if (check_rat >= 47.0) str_pok.tier = 'SS';
                    else if (check_rat >= 43.0) str_pok.tier = 'S';
                    else if (check_rat >= 40.0) str_pok.tier = 'A';
                    else if (check_rat >= 37.5) str_pok.tier = 'B';
                    else if (check_rat >= 36.0) str_pok.tier = 'C';
                    else if (check_rat >= 34.5) str_pok.tier = 'D';
                    else str_pok.tier = 'F';
                    break;
                case 'TER':
                    if (check_rat >= 37.0) str_pok.tier = 'SSS';
                    else if (check_rat >= 35.0) str_pok.tier = 'SS';
                    else if (check_rat >= 34.0) str_pok.tier = 'S';
                    else if (check_rat >= 32.0) str_pok.tier = 'A';
                    else if (check_rat >= 31.0) str_pok.tier = 'B';
                    else if (check_rat >= 30.0) str_pok.tier = 'C';
                    else if (check_rat >= 29.0) str_pok.tier = 'D';
                    else str_pok.tier = 'F';
                    break;
            }

            if (str_pok.rat == best_mon && str_pok.name == "Rayquaza" && str_pok.mega)
                str_pok.tier = "MRay";
        }
    }
}

/**
 * Adds rows to the strongest pokemon table according to an array of
 * pokemon. The 'ranks' array fills the leftmost column of the table,
 * if nothing is sent, is filled with ordered numbers #1, #2, etc.
 *
 * If a number of rows is specified and there aren't enough pokemon, fills 
 * the remaining rows with "-". If the number of rows isn't specified,
 * there will be as many rows as pokemon in the array.
 */
function SetStrongestTableFromArray(str_pokemons, num_rows = null, 
    display_grouped = false, display_numbered = false, highlight_suboptimal = false, show_pct = false, best_pct = 1.0) {

    if (!num_rows)
        num_rows = str_pokemons.length;

    const encountered_mons = new Set();
    let cur_tier_td = null;
    let cur_tier_i = 0;

    for (let row_i = 0; row_i < num_rows; row_i++) {

        if (row_i < str_pokemons.length) {

            const p = str_pokemons[row_i];

            const name = p.name;
            const coords = GetPokemonIconCoords(p.id, p.form, p.mega, p.mega_y);
            const can_be_mega_y = p.id == 6 || p.id == 150; 
            const primal = p.mega && (p.id == 382 || p.id == 383);
            const form_text = GetFormText(p.id, p.form).replace(/\s+Forme?/,"");
            const legendary = p.class !== undefined;

            const tr = $("<tr></tr>");
            if (display_grouped) 
                tr.addClass("grouped");

            // re-style any rows for mons we've seen before 
            if (highlight_suboptimal) {
                const pok_uniq_id = GetUniqueIdentifier(p);
                if (encountered_mons.has(pok_uniq_id)) {
                    tr.addClass("suboptimal");
                }
                else {
                    encountered_mons.add(pok_uniq_id);
                }
            }

            const td_tier = $("<td></td>");
            if (!display_grouped && show_pct) {
                if (!cur_tier_td || p.tier != cur_tier_td.text()) {
                    td_tier.text(p.tier);
                    td_tier.addClass("tier-label");
                    td_tier.addClass("tier-" + p.tier);
                    if (cur_tier_td) cur_tier_td.prop("rowspan", row_i - cur_tier_i);
                    cur_tier_td = td_tier;
                    cur_tier_i = row_i;
                }
                else {
                    if (cur_tier_td && row_i == num_rows-1) cur_tier_td.prop("rowspan", row_i - cur_tier_i + 1);
                    td_tier.css("display", "none");
                }
            } 

            const td_rank = "<td>"
                + ((display_numbered) 
                    ? (((display_grouped) 
                        ? p.grouped_rat : row_i) + 1) : "")
                +"</td>";
            const td_name = "<td class='td-poke-name'>"
                + "<a class='a-poke-name' onclick='LoadPokedexAndUpdateURL(GetPokeDexMon(" + p.id
                    + ",\"" + p.form + "\"))'>"
                + "<span class=pokemon-icon style='background-image:url("
                + ICONS_URL + ");background-position:" + coords.x + "px "
                + coords.y + "px'></span>"
                + " <span class='strongest-name'>"
                + ((primal) ? ("Primal ") : ((p.mega) ? "Mega " : ""))
                + ((p.shadow)
                    ? "<span class=shadow-text>Shadow</span> " : "")
                + name
                + ((p.mega && can_be_mega_y)
                    ? ((p.mega_y) ? " Y" : " X") : "")
                + ((p.level == 50) ? "<sup class='xl'>XL</sup>" : "")
                +"</span>"
                + ((form_text.length > 0)
                    ? "<span class=poke-form-name> (" + form_text + ")</span>" 
                    : "")
                + "</a></td>";
            const td_fm =
                "<td><span class='type-text bg-"
                + ((p.fm == "Hidden Power") ? "any-type" : p.fm_type) + "'>"
                + p.fm + ((p.fm_is_elite) ? "*" : "") + "</span></td>";
            const td_cm =
                "<td><span class='type-text bg-" + p.cm_type + "'>"
                + p.cm.replaceAll(" Plus", "+") + ((p.cm_is_elite) ? "*" : "") + "</span></td>";
            const td_rat = "<td>" + settings_metric + " <b>"
                + p.rat.toFixed(2) + "</b></td>";
            const td_pct = ((show_pct) ? "<td>" 
                + "<div class='bar-bg' style='width: calc(" + (100 / best_pct) + "% - 10px);'>"
                + "<div class='bar-fg" + ((Math.abs(p.pct - 100) < 0.000001) ? " bar-compare" : "") + "' style='width: " + p.pct + "%;'>"
                + "<span class='bar-txt'>"
                + p.pct.toFixed(1) + "%</td>"
                + "</span></div></div>" : "");

            tr.append(td_tier);
            tr.append(td_rank);
            tr.append(td_name);
            tr.append(td_fm);
            tr.append(td_cm);
            tr.append(td_rat);
            tr.append(td_pct);

            $("#strongest-table tbody").append(tr);

        } else {

            const empty_row =
                "<tr><td>-</td><td>-</td><td>-</td><td>-</td></tr>"
            $("#strongest-table tbody").append(empty_row);
        }
    }
}
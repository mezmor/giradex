/**
 * Loads a pokemon page.
 */
function LoadPokedex(pokedex_mon) {

    if (!finished_loading || loading_pogo_moves || loading_counters)
        return;

    if (pokedex_mon.pokemon_id == 0)
        return;

    // sets the page title
    const pokemon_name = jb_names[pokedex_mon.pokemon_id].name;
    document.title = "#" + pokedex_mon.pokemon_id + " " + pokemon_name
            + " - DialgaDex";

    // sets level input value
    $("#input-lvl").val(pokedex_mon.level);

    // sets ivs inputs values
    $("#input-atk").val(pokedex_mon.ivs.atk);
    $("#input-def").val(pokedex_mon.ivs.def);
    $("#input-hp").val(pokedex_mon.ivs.hp);

    // empties the search box
    $("#poke-search-box").val("");

    // empties the pokemon containers
    $("#main-container").empty();
    $("#previous-containers").empty();
    $("#next-containers").empty();
    $("#additional-containers").empty();

    const forms = GetPokemonForms(pokedex_mon.pokemon_id);
    const def_form = forms[0];

    // sets main pokemon container
    $("#main-container").append(GetPokemonContainer(pokedex_mon.pokemon_id,
            (pokedex_mon.form == def_form), def_form));

    // sets previous and next pokemon containers
    for (i = 1; i <= 2; i++) {
        const prev_pokemon_id = parseInt(pokedex_mon.pokemon_id) - i;
        if (prev_pokemon_id > 0) {
            $("#previous-containers").prepend(
                GetPokemonContainer(prev_pokemon_id, false,
                    GetPokemonDefaultForm(prev_pokemon_id)));
        }
        const next_pokemon_id = parseInt(pokedex_mon.pokemon_id) + i;
        if (next_pokemon_id <= jb_max_id) {
            $("#next-containers").append(
                GetPokemonContainer(next_pokemon_id, false,
                    GetPokemonDefaultForm(next_pokemon_id)));
        }
    }

    // sets additional pokemon containers

    let additional_cs = $("#additional-containers");
    const additional_forms = forms.slice(1);

    for (f of additional_forms) {
        additional_cs.append(
            GetPokemonContainer(pokedex_mon.pokemon_id, pokedex_mon.form == f, f));
    }

    // Will Scroll
    if (additional_cs.get(0).scrollWidth > additional_cs.get(0).clientWidth) {
        additional_cs.prepend("<div class='scroll-portal scroll-portal-left'></div>");
        additional_cs.append("<div class='scroll-portal scroll-portal-right'></div>");

        $(".container-selected").get(0).scrollIntoView({block: "end", inline: "center"});
    }

    // displays what should be displayed
    if ($("#strongest").css("display") != "none")
        $("#strongest").css("display", "none");
    if ($("#pokedex").css("display") == "none")
        $("#pokedex").css("display", "block");
    if ($("#pokedex-page").css("display") == "none")
        $("#pokedex-page").css("display", "initial");
    if ($("#counters").css("display") != "none")
        $("#counters").css("display", "none");
    if ($("#counters-popup").css("display") != "none")
        $("#counters-popup").css("display", "none");

    LoadPokedexData(pokedex_mon);
}


/**
 * Calls the 'LoadPokemon' function and updates the url to match the
 * pokemon being loaded.
 */
function LoadPokedexAndUpdateURL(pokedex_mon) {

    if (!finished_loading || loading_pogo_moves || loading_counters)
        return false;

    LoadPokedex(pokedex_mon);

    let url = "?p=" + pokedex_mon.pokemon_id;

    if (pokedex_mon.form != "def")
        url += "&f=" + pokedex_mon.form;
    if (pokedex_mon.level)
        url += "&lvl=" + String(pokedex_mon.level);
    if (pokedex_mon.ivs) {
        url += "&ivs="
            + String(pokedex_mon.ivs.atk).padStart(2, "0")
            + String(pokedex_mon.ivs.def).padStart(2, "0")
            + String(pokedex_mon.ivs.hp).padStart(2, "0");
    }

    window.history.pushState({}, "", url);

    return false;
}

/**
 * Loads one pokemon data for the Pokemon GO section.
 */
function LoadPokedexData(pokedex_mon) {

    let pkm_obj = jb_pkm.find(entry =>
            entry.id == pokedex_mon.pokemon_id && entry.form == pokedex_mon.form);
    let released = true && pkm_obj;

    // if this pokemon is not released in pokemon go yet...
    if (!released) {
        $("#not-released").css("display", "initial");
        $("#released").css("display", "none");
        if ($("#legend").css("display") != "none")
            $("#legend").css("display", "none");
        return;
    }

    // if this pokemon is released in pokemon go...

    $("#not-released").css("display", "none");
    $("#released").css("display", "initial");
    if ($("#legend").css("display") == "none")
        $("#legend").css("display", "initial");

    const stats = GetPokemonStats(pkm_obj, pokedex_mon.level, pokedex_mon.ivs);
    let max_stats = null;
    if (pokedex_mon.ivs.atk != 15 || pokedex_mon.ivs.def != 15 || pokedex_mon.ivs.hp != 15)
        max_stats = GetPokemonStats(pkm_obj, pokedex_mon.level);

    // sets global variables
    current_pkm_obj = pkm_obj;
    counters_loaded = false;

    LoadPokedexBaseStats(stats);
    LoadPokedexCP(stats);
    UpdatePokedexCPText(pokedex_mon.level, pokedex_mon.ivs);
    LoadPokedexEffectiveness(pkm_obj);
    ResetPokedexCounters();
    LoadPokedexMoveTable(pkm_obj, stats, max_stats);
}

/**
 * Returns an object representing the Pokemon being requested via URL params
 */
function GetPokeDexMon(pokemon_id, form = "def", level = null, ivs = null) {
    
    if (pokemon_id == 0)
        return;
    
    // sets the default form
    if (form == "def")
        form = GetPokemonDefaultForm(pokemon_id);

    // sets the default level
    if (level == null) {
        level = settings_default_level[0];
        const poke_obj = jb_pkm.find(e=>e.id == pokemon_id);
        if (poke_obj !== undefined && poke_obj.class == undefined && settings_xl_budget)
            level = 50;
    }

    // sets the default ivs
    if (ivs == null)
        ivs = { atk: 15, def: 15, hp: 15 };

    return {
        pokemon_id: pokemon_id,
        form: form,
        level: level,
        ivs: ivs
    };
}

/**
 * Loads the section containing the base stats of the selected pokemon.
 * 
 * The bar indicator is based on the base stat number, with the ceiling being the
 * base stat value from the pokemon with the strongest value for that particular
 * base stat.
 */
function LoadPokedexBaseStats(stats) {

    const user_agent = window.navigator.userAgent;
    const is_apple = user_agent.includes("Macintosh")
        || user_agent.includes("iPhone") || user_agent.includes("iPad")
        || user_agent.includes("iPod");

    const atk_ceil = 345; // current top atk pkm: Deoxys - 345
    const def_ceil = 396; // current top def pkm: Shuckle - 396
    const hp_ceil = 496; // current top hp pkm: Blissey - 496

    const atk = stats.baseAttack;
    const def = stats.baseDefense;
    const hp = stats.baseStamina;

    let atk_html = "atk <abbr class=ascii-bar title=" + atk + ">";
    let def_html = "def <abbr class=ascii-bar title=" + def + ">";
    let hp_html = "hp <abbr class=ascii-bar title=" + hp + ">";

    const gray_ch = (is_apple) ? "▒" : "▓";

    for (let i = 1; i <= 5; i++) {
        atk_html += (i * atk_ceil / 6 < atk)
            ? "█"  : ((i * atk_ceil / 6 - atk_ceil / 12 < atk)
                ? gray_ch : "░");
        def_html += (i * def_ceil / 6 < def)
            ? "█"  : ((i * def_ceil / 6 - def_ceil / 12 < def)
                ? gray_ch : "░");
        hp_html += (i * hp_ceil / 6 < hp)
            ? "█"  : ((i * hp_ceil / 6 - hp_ceil / 12 < hp)
                ? gray_ch : "░");
    }

    atk_html += "</abbr>";
    def_html += "</abbr>";
    hp_html += "</abbr>";

    $("#base-stat-atk").html(atk_html);
    $("#base-stat-def").html(def_html);
    $("#base-stat-hp").html(hp_html);

    if (is_apple) {
        $(".ascii-bar").addClass("monospace");
        $(".ascii-bar").css("font-size", "15px");
    }
}


/**
 * Loads the progress bar CP of the selected pokemon with its specific stats.
 */
function LoadPokedexCP(stats) {

    let cp = Math.floor(stats.atk * Math.pow(stats.def, 0.5)
                * Math.pow(stats.hp, 0.5) / 10);
    if (cp < 10)
        cp = 10;

    let prgr_pct = cp * 100 / 5000;
    if (prgr_pct > 100)
        prgr_pct = 100;

    const width = 100 - prgr_pct;
    $(".prgr-val").css("width", width + "%");
    $("#max-cp").text("CP ");
    const bold_num = $("<b>" + cp + "</b>");
    $("#max-cp").append(bold_num);
}

/**
 * Updates the text for pokemon max cp to match the level and IVs being used to
 * calculate it.
 */
function UpdatePokedexCPText(level, ivs) {

    const pct = Math.round(100 * (ivs.atk + ivs.def + ivs.hp) / 45);
    $("#cp-text").html("with IVs " + ivs.atk + "/" + ivs.def + "/" + ivs.hp
            + " (" + pct + "%) at level " + level
            + "<span id=rat-pct-vs-max></span>"
            + "<span id=sh-rat-pct-vs-max></span>");
}

/**
 * Loads table in the Pokemon GO section sorting the pokemon types according to
 * their effectiveness against the selected pokemon. Note that types that are
 * neutral towards the selected pokemon aren't displayed.
 */
function LoadPokedexEffectiveness(pkm_obj) {
    let types = pkm_obj.types;

    let effectiveness_0244 = [];
    let effectiveness_0391 = [];
    let effectiveness_0625 = [];
    let effectiveness_160 = [];
    let effectiveness_256 = [];

    for (let attacker_type of POKEMON_TYPES) {
        const type_effect = POKEMON_TYPES_EFFECT.get(attacker_type);
        let mult = 1;
        for (let type of types) {
            if (type_effect[0].includes(type))
                mult *= 0.391;
            else if (type_effect[1].includes(type))
                mult *= 0.625;
            else if (type_effect[2].includes(type))
                mult *= 1.60;
        }
        if (Math.abs(mult - 0.244) < 0.001)
            effectiveness_0244.push(attacker_type);
        else if (Math.abs(mult - 0.391) < 0.001)
            effectiveness_0391.push(attacker_type);
        else if (Math.abs(mult - 0.625) < 0.001)
            effectiveness_0625.push(attacker_type);
        else if (Math.abs(mult - 1.60) < 0.001)
            effectiveness_160.push(attacker_type);
        else if (Math.abs(mult - 2.56) < 0.001)
            effectiveness_256.push(attacker_type);
    }

    $("#effectiveness-title").html("Type effectiveness against <b>" + pkm_obj.name + "</b>");

    let effectiveness_0244_html = "";
    for (let type of effectiveness_0244) {
        effectiveness_0244_html += "<a class='type-text bg-" + type
                + "' onclick='LoadStrongestAndUpdateURL(\"" + type
                + "\", false)'>" + type + "</a> ";
    }
    $("#effectiveness-0244").html(effectiveness_0244_html);
        

    let effectiveness_0391_html = "";
    for (let type of effectiveness_0391) {
        effectiveness_0391_html += "<a class='type-text bg-" + type
                + "' onclick='LoadStrongestAndUpdateURL(\"" + type
                + "\", false)'>" + type + "</a> ";
    }
    $("#effectiveness-0391").html(effectiveness_0391_html);

    let effectiveness_0625_html = "";
    for (let type of effectiveness_0625) {
        effectiveness_0625_html += "<a class='type-text bg-" + type
                + "' onclick='LoadStrongestAndUpdateURL(\"" + type
                + "\", false)'>" + type + "</a> ";
    }
    $("#effectiveness-0625").html(effectiveness_0625_html);

    let effectiveness_160_html = "";
    for (let type of effectiveness_160) {
        effectiveness_160_html += "<a class='type-text bg-" + type
                + "' onclick='LoadStrongestAndUpdateURL(\"" + type
                + "\", false)'>" + type + "</a> ";
    }
    $("#effectiveness-160").html(effectiveness_160_html);

    let effectiveness_256_html = "";
    for (let type of effectiveness_256) {
        effectiveness_256_html += "<a class='type-text bg-" + type
                + "' onclick='LoadStrongestAndUpdateURL(\"" + type
                + "\", false)'>" + type + "</a> ";
    }
    $("#effectiveness-256").html(effectiveness_256_html);
}


/**
 * Resets the pokemon go counters section for the current selected pokemon.
 */
function ResetPokedexCounters() {

    // sets proper counters title and disclaimer
    const verb = ($("#counters").css("display") == "none") ? "show" : "hide";
    $("#counters-button").html(verb + " <b>" + current_pkm_obj.name + "</b>'s counters")
    $("#counters-disclaimer").html(
        "calculations take into account the counters effectiveness against "
        + current_pkm_obj.name
        + "<br>and the counters resistance to the average of "
        + current_pkm_obj.name + "'s movesets");
    
    // shows cell with loading image in the counters table
    $("#counters-tr").empty();
    let td = $("<td></td>");
    let img = $("<img class=loading src=imgs/loading.gif></img>");
    td.append(img);
    td.css("height", "125px");
    $("#counters-tr").append(td);
}


/**
 * Loads best counters of selected pokemon.
 * Searches asynchronously through all the pokemon in the game and calculates
 * the best counters taking into account their effectiveness against the selected
 * mon and their resistance to the average of the selected mon's movesets.
 */
function LoadPokedexCounters() {
    let search_params = {}

    // gets checkboxes filters
    search_params.unreleased =
        $("#counters input[value='unreleased']:checkbox").is(":checked");
    search_params.mega =
        $("#counters input[value='mega']:checkbox").is(":checked");
    search_params.shadow =
        $("#counters input[value='shadow']:checkbox").is(":checked");
    search_params.legendary =
        $("#counters input[value='legendary']:checkbox").is(":checked");
    search_params.elite =
        $("#counters input[value='elite']:checkbox").is(":checked");

    search_params.type = "Any";
    search_params.mixed = true;
    search_params.suboptimal = true;

    // array of counters pokemon and movesets found so far
    let counters = GetStrongestVersus(GetEnemyParams(current_pkm_obj), search_params);
    ProcessAndSetCountersFromArray(counters);
}


/**
 * Processes the counters in the 'counters' array and sets them in the page.
 * Maximum 'max_counters' unique pokemon are displayed.
 * Maximum 'max_per_counter' movesets are displayed for each pokemon, but
 * movesets past the 'extra_moveset_cutoff' (ratio to top counter) are hidden.
 * 
 * The array contains the counters sorted in ascending order.
 */
function ProcessAndSetCountersFromArray(counters, 
    max_counters = 10, max_per_counter = 3, extra_moveset_cutoff = 0.7) {

    // reverses counters arrays to be in descending order
    counters.reverse();

    // simplifies counters arrays into maps where each pokemon species is a key
    let counters_s = new Map();
    for (let counter of counters) {
        const pok_uniq_id = GetUniqueIdentifier(counter, false, false);

        if (!counters_s.has(pok_uniq_id))
            counters_s.set(pok_uniq_id, [])
        counters_s.get(pok_uniq_id).push(counter);
    }

    // converts simplified maps into one array containing arrays of counters
    // for each pokemon species
    const all_counters = Array.from(counters_s.values()).slice(0, max_counters);

    // gets strongest rat
    const top_rat = counters[0].rat;

    // sets counters in the page

    $("#counters-tr").empty();

    for (let i = 0; i < all_counters.length; i++) { // for each counter...

        let counter_0 = all_counters[i][0];

        // sets counter's rating percentage span
        const table_ratings = $("<table></table>");
        for (let j = 0; j < all_counters[i].length && j < max_per_counter; j++) {
            let counter = all_counters[i][j];

            let rat_pct = 100 * counter.rat / top_rat;

            if (j > 0 && rat_pct < extra_moveset_cutoff * 100)
                continue;

            const rat_pct_td = $("<td></td>");
            rat_pct_td.append("<b>" + rat_pct.toFixed(0) + "</b><span style='font-size: 0.9em'>%</span>");

            const rat_info_td = $("<td class=counters-rat-info></td>");
            rat_info_td.html(((counter.mega)?"&nbsp;(M)":"")
                + ((counter.shadow)?"&nbsp;(Sh)":""));
            if (rat_info_td.html() == "") rat_info_td.css("width", "25%");
            
            const rat_tr = $("<tr class=counters-rat-row></tr>");
            rat_tr.append(rat_pct_td);
            rat_tr.append(rat_info_td);

            if (has_touch_screen) {
                rat_tr.click(function() {
                    ShowCountersPopup(this, true, counter);
                });
            } else {
                rat_tr.mouseenter(function() {
                    ShowCountersPopup(this, true, counter);
                });
                rat_tr.mouseleave(function() {
                    ShowCountersPopup(this, false);
                });
                rat_tr.click(function() {
                    LoadPokedexAndUpdateURL(GetPokeDexMon(counter.id, counter.form));
                    window.scrollTo(0, 0);
                });
            }
            table_ratings.append(rat_tr);
        }

        // sets counter's image
        let img = $("<img onload='HideLoading(this)' onerror='TryNextSrc(this)'></img>");
        let img_src_name = GetPokemonImgSrcName(counter_0.id, counter_0.form);
        let img_src = GIFS_URL + img_src_name + ".gif";
        img.attr("src", img_src);
        const td = $("<td></td>");

        const div_align_baseline = $("<div class='align-base'></div>");
        div_align_baseline.append("<div class='fill-space'></div>");
        const div_img_wrapper = $("<div></div");
        div_img_wrapper.append($("<img class=loading src=imgs/loading.gif></img>"));
        div_img_wrapper.append(img);
        div_align_baseline.append(div_img_wrapper);

        const div_align_ratings = $("<div class='counter-ratings'></div>");
        div_align_ratings.append(table_ratings);

        // sets table cell and appends it to the row
        td.append(div_align_ratings);
        td.append(div_align_baseline);
        $("#counters-tr").append(td);
    }
}

/**
 * Shows or hides the popup of the counter whose rating percentage label is
 * currently being hovered.
 * 
 * Receives the object of the element being hovered, whether it should show or
 * hide the popup, and the counter object.
 */
function ShowCountersPopup(hover_element, show, counter = null) {

    if (show && counter) {

        // sets hover element's border for touch screens
        if (has_touch_screen) {
            $(".counters-rat-row").removeClass("rat-selected");
            $(hover_element).addClass("rat-selected");
        }

        // sets the popup's position

        let pos = $(hover_element).offset();
        let w = $(hover_element).width();
        let h = $(hover_element).height();
        let x = pos.left + 0.5 * w - 100;
        let y = pos.top + 1.5 * h;

        $("#counters-popup").css("left", x);
        $("#counters-popup").css("top", y);

        // sets the popup's content

        const form_text = GetFormText(counter.id, counter.form);

        const name = "<p class='counter-name'>"
            + ((counter.shadow) ? "<span class=shadow-text>Shadow</span> " : "")
            + counter.name
            + ((form_text.length > 0)
                ? " <span class=small-text>(" + form_text + ")</span>" : "")
            + "</p>"

        $("#counters-popup").html(name
            + "<p class='counter-metric'>" + settings_metric + " " + counter.rat.toFixed(2) + "</p>"
            + "<p class='counter-types'><span class='type-text bg-"
                + ((counter.fm == "Hidden Power") ? "any-type" : counter.fm_type) + "'>"
                + counter.fm + ((counter.fm_is_elite) ? "*" : "")
            + "</span> "
            + "<span class='type-text bg-" + counter.cm_type + "'>"
                + counter.cm + ((counter.cm_is_elite) ? "*" : "") 
            + "</span></p>");

        // sets popup's click callback for touch devices
        if (has_touch_screen) {
            $("#counters-popup").unbind("click");
            $("#counters-popup").click( function() {
                LoadPokedexAndUpdateURL(GetPokeDexMon(counter.id, counter.form));
                window.scrollTo(0, 0);
            });
        }

        // shows the popup
        $("#counters-popup").css("display", "inline");

    } else {
        $(".counters-rat-row").removeClass("rat-selected");
        // hides the popup
        $("#counters-popup").css("display", "none");
    }
}

/**
 * Loads the table in the Pokemon Go section including information about
 * the possible move combinations and their ratings.
 * 
 * If the argument 'max_stats' is received, also calculates the average rating
 * percentage of the specific stats against the max stats (15/15/15 ivs)
 * of all movesets. This percentage is then displayed on the CP section.
 */
function LoadPokedexMoveTable(pkm_obj, stats, max_stats = null) {

    // sets movesets title
    $("#movesets-title").html("<b>" + pkm_obj.name + "'s movesets</b>");

    // whether can be shadow
    const can_be_shadow = pkm_obj.shadow;

    // types
    const types = pkm_obj.types;

    const atk = stats.atk;
    const def = stats.def;
    const hp = stats.hp;

    // cache attack tiers
    const attackTiers = {};

    // shadow stats
    const atk_sh = atk * 6 / 5;
    const def_sh = def * 5 / 6;

    // removes previous table rows
    $("#pokedex-move-table tbody tr").remove();

    const moves = GetPokemonMoves(pkm_obj);
    if (moves.length != 6)
        return;

    const fms = moves[0];
    const cms = moves[1];
    const elite_fms = moves[2];
    const elite_cms = moves[3];
    const pure_only_cms = moves[4];
    const shadow_only_cms = moves[5];

    const all_fms = fms.concat(elite_fms);
    let all_cms = cms.concat(elite_cms).concat(pure_only_cms)
    if (can_be_shadow) all_cms = all_cms.concat(shadow_only_cms);

    // variables used to calculate average rating percentages against max stats
    let rat_pcts_vs_max = 0;
    let rat_sh_pcts_vs_max = 0;
    let num_movesets = 0;

    /**
     * Lookup the tier ranking for this mon for the given type (only once each)
     */
    function GetPokemonTypeTier(type) {
        if (!!attackTiers[type]) {
            return;
        }
        
        attackTiers[type] = GetTypeTier(type, pkm_obj);
    }

    // appends new table rows asynchronously (so that Mew loads fast)
    // each chunk of moves combinations with a specific fast move
    // is appended in a different frame

    /**
     * Appends all the rows containing a specific fast move.
     * Receives the index of the fast move and the callback function
     * for when all chunks have been appended as arguments.
     */
    function AppendFMChunk(fm_i, callback) {

        const fm = all_fms[fm_i];
        const fm_is_elite = elite_fms.includes(fm);

        // gets the fast move object
        const fm_obj = jb_fm.find(entry => entry.name == fm);
        if (!fm_obj) {
            fm_i++;
            if (fm_i < all_fms.length)
                setTimeout(function() {AppendFMChunk(fm_i, callback);}, 0);
            else
                callback();
            return;
        }

        const fm_type = fm_obj.type;
        GetPokemonTypeTier(fm_type);

        for (let cm of all_cms) {

            const cm_is_elite = elite_cms.includes(cm);

            // gets the charged move object
            const cm_obj = jb_cm.find(entry => entry.name == cm);
            if (!cm_obj)
                continue;

            const cm_type = cm_obj.type;
            GetPokemonTypeTier(cm_type);

            // calculates the data

            const dps = GetDPS(types, atk, def, hp, fm_obj, cm_obj);
            const dps_sh = GetDPS(types, atk_sh, def_sh, hp, fm_obj, cm_obj);
            const tdo = GetTDO(dps, hp, def);
            const tdo_sh = GetTDO(dps_sh, hp, def_sh);
            const rat = GetMetric(dps, tdo, pkm_obj);
            const rat_sh = GetMetric(dps_sh, tdo_sh, pkm_obj);

            // calculates average rating percentages against max stats
            if (max_stats) {
                const max_dps = GetDPS(types, max_stats.atk, max_stats.def,
                    max_stats.hp, fm_obj, cm_obj);
                const max_tdo = GetTDO(max_dps, max_stats.hp, max_stats.def);
                const max_rat = GetMetric(max_dps, max_tdo, pkm_obj);

                rat_pcts_vs_max += rat / max_rat;
                rat_sh_pcts_vs_max += rat_sh / max_rat;
            } else {
                rat_sh_pcts_vs_max += rat_sh / rat;
            }
            num_movesets++;

            // creates one row

            const tr = $("<tr></tr>");
            const td_fm = $("<td><span class='type-text bg-"
                + ((fm == "Hidden Power") ? "any-type" : fm_type)
                + "'>" + fm + ((fm_is_elite) ? "*" : "")
                + "</span></td>");
            let td_cm = $("<td><span class='type-text bg-" + cm_type
                + "'>" + cm.replaceAll(" Plus", "+") + ((cm_is_elite) ? "*" : "")
                + "</span></td>");
            let td_dps = $("<td>" + dps.toFixed(3) + "</td>");
            let td_dps_sh = $("<td>"
                + ((can_be_shadow) ? dps_sh.toFixed(3) : "-")
                + "</td>");
            let td_tdo = $("<td>" + tdo.toFixed(1) + "</td>");
            let td_tdo_sh = $("<td>"
                + ((can_be_shadow) ? tdo_sh.toFixed(1) : "-")
                + "</td>");
            let td_rat = $("<td>" + rat.toFixed(2) + "</td>");
            let td_rat_sh = $("<td>"
                + ((can_be_shadow) ? rat_sh.toFixed(2) : "-")
                + "</td>");

            if (shadow_only_cms.includes(cm)) {
                td_dps.text("-");
                td_tdo.text("-");
                td_rat.text("-");
            }
            else if (pure_only_cms.includes(cm)) {
                td_dps_sh.text("-");
                td_tdo_sh.text("-");
                td_rat_sh.text("-");
            }

            tr.append(td_fm);
            tr.append(td_cm);
            tr.append(td_dps);
            tr.append(td_dps_sh);
            tr.append(td_tdo);
            tr.append(td_tdo_sh);
            tr.append(td_rat);
            tr.append(td_rat_sh);

            $("#pokedex-move-table tbody").append(tr);
        }
        // if necessary, calculates average rating percentage of specific stats
        // against max stats of all movesets and displays it on the CP section
        if (max_stats) {
            let avg_rat_pct_vs_max = 100 * rat_pcts_vs_max / num_movesets;
            let pct_str = avg_rat_pct_vs_max.toFixed(2) + "%";
            if (isNaN(avg_rat_pct_vs_max))
                pct_str = "??";
            $("#rat-pct-vs-max").html(" → " + settings_metric + " " + pct_str);
        }

        // if can be shadow, calculates average rating percentage of shadow stats
        // against max stats of all movesets and displays it on the CP section
        if (can_be_shadow) {
            let avg_rat_sh_pct_vs_max = 100 * rat_sh_pcts_vs_max / num_movesets;
            let pct_str = avg_rat_sh_pct_vs_max.toFixed(2) + "%";
            if (isNaN(avg_rat_sh_pct_vs_max))
                pct_str = "??";
            $("#sh-rat-pct-vs-max").html("<br> → Shadow " + settings_metric
                    + " " + pct_str);
        }

        // appends the next fast move chunk, if there is more
        fm_i++;
        if (fm_i < all_fms.length)
            setTimeout(function() {AppendFMChunk(fm_i, callback);}, 0);
        else
            callback();
    }

    loading_pogo_moves = true;
    // appends the first fast move chunk
    AppendFMChunk(0, function() {
        SortPokedexTable(6, 7);
        BuildTypeTiers(pkm_obj.name, attackTiers);
        loading_pogo_moves = false;
    });
}

/**
 * Builds the tier ranking elements based on the lookups
 */
function BuildTypeTiers(name, attackTiers) {
    const types = Object.entries(attackTiers)
        .filter(e=>e[1].pure!="F"||(e[1].shadow&&e[1].shadow!="F"))
        .map(e=>e[0])
        .sort((a, b) => 
            TierToInt(attackTiers[b].pure)-TierToInt(attackTiers[a].pure) ||
            TierToInt(attackTiers[b].shadow)-TierToInt(attackTiers[a].shadow)
        )

    const tier_container = $("#attack-tier-results");
    tier_container.empty();

    if (types.length > 0) {
        $("#attack-tiers-title").html(`<b>${name}'s</b> tier ranking by attack type`);
    }

    for (let type of types) {
        const attackTier = attackTiers[type];

        const tier_cell = $("<div class='dex-layout-tablecell'></div>");
        tier_cell.append(`<div class='dex-layout-header'><a class='type-text bg-${type}' onClick='LoadStrongestAndUpdateURL("${type}", false)'>${type}</a></div>`);

        const tier_results = $("<div class='dex-layout-content'></div>");
        if (attackTier.pure != "F")
            tier_results.append(BuildTypeTierLabel(attackTier.pure));
        if (attackTier.shadow && attackTier.shadow != "F") 
            tier_results.prepend(BuildTypeTierLabel(attackTier.shadow, true));
        tier_cell.append(tier_results);
        tier_container.append(tier_cell);
    }
}

/**
 * Builds the tier icon (with shadow designation) for a type-tier
 */
function BuildTypeTierLabel(tier, shadow = false) {
    const shadowIcon = shadow ? '<span class="img-outline shadow-icon"><img src="imgs/flame.svg" class="filter-shadow"></span>' : '';
    return $(`<span style="position: relative;" class='tier-label tier-${tier}'><span class='tier-text'>${tier}</span>${shadowIcon}</span>`);
}

/**
 * Sorts the pokemon go moves combinations table rows according to the
 * values from a specific column.
 */
function SortPokedexTable(column_i, sec_column_j) {

    let table = $("#pokedex-move-table")[0];

    // updates downside triangles
    let triangles = $(".th-triangle");
    for (triangle of triangles)
        triangle.remove();

    cells = table.tHead.rows[0].cells;
    for (let cell_i = 0; cell_i < cells.length; cell_i++) {
        let cell = $(cells[cell_i]);
        if (cell_i == column_i) {
            let triangle = $("<span class=th-triangle> ▾</span>");
            cell.append(triangle);
        } else if (cell.hasClass("sortable")) {
            let triangle = $("<span class=th-triangle> ▿</span>");
            cell.append(triangle);
        }
    }

    // sorts rows
    let rows_array = Array.from(table.tBodies[0].rows);
    rows_array = MergeSortPokedexTable(rows_array, column_i, sec_column_j);
    for (let i = 0; i < rows_array.length; i++)
        table.tBodies[0].append(rows_array[i]);
}

/**
 * Applies the merge sort algorithm to the pokemon go table rows.
 * Sorts according to the values from a specific column.
 */
function MergeSortPokedexTable(rows, column_i, sec_column_j) {

    if (rows.length <= 1)
        return rows;

    const n = (rows.length / 2);
    let a = MergeSortPokedexTable(rows.slice(0, n), column_i, sec_column_j);
    let b = MergeSortPokedexTable(rows.slice(n), column_i, sec_column_j);

    return MergeRows(a, b, column_i, sec_column_j);
}

/**
 * Part of the merge sort algorithm for the pokemon go table rows.
 * Sorts and merges two arrays of rows according to the values
 * from a specific column. Returns the single resulting array.
 */
function MergeRows(a, b, column_i, sec_column_j) {

    function GetRowValue(row) {
        const col_i_val = parseFloat(
                row.getElementsByTagName("TD")[column_i]
                .innerHTML.toLowerCase());
        if (!isNaN(col_i_val)) return col_i_val;
        
        return parseFloat(
            row.getElementsByTagName("TD")[sec_column_j]
            .innerHTML.toLowerCase());
    }

    let c = [];

    while (a.length > 0 && b.length > 0) {
        if (GetRowValue(a[0]) >= GetRowValue(b[0])) {
            c.push(a[0]);
            a.shift();
        } else {
            c.push(b[0]);
            b.shift();
        }
    }

    while (a.length > 0) {
        c.push(a[0]);
        a.shift();
    }

    while (b.length > 0) {
        c.push(b[0]);
        b.shift();
    }

    return c;
}


/**
 * Parse all parts of the URL related to a Pokedex page entry
 * Returns object representing the pokemon to be loaded
 */
function ParsePokedexURL(params) {
    const pkm = params.get("p");

    let form = "def";
    if (params.has("f"))
        form = params.get("f");
    if (params.has("m"))
        form = "Mega";
    if (params.has("y"))
        form = "MegaY";

    let level = null;
    if (params.has("lvl"))
        level = Number(params.get("lvl"));

    let ivs = null;
    if (params.has("ivs")) {
        let ivs_str = params.get("ivs");
        ivs = {
            atk: parseInt(ivs_str.slice(0, 2)),
            def: parseInt(ivs_str.slice(2, 4)),
            hp: parseInt(ivs_str.slice(4, 6))
        };
        function IsValidIV(val) {
            return (Number.isInteger(val) && val >= 0 && val <= 15);
        }
        if (!IsValidIV(ivs.atk) || !IsValidIV(ivs.def)
                || !IsValidIV(ivs.hp)) {
            ivs = null;
        }
    }
    return GetPokeDexMon(GetPokemonId(pkm), form, level, ivs);
}


/**
 * Callback function for when pokemon stats are updated (level or/and IVs).
 * Reloads the pokemon page and the url with the new specified stats.
 */
function UpdatePokemonStatsAndURL() {
    const params = new URLSearchParams(location.search);

    // if url has pokemon params...
    if (params.has("p")) {

        const pkm = params.get("p");

        let form = "def";
        if (params.has("f"))
            form = params.get("f");
        if (params.has("m"))
            form = "Mega";
        if (params.has("y"))
            form = "MegaY";

        let level = Number($("#input-lvl").val());

        let ivs = {};
        ivs.atk = parseInt($("#input-atk").val());
        ivs.def = parseInt($("#input-def").val());
        ivs.hp = parseInt($("#input-hp").val());

        LoadPokedexAndUpdateURL(GetPokeDexMon(GetPokemonId(pkm), form, level, ivs));
    }
}

/**
 * Callback function for when the 'show counters' or 'hide counters' button is
 * clicked.
 * It either shows or hides the counters, depending on whether they are visible.
 * 
 * It also loads the counters if they haven't been loaded for the current
 * selected pokemon yet.
 */
function ShowCounters() {

    $("#counters-popup").css("display", "none");

    const html = $("#counters-button").html();

    if ($("#counters").css("display") == "none") {
        $("#counters").css("display", "initial");
        $("#counters-button").html(html.replace("show ", "hide "));
    } else {
        $("#counters").css("display", "none");
        $("#counters-button").html(html.replace("hide ", "show "));
    }

    // if counters haven't been loaded for the current pokemon, loads them
    if (!counters_loaded) {
        counters_loaded = true;
        LoadPokedexCounters();
    }
}

/**
 * Bind event handlers for a Pokedex page
 */
function BindPokeDex() {
    // Custom IVs
    $("#stats-form").submit(function(e) {
        UpdatePokemonStatsAndURL();
        return false;
    });

    // Options for Counters
    $("#counters :checkbox").change(function() {
        if (current_pkm_obj) {
            ResetPokedexCounters();
            LoadPokedexCounters();
        }
    });
}


/**
 * Creates and displays an input field to easily enter a new move for addition
 * to the currently displayed Pokemon's moveset.
 */
function ShowMoveInput(caller, moveType) {
    let input_popup = $("<input id='move-search' autocomplete=off></input>");
    $(caller).parent().append(input_popup);

    let moveList = [];
    if (moveType == "fast" || moveType == "any")
        jb_fm.forEach(e => moveList.push(e.name));
    if (moveType == "charged" || moveType == "any")
        jb_cm.forEach(e => moveList.push(e.name));
    moveList = moveList.sort();

    const moveSearch = new autoComplete({
        selector: "#move-search",
        data: {
            src: moveList
        },
        resultsList: {
            id: "suggestions",
            maxResults: 5
        },
        resultItem: {
            highlight: true,
            element: (item, data) => {
                let moveType = 'any-type';
                let move = jb_fm.find(e => e.name == data.value);
                if (!move) move = jb_cm.find(e => e.name == data.value);
                if (move) moveType = move.type;

                const moveTag = $('<span></span>');
                moveTag.html($(item).html().replaceAll(" Plus", "+"));
                $(item).html('');
                moveTag.addClass('type-text');
                moveTag.addClass('bg-' + moveType);
                $(item).append(moveTag);
                $(item).addClass('move-search-result');
            }
        }
    })
    $(moveSearch.wrapper).addClass("move-input-popup");
    moveSearch.input.addEventListener("render", function(e) {
        if (moveSearch.cursor == -1) { moveSearch.goTo(0); }
    });
    moveSearch.input.addEventListener("selection", function(e) {
        const newMove = e.detail.selection.value;

        if (moveType == "fast" || (moveType == "any" && jb_fm.map(e => e.name).includes(newMove))) {
            if (!current_pkm_obj.elite_fm) 
                current_pkm_obj.elite_fm = [];
            current_pkm_obj.elite_fm.push(newMove);
            ClearTypeTiers();
        }
        else if (moveType == "charged" || (moveType == "any" && jb_cm.map(e => e.name).includes(newMove))) {
            if (!current_pkm_obj.elite_cm) 
                current_pkm_obj.elite_cm = [];
            current_pkm_obj.elite_cm.push(newMove);
            ClearTypeTiers();
        }

        $(moveSearch.wrapper).remove();
        moveSearch.wrapper = undefined;
        moveSearch.unInit();
        input_popup.remove();
        UpdatePokemonStatsAndURL();
    });
    
    input_popup.focus();
    $(input_popup).on('focusout', function() {
        $(moveSearch.wrapper).remove();
        moveSearch.wrapper = undefined;
        moveSearch.unInit();
        input_popup.remove();
    });
}


/**
 * Author: Mikegrann
 * Based on the work of Javi Bonafonte
 */

$(document).ready(Main);

// global constants and variables

// whether user has touch screen
let has_touch_screen = false;
if ("maxTouchPoints" in navigator) {
    has_touch_screen = navigator.maxTouchPoints > 0;
} else if ("msMaxTouchPoints" in navigator) {
    has_touch_screen = navigator.msMaxTouchPoints > 0;
} else {
    let mq = window.matchMedia && matchMedia("(pointer:coarse)");
    if (mq && mq.media === "(pointer:coarse)") {
        has_touch_screen = !!mq.matches;
    } else if ('orientation' in window) {
        has_touch_screen = true; // deprecated, but good fallback
    } else {
        // Only as a last resort, fall back to user agent sniffing
        let UA = navigator.userAgent;
        has_touch_screen = (
            /\b(BlackBerry|webOS|iPhone|IEMobile)\b/i.test(UA) ||
            /\b(Android|Windows Phone|iPad|iPod)\b/i.test(UA)
        );
    }
}

// FIXME these are not ideal, would be better that, if a new pokemon is loaded,
//        whatever asynchronous operations were being done on the previous mon
//        should be cancelled

// whether pokemon go table moves are currently being loaded asynchronously
let loading_pogo_moves = false;
// whether pokemon go counters are currently being loaded asynchronously
let loading_counters = false;

let current_pkm_obj = null; // current pokedex pokemon's pkm_obj

// whether counters of current pokemon have been loaded yet
let counters_loaded = false;

/**
 * Main function.
 */
function Main() {
    // when going back or forward in the browser history
    window.onpopstate = function() { CheckURLAndAct(); }

    // Bind Event Handlers
    BindAll();

    // Load Pokemon Data
    LoadJSONData();
}

/**
 * Bind various event listeners
 */
function BindAll() {
    BindSettings();
    BindPokeDex();
    BindRankings();
    BindMoveData();

    // Link to Rankings Lists
    $("#rankings-link").click(function() {
        LoadStrongestAndUpdateURL("Any", false);
        return false;
    });
    // Link to Move Data Lists
    $("#moves-link").click(function() {
        LoadMovesAndUpdateURL("Any");
        return false;
    });
    
    // Passthrough clicks for touchscreens
    $(document).click(function(event) { OnDocumentClick(event); });
}

/**
 * Document's general click callback.
 */
function OnDocumentClick(event)  {

    // function only used on touch screen devices
    if (!has_touch_screen)
        return;

    let target = $(event.target);

    // if not clicking the counters rating pct or the counters popup...
    if (!$(target).closest("#counters-popup").length
            && !$(target).closest(".counters-rat-row").length) {
        // hides the counters popup if visible
        if ($("#counter-popup").css("display") != "none")
            ShowCountersPopup(this, false);
        // removes rat pcts borders
        let rat_pcts = $(".counter-rat-pct > a");
        for (rat_pct of rat_pcts)
            $(rat_pct).css("border", "none");
    }
}

/**
 * Checks whether the current url contains search parameters that dictate
 * what to do. If it finds something, it does it.
 */
function CheckURLAndAct() {

    const params = new URLSearchParams(location.search);

    // if url has pokemon params...
    if (params.has("p")) {
        // loads pokemon
        LoadPokedex(ParsePokedexURL(params));

        return;
    }

    // if url has 'strongest' param...
    if (params.has("strongest")) {

        // preserve versus param
        $("#chk-versus").prop("checked", params.has("v") == true);

        // if url has 't' param...
        if (params.has("t")) {

            // sets type to 't' value with first char as upper and rest as lower
            let type = params.get("t");
            type = type.charAt(0).toUpperCase()
                + type.slice(1).toLowerCase();
            
            if (type == 'Each')
                LoadStrongest("Each");
            else if (type == "Any")
                LoadStrongest("Any");
            else if (POKEMON_TYPES.has(type))
                LoadStrongest(type);

            return;
        }

        // loads strongest (default)
        LoadStrongest();

        return;
    }

    // if url has 'moves' param...
    if (params.has("moves")) {

        // preserve move-kind param
        $("#chk-move-kind").prop("checked", params.get("moves").toLowerCase() == "charged");

        // if url has 't' param...
        if (params.has("t")) {

            // sets type to 't' value with first char as upper and rest as lower
            let type = params.get("t");
            type = type.charAt(0).toUpperCase()
                + type.slice(1).toLowerCase();
            
            if (type == "Any")
                LoadMoves("Any");
            else if (POKEMON_TYPES.has(type))
                LoadMoves(type);

            return;
        }

        // loads strongest (default)
        LoadMoves();

        return;
    }
}

/**
 * Sets up autocomplete for the Pokemon Search Box
 */
function InitializePokemonSearch() {
    let search_values = jb_pkm.slice();

    // Add entries for mons completely missing from game data
    const all_names = search_values.map(e => e.name);
    Object.values(jb_names).filter(e => !all_names.includes(e.name) && e.id <= jb_max_id).forEach(e => {
        search_values.push({id: e.id, name: e.name, form: 'Normal', types: []});
    });

    const pokemonSearch = new autoComplete({
        selector: "#poke-search-box",
        data: {
            src: search_values,
            filter: (list) => {
                const inputValue = pokemonSearch.input.value.toLowerCase();
                return list.sort((a, b) => {
                    if (a.value.name.toLowerCase().startsWith(inputValue)) 
                        return b.value.name.toLowerCase().startsWith(inputValue) ? a.value.id - b.value.id : -1;
                    else if (b.value.name.toLowerCase().startsWith(inputValue))
                        return 1;

                    return a.value.id - b.value.id;
                });
            }
        },
        searchEngine: (query, record) => {
            const sanitize = (str) => String(str).toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[\u2018-\u2019]/g, "'").normalize("NFC");

            const sanQuery = sanitize(query);
            const pokeName = record.name + ((record.form !== "Normal") ? " (" + GetFormText(record.id, record.form).replace(/\s+Forme?/,"") + ")" : "");

            const idSearch = sanQuery.match(/#?(\d+).*/);
            if (idSearch && idSearch.length >= 2) {
                const pokemon_id = record.id;
                if (pokemon_id.toString().startsWith(idSearch[1]) && pokemon_id) {
                    return {match_type: 'id', match_value: pokemon_id.toString().replace(idSearch[1], "<mark>" + idSearch[1] + "</mark>")};
                }
            }
            else { // string search
                const sanPokeName = sanitize(record.name);
                let match = sanPokeName.indexOf(sanQuery);
                if (~match) {
                    const matchPart = record.name.substring(match, match + query.length);
                    return {match_type: 'name', match_value: record.name.replace(matchPart, "<mark>" + matchPart + "</mark>")};
                }

                if (record.form !== "Normal") {
                    const formName = GetFormText(record.id, record.form).replace(/\s+Forme?/,"");
                    const sanPokeForm = sanitize(formName);
                    match = sanPokeForm.indexOf(sanQuery);
                    if (~match) {
                        const matchPart = formName.substring(match, match + query.length);
                        return {match_type: 'form', match_value: formName.replace(matchPart, "<mark>" + matchPart + "</mark>")};
                    }
                }
            }
        },
        resultsList: {
            id: "suggestions",
            tag: "table",
            maxResults: 10
        },
        resultItem: {
            highlight: true,
            tag: "tr",
            element: (item, data) => {
                // Clear existing text
                $(item).html('');

                // Add Number
                const idTD = $("<td class='poke-number'></td>");
                idTD.html("#" + ((data.match.match_type == "id") ? data.match.match_value : data.value.id));
                $(item).append(idTD);
                
                // Add Icon
                const coords = GetPokemonIconCoords(data.value.id, data.value.form);
                $(item).append("<td class=pokemon-icon style='background-image:url("
                    + ICONS_URL + ");background-position:" + coords.x + "px "
                    + coords.y + "px'></td>");

                // Add Name
                const nameTD = $("<td class='poke-search-name'></td>");
                nameTD.html((data.match.match_type == "name") ? data.match.match_value : data.value.name);
                $(item).append(nameTD);

                // Add Form
                if (data.value.form !== "Normal"
                    && data.value.form !== "Mega" && data.value.form !== "MegaY") {
                    const formSpan = $("<span class='poke-form-name'></span>");
                    formSpan.html(" (" + ((data.match.match_type == "form") ? data.match.match_value : GetFormText(data.value.id, data.value.form).replace(/\s+Forme?/,"")) + ")");
                    nameTD.append(formSpan);
                }
                
                // Add types
                for (type of data.value.types) {
                    $(item).append($("<td><img src='imgs/types/"
                        + type.toLowerCase() 
                        + ".gif'></img></td>"));
                }
                if (data.value.types.length == 1) $(item).append("<td></td>");
            }
        },
        events: {
            input: {
                focus() {
                    const inputValue = pokemonSearch.input.value;

                    if (inputValue.length) pokemonSearch.start();
                },
            },
        },
    });

    pokemonSearch.input.addEventListener("render", function(e) {
        if (pokemonSearch.cursor == -1) { pokemonSearch.goTo(0); }
    });
    pokemonSearch.input.addEventListener("selection", function(e) {
        LoadPokedexAndUpdateURL(GetPokeDexMon(e.detail.selection.value.id, e.detail.selection.value.form));
    });
}

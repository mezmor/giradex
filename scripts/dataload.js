const JB_URL = "https://raw.githubusercontent.com/mgrann03/pokemon-resources/main/";
const GIFS_URL = JB_URL + "graphics/ani/";
const SHINY_GIFS_URL = JB_URL + "graphics/ani-shiny/";
const POGO_PNGS_URL = JB_URL + "graphics/pogo-256/"
const SHINY_POGO_PNGS_URL = JB_URL + "graphics/pogo-shiny-256/"
const ICONS_URL = JB_URL + "graphics/pokemonicons-sheet.png";

const LOADING_MAX_VAL = 5; // max number of files that need to be loaded
let loading_val = 0; // number of files loaded so far
let finished_loading = false; // whether page finished loading all files

// jb json objects
let jb_names, jb_mega, jb_pkm, jb_max_id, jb_fm, jb_cm;

/**
 * Load JSONs from resource repo
 */
function LoadJSONData() {
    // jb
    HttpGetAsync(JB_URL + "pokemon_names.json",
        function(response) { 
            jb_names = JSON.parse(response); 
        });
    HttpGetAsync(JB_URL + "mega_pokemon.json",
        function(response) { jb_mega = JSON.parse(response); });
    HttpGetAsync(JB_URL + "pogo_pkm.json",
        function(response) {
            jb_pkm = JSON.parse(response);
            jb_max_id = jb_pkm.at(-1).id;

            // Only use active forms
            jb_pkm = jb_pkm.filter((item) => {
                return GetPokemonForms(item.id).includes(item.form);
            });
        });
    HttpGetAsync(JB_URL + "pogo_fm.json",
        function(response) { 
            jb_fm = JSON.parse(response); 
            jb_fm.find(e => e.name=="Hidden Power").type = "None"; // Make non-specific Hidden Power typeless
        });
    HttpGetAsync(JB_URL + "pogo_cm.json",
        function(response) { jb_cm = JSON.parse(response); });
}

/**
 * Local asynchronous GET request.
 */
function LocalGetAsync(url, callback) {

    $.ajax({
        type: "GET",
        url: url,
        dataType: "text",
        success: callback
    });
}

/**
 * Asynchronous HTTP GET request to a specific url and with a specific
 * callback function.
 */
function HttpGetAsync(url, callback) {

    let xml_http = new XMLHttpRequest();
    xml_http.onreadystatechange = function() { 
        if (xml_http.readyState == 4 && xml_http.status == 200) {
            callback(xml_http.response);
            IncreaseLoadingVal();
        }
    }
    xml_http.open("GET", url, true); // true for asynchronous 
    xml_http.send(null);
}

/**
 * Increases value that represents number of files loaded so far
 * and updates its html loading bar on the page.
 */
function IncreaseLoadingVal() {

    loading_val++;
    let pct = 100 * loading_val / LOADING_MAX_VAL;
    $("#loading-bar").css("width", pct + "%");

    // if finished loading...
    if (pct >= 100) {
        finished_loading = true;
        setTimeout(function() {
            $("#loading-bar").css("display", "none");
        }, 100);
        CheckURLAndAct();

        InitializePokemonSearch();
    }
}

/**
 * Removes duplicate objects (matching JSON strings)
 */
function DeDuplicate(arr, keyGen = JSON.stringify) {
    let seen = new Set();
    
    return arr.filter((item) => {
        let k = keyGen(item);
        return seen.has(k) ? false : seen.add(k);
    });
}


/**
 * Receives the pokemon image that just loaded as an argument.
 * Hides the placeholder loading image and shows the loaded pokemon image.
 */
function HideLoading(element) {

    const loading = $(element).parent().children(".loading");
    loading.css("display", "none");
    $(element).css("display", "inherit");
}

/**
 * When a pokemon image source couldn't be loaded, this function tries the 
 * next option.
 * Eventually it will just load the 'notfound' image and stop trying.
 */
function TryNextSrc(element) {

    const src = $(element).attr("src");

    if (src.includes(GIFS_URL)) {
        // loads pogo-256 image
        let next_src = src.replace(GIFS_URL, POGO_PNGS_URL);
        next_src = next_src.replace(".gif", ".png");
        $(element).attr("src", next_src);
        $(element).css("width", "140px");
        $(element).css("height", "140px");

    } else {
        // loads notfound image and stops trying (disables error callback)
        const next_src = "imgs/notfound.png";
        $(element).attr("src", next_src);
        $(element).css("width", "96px");
        $(element).css("height", "96px");
        $(element).css("cursor", "default");
        $(element).off("onerror");
    }
}

/**
 * Swaps the pokemon image for its shiny form.
 */
function SwapShiny(element) {

    const pokemon_container = $(element).parent().parent();
    const shiny_img =
        pokemon_container.children(".shiny-img-div").children("img");

    let src = $(element).attr("src");

    if (src.includes(GIFS_URL)) {
        src = src.replace(GIFS_URL, SHINY_GIFS_URL);
        shiny_img.css("display", "revert");

    } else if (src.includes(SHINY_GIFS_URL)) {
        src = src.replace(SHINY_GIFS_URL, GIFS_URL);
        shiny_img.css("display", "none");

    } else if (src.includes(POGO_PNGS_URL)) {
        src = src.replace(POGO_PNGS_URL, SHINY_POGO_PNGS_URL);
        shiny_img.css("display", "revert");

    } else if (src.includes(SHINY_POGO_PNGS_URL)) {
        src = src.replace(SHINY_POGO_PNGS_URL, POGO_PNGS_URL);
        shiny_img.css("display", "none");
    }

    $(element).attr("src", src);
}
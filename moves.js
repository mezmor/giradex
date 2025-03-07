let top_move_users;

/**
 * Bind event handlers for a move data table
 */
function BindMoveData() {
    // Enemy type
    $("#chk-move-kind").change(function() {
        const urlParams = new URLSearchParams(window.location.search);
        
        urlParams.set('moves', this.checked ? "charged" : "fast");
        
        window.history.pushState({}, "", "?" + urlParams.toString().replace(/=(?=&|$)/gm, ''));
        
        CheckURLAndAct();
    });
}

/**
 * Loads the list of the moves of a specific type in pokemon go.
 * The type can be 'any' or an actual type.
 */
function LoadMoves(type = "Any") {

    if (!finished_loading)
        return;

    // displays what should be displayed 
    if ($("#pokedex").css("display") != "none")
        $("#pokedex").css("display", "none");
    if ($("#pokedex-page").css("display") != "none")
        $("#pokedex-page").css("display", "none");
    if ($("#strongest").css("display") != "none")
        $("#strongest").css("display", "none");
    if ($("#legend").css("display") == "none")
        $("#legend").css("display", "initial");
    if ($("#move-data").css("display") == "none")
        $("#move-data").css("display", "initial");

    // sets links
    let type_link_any = $("#move-type-links > ul:first() > li:nth-child(1)");
    type_link_any.removeClass("selected");
    if (type == "Any")
        type_link_any.addClass("selected");
    let links_types = $("#move-type-links-bytype");
    links_types.empty();

    let ndx = 0;
    for (const t of POKEMON_TYPES) {
        links_types.append("<li><a class='type-text bg-" + t
                + ((t == type) ? " selected" : "")
                + "' onclick='LoadMovesAndUpdateURL(\"" + t
                + "\")'>" + t + "</a></li>");
        if ((ndx+1) % 6 == 0) { //every 6th type
            links_types.append("<li class='line-break'><li>");
        }
        ndx++;
    }

    // Handle logic for "versus"
    const move_kind_chk = $("#chk-move-kind");
    const move_kind = move_kind_chk.prop("checked") ? "Charged" : "Fast";

    // sets titles
    let title = move_kind + " Moves of " + type + " type";
    document.title = title + " - DialgaDex"; // page title
    $("#move-type-title").text(type);

    // removes previous table rows
    $("#move-data-table tbody tr").remove();

    BuildMoveUserMap();
    SetMoveTable(GetMoveData(type, move_kind), move_kind);
}


/**
 * Calls the 'LoadMoves' function and updates the url accordingly.
 */
function LoadMovesAndUpdateURL(type = "Any", move_kind) {

    if (!finished_loading)
        return false;

    LoadMoves(type);

    if (!move_kind) {
        move_kind = $("#chk-move-kind").prop("checked") ? "charged" : "fast";
    }
    let url = "?moves=" + move_kind + "&t=" + type;

    window.history.pushState({}, "", url);
}

/**
 * Adds rows to the move data table according to an input array.
 * Also sets the appropriate headers depending on what kind of move is displayed.
 */
function GetMoveData(type = "Any", move_kind = "Fast") {
    let move_data = (move_kind == "Charged") ? 
        jb_cm.filter(e=>(e.type==type||type=="Any")
            &&e.power < 1000
            &&!e.name.includes("Blastoise")
            &&!['Leech Life', 'Crush Claw', 'Wrap Pink', 'Wrap Green'].includes(e.name)) : 
        jb_fm.filter(e=>(e.type==type||type=="Any")
            &&e.name!="Hidden Power");
        
    move_data.sort((a,b)=>(a.name.localeCompare(b.name)));
    //move_data.sort((a,b)=>(a.type.localeCompare(b.type)));
        
    move_data = move_data.map(e=>({
        name: e.name,
        type: e.type,
        power: e.power,
        energy: Math.abs(e.energy_delta),
        duration: e.duration / 1000,
        pps: e.power / e.duration * 1000,
        eps: Math.abs(e.energy_delta) / e.duration * 1000,
        ppe: (e.energy_delta != 0) ? 
            e.power / Math.abs(e.energy_delta) : 
            0,
        p2pes: (e.energy_delta != 0) ? 
            e.power * e.power / (Math.abs(e.energy_delta) * e.duration / 1000) :
            0,
        epps2: Math.abs(e.energy_delta) * e.power / e.duration * 1000 / e.duration * 1000,
    }));

    if (move_kind == "Charged") {
        move_data.sort((a,b)=>(b.p2pes-a.p2pes));
    }
    else { // "Fast"
        move_data.sort((a,b)=>(b.epps2-a.epps2));
    }

    return move_data;
}

const MAX_USERS = 3;
/**
 * Creates a lookup map for later use, containing the Top [MAX_USERS] pokemon
 * who learn each move (sorted by attack stat)
 */
function BuildMoveUserMap(force_reload = false) {
    if (top_move_users && !force_reload) return; // Build only once
    top_move_users = new Map();

    for (const pkm of jb_pkm) {
        if (!pkm.released) continue;

        let moves = GetPokemonMoves(pkm);
        moves = moves.reduce((agg,e)=>agg.concat(e),[]);

        for (const m of moves) {
            if (top_move_users.has(m)) {
                let cur_top = top_move_users.get(m);
                
                if (cur_top.length < MAX_USERS ||
                        GetAdjustedAttStat(pkm, m) > GetAdjustedAttStat(cur_top[0], m)) {
                    cur_top.push(pkm);
                    cur_top.sort((a,b)=>GetAdjustedAttStat(a,m)-GetAdjustedAttStat(b,m));
                    if (cur_top.length > MAX_USERS) {
                        cur_top.shift();
                    }
                }
            }
            else {
                top_move_users.set(m, [pkm]);
            }
        }
    }
}

function GetAdjustedAttStat(pkm_obj, move_name) {
    let move_obj = jb_fm.find(e=>e.name==move_name);
    if (!move_obj) move_obj = jb_cm.find(e=>e.name==move_name);

    return pkm_obj.stats.baseAttack * 
        (pkm_obj.shadow && pkm_obj.shadow_released ? 1.2 : 1) *
        (pkm_obj.types.includes(move_obj.type) ? 2 : 1); // STAB is 1.2, but really incentivize it here
}

/**
 * Adds rows to the move data table according to an input array.
 * Also sets the appropriate headers depending on what kind of move is displayed.
 */
function SetMoveTable(move_data, move_kind) {
    for (const md of move_data) {
        const tr = $("<tr></tr>");
        
        const td_move_name =
            "<td><span class='type-text bg-"
            + ((md.name == "Hidden Power") ? "any-type" : md.type) + "'>"
            + md.name.replaceAll(" Plus", "+") + "</span></td>";

        const td_power = "<td>" + md.power + "</td>";
        const td_energy = "<td>" + md.energy + "</td>";
        const td_duration = "<td>" + md.duration.toFixed(1) + "<span class='small-text off'>s<span></td>";
        const td_pps = "<td>" + md.pps.toLocaleString("en", { maximumFractionDigits: 2 }) + "</td>";
        const td_eps = "<td>" + md.eps.toLocaleString("en", { maximumFractionDigits: 2 }) + "</td>";
        const td_ppe = "<td>" + md.ppe.toLocaleString("en", { maximumFractionDigits: 2 }) + "</td>";
        const td_epps2 = "<td>" + md.epps2.toLocaleString("en", { maximumFractionDigits: 2 }) + "</td>";
        const td_p2pes = "<td>" + md.p2pes.toLocaleString("en", { maximumFractionDigits: 2 }) + "</td>";
        
        tr.append(td_move_name);
        tr.append(td_power);
        tr.append(td_energy);
        tr.append(td_duration);
        tr.append(td_pps);
        tr.append(td_eps);

        if (move_kind == "Charged") {
            $("#ppe").css("display", "");
            tr.append(td_ppe);
            $("#move-metric").html("P<sup class='small-text'>2</sup>/ES");
            tr.append(td_p2pes);
        }
        else { // "Fast"
            $("#ppe").css("display", "none");
            tr.append(td_epps2);
            $("#move-metric").html("PE/S<sup class='small-text'>2</sup>");
        }

        const td_users = $("<td></td>")
        const users = top_move_users.get(md.name);
        if (users) {
            //users.sort((a,b)=>b.stats.baseAttack-a.stats.baseAttack);
            for (let i=Math.min(users.length,MAX_USERS)-1; i>=0; i--) {
                const coords = GetPokemonIconCoords(users[i].id, users[i].form);
                td_users.append("<a class=pokemon-icon " 
                        + "onclick='LoadPokedexAndUpdateURL(GetPokeDexMon(" + users[i].id
                            + ",\"" + users[i].form + "\"))' " 
                        + "style='background-image:url("
                            + ICONS_URL + ");background-position:" + coords.x + "px "
                            + coords.y + "px'></a>");
            }
        }
        tr.append(td_users);
        
        $("#move-data-table tbody").append(tr);
    }
}
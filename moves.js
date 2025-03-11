let top_move_users, all_move_data;

let cur_sort = {
    move_data: [], 
    move_type: "Any",
    move_kind: "Fast", 
    sort_by: "", 
    reverse: false
};

/**
 * Bind event handlers for a move data table
 */
function BindMoveData() {
    // Enemy type
    $("#chk-move-kind").change(function() {
        const urlParams = new URLSearchParams(window.location.search);
        
        urlParams.set('moves', this.checked ? "charged" : "fast");
        cur_sort.sort_by = (this.checked ? "p2pes" : "peps2");
        
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

    cur_sort.type = type;

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
    if (cur_sort.type == "Any")
        type_link_any.addClass("selected");
    let links_types = $("#move-type-links-bytype");
    links_types.empty();

    let ndx = 0;
    for (const t of POKEMON_TYPES) {
        links_types.append("<li><a class='type-text bg-" + t
                + ((t == cur_sort.type) ? " selected" : "")
                + "' onclick='LoadMovesAndUpdateURL(\"" + t
                + "\")'>" + t + "</a></li>");
        if ((ndx+1) % 6 == 0) { //every 6th type
            links_types.append("<li class='line-break'><li>");
        }
        ndx++;
    }

    // Handle logic for "versus"
    const move_kind_chk = $("#chk-move-kind");
    cur_sort.move_kind = move_kind_chk.prop("checked") ? "Charged" : "Fast";

    // sets titles
    let title = cur_sort.move_kind + " Moves of " + cur_sort.type + " type";
    document.title = title + " - DialgaDex"; // page title
    $("#move-type-title").text(cur_sort.type);

    BuildMoveUserMap();
    cur_sort.move_data = GetMoveData(cur_sort.type, cur_sort.move_kind);
    SetMoveTable(cur_sort);
}

/**
 * Calls the 'LoadMoves' function and updates the url accordingly.
 */
function LoadMovesAndUpdateURL(type = "Any", move_kind) {

    if (!finished_loading)
        return false;

    if (!move_kind) {
        move_kind = $("#chk-move-kind").prop("checked") ? "charged" : "fast";
    }
    else {
        $("#chk-move-kind").prop("checked", (move_kind.toLowerCase() == "charged"));
    }
    let url = "?moves=" + move_kind + "&t=" + type;

    window.history.pushState({}, "", url);

    LoadMoves(type);
}

/**
 * Updates the move data table with a new sort order
 */
function MoveSort(sort_by) {
    if (cur_sort.sort_by == sort_by)
        cur_sort.reverse = !cur_sort.reverse;
    else
        cur_sort.reverse = false;
    
    cur_sort.sort_by = sort_by;
    SetMoveTable(cur_sort);
}

/**
 * Adds rows to the move data table according to an input array.
 * Also sets the appropriate headers depending on what kind of move is displayed.
 */
function GetMoveData(type = "Any", move_kind = "Fast") {
    if (all_move_data) {
        return all_move_data.filter(e=>(e.type==type||type=="Any")
            &&e.kind==move_kind);
    }

    all_move_data = [];
    all_move_data = all_move_data.concat(
        jb_cm.filter(e=>
            e.power < 1000
            &&!e.name.includes("Blastoise")
            &&!['Leech Life', 'Crush Claw', 'Wrap Pink', 'Wrap Green'].includes(e.name))
        .map(e=> ({...e, kind: "Charged"})));
    all_move_data = all_move_data.concat(
        jb_fm.filter(e=>
            e.name!="Hidden Power")
        .map(e=> ({...e, kind: "Fast"})));
        
    all_move_data.sort((a,b)=>(a.name.localeCompare(b.name)));
    //all_move_data.sort((a,b)=>(a.type.localeCompare(b.type)));
        
    all_move_data = all_move_data.map(e=>({
        name: e.name,
        kind: e.kind,
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
        peps2: Math.abs(e.energy_delta) * e.power / e.duration * 1000 / e.duration * 1000,
    }));

    return all_move_data.filter(e=>(e.type==type||type=="Any")
        &&e.kind==move_kind);
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

/** 
 * Helper function to get an "effective" attack stat for sorting and finding
 * the Pokemon best able to utilize a move.
 * 
 * +20% if a shadow form exists
 * +100% if type matches (should be +20% for STAB, but this really emphasizes the most typical use)
 */
function GetAdjustedAttStat(pkm_obj, move_name) {
    let move_obj = jb_fm.find(e=>e.name==move_name);
    if (!move_obj) move_obj = jb_cm.find(e=>e.name==move_name);

    return pkm_obj.stats.baseAttack * 
        (pkm_obj.shadow && pkm_obj.shadow_released ? 1.2 : 1) *
        (pkm_obj.types.includes(move_obj.type) ? 2 : 1); // STAB is 1.2, but really incentivize it here
}

// Small Factory function for making TDs, to replace some repetition
function MoveDataTD(innerHTML, is_selected) {
    return `<td ${(is_selected ? " class='selected'" : "")}>${innerHTML}</td>`;
}

// Small Factory function for making bars for charged move energy
function EnergyTD(energy) {
    let innerHTML = "<td>" 
        + "<div class='bar-bg' style='width: calc(100% - 15px); margin: 0'>";
    for (let i=0; i<(energy==0 ? 1 : Math.round(100/energy)); i++) {
        innerHTML += 
            "<div class='bar-fg' style='width: calc("+ energy + "% - 4px); margin: 2px; border-radius: 4px'>"
                + (i == 0 ? "<span class='bar-txt'>" + energy + "</span>" : "&nbsp;")
            + "</div>";
    }
    innerHTML += "</div></td>";

    return innerHTML;
}

/**
 * Adds rows to the move data table according to an input array.
 * Also sets the appropriate headers depending on what kind of move is displayed.
 */
function SetMoveTable(sort_info) {
    // sort as specified
    if (!sort_info.sort_by || sort_info.move_data[0][sort_info.sort_by] == undefined) 
        sort_info.sort_by = (sort_info.move_kind == "Charged" ? "p2pes" : "peps2");

    if (sort_info.sort_by == "name") // sort as string
        sort_info.move_data.sort((a,b)=>(a.name.localeCompare(b.name)));
    else
        sort_info.move_data.sort((a,b)=>(b[sort_info.sort_by]-a[sort_info.sort_by]));

    if (sort_info.reverse)
        sort_info.move_data.reverse();

    // update header based on sort order
    let triangles = $("#move-data-table .th-triangle");
    for (triangle of triangles)
        triangle.remove();
    $("#move-"+sort_info.sort_by).append("<span class=th-triangle>" + (sort_info.reverse ? "▴" : "▾") + "</span>");

    // removes previous table rows
    $("#move-data-table tbody tr").remove();

    for (const md of sort_info.move_data) {
        const tr = $("<tr></tr>");
        
        const td_move_name ="<td" + (sort_info.sort_by=="name" ? " class='selected'" : "") + ">" + 
                "<span class='type-text bg-" +
                ((md.name == "Hidden Power") ? "any-type" : md.type) + "'>" +
                md.name.replaceAll(" Plus", "+") + 
            "</span></td>";

        const td_power = MoveDataTD(FormatDecimal(md.power,3,0), 
            sort_info.sort_by=="power");
        const td_energy = (sort_info.move_kind == "Charged") ? 
            EnergyTD(md.energy) :
            MoveDataTD(FormatDecimal(md.energy,2,0), sort_info.sort_by=="energy");
        const td_duration = MoveDataTD(md.duration.toFixed(1) + "s", 
            sort_info.sort_by=="duration");
        const td_pps = MoveDataTD(FormatDecimal(md.pps,3,2), 
            sort_info.sort_by=="pps");
        
        tr.append(td_move_name);
        tr.append(td_power);
        tr.append(td_energy);
        tr.append(td_duration);
        tr.append(td_pps);

        if (sort_info.move_kind == "Charged") {
            $("#move-ppe").css("display", "");
            tr.append(MoveDataTD(
                md.ppe.toLocaleString("en", { maximumFractionDigits: 2 }),
                sort_info.sort_by=="ppe"));
            $("#move-p2pes").css("display", "");
            tr.append(MoveDataTD(FormatDecimal(md.p2pes,3,2), 
                sort_info.sort_by=="p2pes"));

            $("#move-peps2").css("display", "none");
            $("#move-eps").css("display", "none");
        }
        else { // "Fast"
            $("#move-ppe").css("display", "none");
            $("#move-p2pes").css("display", "none");
            
            $("#move-eps").css("display", "");
            tr.append(MoveDataTD(FormatDecimal(md.eps,2,2), 
                sort_info.sort_by=="eps"));
            $("#move-peps2").css("display", "");
            tr.append(MoveDataTD(FormatDecimal(md.peps2,3,2), 
                sort_info.sort_by=="peps2"));
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

/**
 * Format a decimal value with spaces in the left-padding and rounding-off fractional parts
 * (Aligns the decimal point for the whole column)
 */
function FormatDecimal(val, minIntDigits, maxFracDigits) {
    if (val==0)
        return "&#8199;".repeat(minIntDigits-1) + "0";

    return "&#8199;".repeat(Math.max(0, minIntDigits - Math.floor(Math.max(0,Math.log10(val)) + 1)))
        + val.toLocaleString("en", { maximumFractionDigits: maxFracDigits });
}
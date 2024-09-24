// magic numbers for incoming damage calc

// estimated incoming average DPS (usually ~900)
// tuned to a more recent estimate of ~1970 for T4-T5 eligible mons
let estimated_y_numerator = 1970; 
// estimated incoming charged move power
const estimated_cm_power = 10800;


/**
 * Gets the comprehensive DPS of a pokemon of some type(s) and with some
 * stats using a specific fast move and charged move.
 *
 * Formula credit to https://gamepress.gg .
 * https://gamepress.gg/pokemongo/damage-mechanics
 * https://gamepress.gg/pokemongo/how-calculate-comprehensive-dps
 * 
 * Can receive multipliers for the fast move and charged move, in
 * case of being aware of the effectiveness of the move against the enemy mon.
 * Also can receive the enemy defense stat and the y - enemy's DPS - if known.
 */
function GetDPS(types, atk, def, hp, fm_obj, cm_obj, fm_mult = 1, cm_mult = 1,
    enemy_def = 160, y = null, in_cm_dmg = null) {

    if (!fm_obj || !cm_obj)
        return 0;

    if (!enemy_def)
        enemy_def = 160;
    if (!y)
        y = estimated_y_numerator / def;
    if (!in_cm_dmg)
        in_cm_dmg = estimated_cm_power / def;

    let x = 0.5 * -cm_obj.energy_delta + 0.5 * fm_obj.energy_delta;
    if (settings_newdps)
        x = x + 0.5 * in_cm_dmg; // Assume waste of all energy from 1 incoming CM

    // fast move variables
    const fm_dmg_mult = fm_mult
        * ((types.includes(fm_obj.type) && fm_obj.name != "Hidden Power") ? 1.2 : 1);
    const fm_dmg = 0.5 * ProcessPower(fm_obj) * (atk / enemy_def) * fm_dmg_mult + 0.5;
    const fm_dps = fm_dmg / ProcessDuration(fm_obj.duration);
    const fm_eps = fm_obj.energy_delta / ProcessDuration(fm_obj.duration);

    const tof = hp / y;
    const f_to_c_ratio = (tof * -cm_obj.energy_delta + ProcessDuration(cm_obj.duration) * (x - 0.5 * hp)) / 
        (tof * fm_obj.energy_delta - ProcessDuration(fm_obj.duration) * (x - 0.5 * hp));
    const pp_boost = GetPartyBoost(f_to_c_ratio);

    // charged move variables
    const cm_dmg_mult = cm_mult * ((types.includes(cm_obj.type)) ? 1.2 : 1);
    const cm_dmg = 0.5 * ProcessPower(cm_obj) * (atk / enemy_def) * cm_dmg_mult + 0.5;
    const cm_dps = cm_dmg / ProcessDuration(cm_obj.duration);
    const cm_dps_adj = cm_dps * (1 + pp_boost);
    let cm_eps = -cm_obj.energy_delta / ProcessDuration(cm_obj.duration);
    // penalty to one-bar charged moves in old raid system (they use more energy (cm_eps))
    if (cm_obj.energy_delta == -100) {
        const dws = (settings_pve_turns ? 0 : cm_obj.damage_window_start / 1000); // dws in seconds
        cm_eps = (-cm_obj.energy_delta + 0.5 * fm_obj.energy_delta
            + 0.5 * y * dws) / ProcessDuration(cm_obj.duration);
    }

    // fast move is strictly better
    if (fm_dps > cm_dps)
        return fm_dps;

    // simple cycle DPS
    const dps0 = (fm_dps * cm_eps + cm_dps_adj * fm_eps) / (cm_eps + fm_eps);
    // comprehensive DPS
    let dps = dps0 + ((cm_dps_adj - fm_dps) / (cm_eps + fm_eps))
            * (0.5 - x / hp) * y;

    // charged move is strictly better, and can be used indefinitely
    // (don't allow party power)
    if (cm_dps > dps && -cm_obj.energy_delta < y * ProcessDuration(cm_obj.duration) * 0.5) 
        dps = cm_dps;

    return ((dps < 0) ? 0 : dps);
}

/**
 * Gets the TDO of a pokemon using its DPS, HP, DEF and y if known.
 *
 * Formula credit to https://gamepress.gg .
 * https://gamepress.gg/pokemongo/how-calculate-comprehensive-dps
 */
function GetTDO(dps, hp, def, y = null) {

    if (!y)
        y = estimated_y_numerator / def;
    return (dps * (hp / y));
}

/* Returns % extra damage on charged move from party power 
* Clamped between +0-100%
*/
function GetPartyBoost(f_to_c_ratio) {
    if (settings_party_size == 1) return 0;

    let f_moves_per_boost;

    switch (settings_party_size) {
        case 2:
            f_moves_per_boost = 18;
        break;
        case 3:
            f_moves_per_boost = 9;
        break;
        case 4:
            f_moves_per_boost = 6;
        break;
    }

    return Math.max(0, Math.min(f_to_c_ratio / f_moves_per_boost, 1));
}

/**
* In the GamePress formula, y is the DPS of the enemy.
* Usually y equals 900 / def but there is a more sophisticated formula to
* calculate it when the enemy is known.
* 
* This function gets y from a specified enemy.
* 
* Formula credit to https://gamepress.gg .
* https://gamepress.gg/pokemongo/how-calculate-comprehensive-dps
* 
* More tweaks: 
* Use altered timings between moves
* Better estimate of ratio between charged and fast moves
*/
function GetSpecificY(types, atk, fm_obj, cm_obj, fm_mult = 1, cm_mult = 1,
    enemy_def = 160, total_incoming_dps = 50) {

if (!fm_obj || !cm_obj)
    return 0;

const CHARGED_MOVE_CHANCE = 0.5;
const ENERGY_PER_HP = 0.5;
const FM_DELAY = 1.75; // Random between 1.5 and 2.0
const CM_DELAY = 0.5;

// fast move variables
const fm_dmg_mult = fm_mult
    * ((types.includes(fm_obj.type) && fm_obj.name != "Hidden Power") ? 1.2 : 1);
const fm_dmg = 0.5 * ProcessPower(fm_obj) * (atk / enemy_def) * fm_dmg_mult + 0.5;

// charged move variables
const cm_dmg_mult = cm_mult * ((types.includes(cm_obj.type)) ? 1.2 : 1);
const cm_dmg = 0.5 * ProcessPower(cm_obj) * (atk / enemy_def) * cm_dmg_mult + 0.5;

let fms_per_cm = 1;
let fm_dur = ProcessDuration(fm_obj.duration);
let cm_dur = ProcessDuration(cm_obj.duration);
if (settings_newdps) {
    const eps_for_damage = ENERGY_PER_HP * total_incoming_dps;
    fm_dur = fm_dur + FM_DELAY;
    cm_dur = cm_dur + CM_DELAY;

    let fms_per_cm = (-cm_obj.energy_delta - eps_for_damage * cm_dur) /
        (fm_obj.energy_delta + eps_for_damage * fm_dur);
    if (fms_per_cm < 0) fms_per_cm = 0;
    fms_per_cm += 1 / CHARGED_MOVE_CHANCE - 1;
}
else {
    switch (cm_obj.energy_delta) {
        case -100:
            fms_per_cm = 3;
            break;
        case -50:
            fms_per_cm = 1.5;
            break;
        case -33:
            fms_per_cm = 1;
            break;
    }

    fms_per_cm = fms_per_cm * 0.5; // used to be 'y_mult'
    fm_dur += 2;
    cm_dur += 2;
}

// specific y
const y = (fms_per_cm * fm_dmg + cm_dmg)
    / (fms_per_cm * fm_dur + cm_dur);

return {y: ((y < 0) ? 0 : y), cm_dmg: cm_dmg};
}

/**
* Processes the duration of fast moves and charged moves.
* The input is in milliseconds and the output is in seconds.
* The output differs according to 'settings_raid_system'.
* 
* https://www.reddit.com/r/TheSilphRoad/comments/1f4wqw8/analysis_everything_you_thought_you_knew_about/
*/
function ProcessDuration(duration) {

if (settings_pve_turns)
    return (Math.round((duration / 1000) * 2) / 2);
return (duration / 1000);
}


/**
 * Processes the power of fast moves and charged moves.
 * Any move with a calculated modifier above ~10% gets a power adjustment
 * to compensate for their speed buff.
 * The output differs according to 'settings_raid_system'.
 * 
 * https://www.reddit.com/r/TheSilphRoad/comments/1fkrjxx/analysis_dynamax_raid_mechanics_even_more_move/
 */
function ProcessPower(move_obj) {

    if (settings_pve_turns) {
        const newDuration = ProcessDuration(move_obj.duration);
        const modifier = (newDuration - move_obj.duration / 1000) / newDuration;
        if (Math.abs(modifier) >= 0.199)
            return move_obj.power * (1 + modifier);
    }
    
    return move_obj.power;
}

/**
 * Gets array with an arbitrary number of a specific pokemon's strongest movesets
 * against a specific enemy pokemon.
 *
 * 'enemy_params' contains moves, types, weakness (defensive mults),  
 *      stats, and enemy_ys[]
*/
function GetStrongestAgainstSpecificEnemy(pkm_obj, shadow,
    enemy_params, search_params) {

    const num_movesets = search_params.suboptimal ? 5 : 1;
    let movesets = [];

    // gets the necessary data to make the rating calculations

    // subject data
    const types = pkm_obj.types;
    const effectiveness = GetTypesEffectivenessAgainstTypes(types);
    const stats = GetPokemonStats(pkm_obj);
    const atk = (shadow) ? (stats.atk * 6 / 5) : stats.atk;
    const def = (shadow) ? (stats.def * 5 / 6) : stats.def;
    const hp = stats.hp;
    const moves = GetPokemonMoves(pkm_obj);
    if (moves.length != 6)
        return movesets;
    const fms = moves[0];
    const cms = moves[1];
    const elite_fms = moves[2];
    const elite_cms = moves[3];
    const pure_only_cms = moves[4];
    const shadow_only_cms = moves[5];
    const all_fms = fms.concat(elite_fms);
    let all_cms = cms.concat(elite_cms);
    if (shadow === true) all_cms = all_cms.concat(shadow_only_cms);
    else if (shadow === false) all_cms = all_cms.concat(pure_only_cms);

    // enemy data
    //let avg_y = null;
    let enemy_moveset_ys = enemy_params.enemy_ys;
    const enemy_types = enemy_params.types;
    const enemy_effectiveness = enemy_params.weakness;
    const enemy_stats = enemy_params.stats;
    const enemy_def = enemy_stats ? enemy_stats.def : null;
    const enemy_moves = enemy_params.moves;
    if ((!enemy_moveset_ys || enemy_moveset_ys.length == 0)
            && enemy_moves && enemy_moves.length == 6
            && enemy_stats) {
        const enemy_fms = enemy_moves[0];
        const enemy_cms = enemy_moves[1];
        const enemy_elite_fms = []; //enemy_moves[2]; enemies don't use elite moves
        const enemy_elite_cms = []; //enemy_moves[3];
        const enemy_all_fms = enemy_fms.concat(enemy_elite_fms);
        const enemy_all_cms = enemy_cms.concat(enemy_elite_cms);
        //avg_y = GetMovesetsAvgY(enemy_types, enemy_stats.atk,
        //        enemy_all_fms, enemy_all_cms, effectiveness, def);
        enemy_moveset_ys = GetMovesetYs(enemy_types, enemy_stats.atk,
            enemy_all_fms, enemy_all_cms, effectiveness, def);
    }

    // searches for the movesets
    for (fm of all_fms) {

        const fm_is_elite = elite_fms.includes(fm);

        if (!search_params.elite && fm_is_elite)
            continue;

        // gets the fast move object
        const fm_obj = jb_fm.find(entry => entry.name == fm);
        if (!fm_obj)
            continue;

        // checks that fm type matches the type searched
        // if search type isn't specified, any type goes
        // if checking "versus", any type goes
        if (search_params.type && search_params.type != "Any" && !search_params.versus &&
            fm_obj.type != search_params.type && !search_params.mixed)
            continue;

        const fm_mult =
            GetEffectivenessMultOfType(enemy_effectiveness, fm_obj.type);

        for (cm of all_cms) {

            const cm_is_elite = elite_cms.includes(cm);

            if (!search_params.elite && cm_is_elite)
                continue;

            // gets the charged move object
            const cm_obj = jb_cm.find(entry => entry.name == cm);
            if (!cm_obj)
                continue;

            // checks that cm type matches the type searched
            // if search type isn't specified, any type goes
            // if checking "versus", any type goes
            if (search_params.type && search_params.type != "Any" && !search_params.versus && 
                cm_obj.type != search_params.type && !search_params.mixed)
                continue;

            // ensure at least one type matches if mixing
            if (search_params.type && search_params.type != "Any" && !search_params.versus &&
                search_params.mixed && fm_obj.type != search_params.type && cm_obj.type != search_params.type)
                continue;

            // checks that both moves types are equal (unless mixing)
            if (fm_obj.type != cm_obj.type && !search_params.mixed)
                continue;
            
            const cm_mult =
                GetEffectivenessMultOfType(enemy_effectiveness, cm_obj.type);
            
            let all_ratings = [];
            for (enemy_y of enemy_moveset_ys) {
                // calculates the data
                const dps = GetDPS(types, atk, def, hp, fm_obj, cm_obj,
                    fm_mult, cm_mult, enemy_def, enemy_y.y, enemy_y.cm_dmg);
                const tdo = GetTDO(dps, hp, def, enemy_y.y);
                // metrics from Reddit user u/Elastic_Space
                const rat = Math.pow(dps, 1-settings_metric_exp) * Math.pow(tdo, settings_metric_exp);
                all_ratings.push(rat);
            }

            const avg_rating = (all_ratings.length > 0 ? all_ratings.reduce((a, b) => a+b, 0) / all_ratings.length : 0);
            const moveset = {
                rat: avg_rating,
                fm: fm, fm_is_elite: fm_is_elite, fm_type: fm_obj.type,
                cm: cm, cm_is_elite: cm_is_elite, cm_type: cm_obj.type
            };
            // if the array of movesets isn't full
            // or the current moveset is stronger than the weakest in the array,
            // pushes the current moveset to the array
            if (movesets.length < num_movesets) {
                movesets.push(moveset);
                // sorts array
                movesets.sort(function compareFn(a , b) {
                    return ((a.rat > b.rat) || - (a.rat < b.rat));
                });
            } else if (avg_rating > movesets[0].rat) {
                movesets[0] = moveset;
                // sorts array
                movesets.sort(function compareFn(a , b) {
                    return ((a.rat > b.rat) || - (a.rat < b.rat));
                });
            }
        }
    }

    return movesets;
}

/**
* Gets the average y (dps) of all the movesets of a specific pokemon attacking
* a specific enemy.
*/
function GetMovesetsAvgY(types, atk, fms, cms, enemy_effectiveness, enemy_def = null) {
    const all_ys = GetMovesetYs(types, atk, fms, cms, enemy_effectiveness, enemy_def);

    if (all_ys.length == 0) {
        return null;
    }

    return all_ys.reduce((a, b) => a+b.y, 0) / all_ys.length;
}

/**
* Gets the y (dps) of all the movesets of a specific pokemon attacking
* a specific enemy.
*/
function GetMovesetYs(types, atk, fms, cms, enemy_effectiveness, enemy_def = null) {

    let all_ys = [];

    for (let fm of fms) {

        // gets the fast move object
        const fm_obj = jb_fm.find(entry => entry.name == fm);
        if (!fm_obj)
            continue;
        const fm_mult = GetEffectivenessMultOfType(enemy_effectiveness, fm_obj.type);

        for (let cm of cms) {

            // gets the charged move object
            const cm_obj = jb_cm.find(entry => entry.name == cm);
            if (!cm_obj)
                continue;
            const cm_mult = GetEffectivenessMultOfType(enemy_effectiveness, cm_obj.type);

            all_ys.push(GetSpecificY(types, atk, fm_obj, cm_obj, fm_mult, cm_mult, enemy_def));
        }
    }

    return all_ys;
}

/**
 * Searches the strongest pokemon of each type and returns the strongest
 * pokemon per type.
 */
function GetStrongestOfEachType(search_params) {
    // map of strongest pokemon and moveset found so far for each type
    let str_pokemons = new Map();

    // build a basic enemy to "sim" against
    let enemy_params = {
        weakness: null,
        enemy_ys: [{y: null, in_cm_dmg: null}] // use defaults
    };

    for (const type of POKEMON_TYPES) {
        search_params.type = type; // Find strongest movesets regardless of type
        enemy_params.weakness = GetTypesEffectivenessSingleBoost(search_params.type);

        const str_pok = GetStrongestVersus(enemy_params, search_params, 1)[0];
        str_pokemons.set(type, str_pok);
    }

    // converts map into array
    let str_pokemons_array = [];
    for (const type of POKEMON_TYPES) {
        if (str_pokemons.has(type))
            str_pokemons_array.push(str_pokemons.get(type));
    }
    return str_pokemons_array;
}

/**
 * Searches the strongest pokemon of one type and returns the strongest
 * pokemon of that type.
 */
function GetStrongestOfOneType(search_params) {

    // build a basic enemy to "sim" against
    let enemy_params = {
        weakness: (search_params.versus ? 
            GetTypesEffectivenessAgainstTypes([search_params.type]) : 
            GetTypesEffectivenessSingleBoost(search_params.type)),
        enemy_ys: [{y: null, in_cm_dmg: null}] // use defaults
    };

    // array of strongest pokemon and moveset found so far
    let str_pokemons = GetStrongestVersus(enemy_params, search_params);

    // reverses strongest pokemon array
    str_pokemons.reverse();

    return str_pokemons;
}

/**
 * Find all strongest counters to this pokemon, filtering based on params
 */
function GetStrongestVersus(enemy_params, search_params, num_counters = 200) {
    const counters = [];

    /**
     * Checks if any of the movesets of a specific pokemon is stronger than any
     * of the current counters. If it is, updates the counters arrays.
     */
    function UpdateIfStronger(pkm_obj, shadow) {
        const movesets = GetStrongestAgainstSpecificEnemy(pkm_obj, shadow, enemy_params, search_params);
        if (movesets.length == 0)
            return;

        for (let moveset of movesets) {

            let is_strong_enough = false;

            let not_full = counters.length < num_counters;
            let weakest = counters[0];

            if (not_full) { // if array isn't full...
                if (moveset.rat > 0)
                    is_strong_enough = true;
            } else { // if array is full...
                // if finds something better than worst in array...
                if (moveset.rat > weakest.rat)
                    is_strong_enough = true;
            }

            if (is_strong_enough) {

                // adds pokemon to array of counters
                const counter = {
                    rat: moveset.rat, id: pkm_obj.id,
                    name: pkm_obj.name, form: pkm_obj.form,
                    shadow: shadow, class: pkm_obj.class,
                    fm: moveset.fm, fm_is_elite: moveset.fm_is_elite,
                    fm_type: moveset.fm_type,
                    cm: moveset.cm, cm_is_elite: moveset.cm_is_elite,
                    cm_type: moveset.cm_type
                };

                
                if (counters.length < num_counters)
                    counters.push(counter);
                else
                    counters[0] = counter;
                // sorts array
                counters.sort(function compareFn(a , b) {
                    return ((a.rat > b.rat) || - (a.rat < b.rat));
                });
            }
        }
    }

    SearchAll(search_params, UpdateIfStronger);

    return counters;
}
from data import (
    TOURNAMENT_TEAMS,
    DIAMOND_LEGENDS,
    GOLD_LEGENDS,
    SILVER_LEGENDS,
    BRONZE_LEGENDS,
    OPTION_ROULETTE
)
from roulette import Roulette
from models import Tournament, HumanPlayer
from draft import (
    assign_teams_by_turns,
    assign_diamond_captains,
    assign_option_spins,
    execute_option_results,
    resolve_manual_actions
)
from save_load import save_tournament_to_json, load_tournament_from_json


# =========================
# ELEGIR MODO
# =========================

modo = input("¿Quieres (1) crear un torneo nuevo o (2) cargar uno guardado? ").strip()

if modo == "2":
    tournament = load_tournament_from_json()

else:
    # =========================
    # CREAR TORNEO DINÁMICO
    # =========================

    tournament_name = input("Nombre del torneo: ").strip()

    if not tournament_name:
        tournament_name = "Torneo sin nombre"

    tournament = Tournament(tournament_name)

    # =========================
    # CREAR JUGADORES HUMANOS DINÁMICAMENTE
    # =========================

    num_players = int(input("¿Cuántos jugadores humanos participan? (solo 2 por ahora): "))

    if num_players != 2:
        print("Por ahora este sistema está pensado para 2 jugadores. Se usará 2.")
        num_players = 2

    for i in range(num_players):
        player_name = input(f"Nombre del jugador {i + 1}: ").strip()

        if not player_name:
            player_name = f"Jugador{i + 1}"

        player = HumanPlayer(player_name)
        tournament.add_human_player(player)

    print("\n--- JUGADORES CREADOS ---")
    for player in tournament.human_players:
        print(f"- {player.name}")

    # =========================
    # CREAR RULETAS
    # =========================

    team_roulette = Roulette(
        "Ruleta de Equipos",
        TOURNAMENT_TEAMS.copy(),
        remove_on_spin=True
    )

    diamond_roulette = Roulette(
        "Ruleta Diamante",
        DIAMOND_LEGENDS.copy(),
        remove_on_spin=True
    )

    gold_roulette = Roulette(
        "Ruleta Oro",
        GOLD_LEGENDS.copy(),
        remove_on_spin=True
    )

    silver_roulette = Roulette(
        "Ruleta Plata",
        SILVER_LEGENDS.copy(),
        remove_on_spin=True
    )

    bronze_roulette = Roulette(
        "Ruleta Bronce",
        BRONZE_LEGENDS.copy(),
        remove_on_spin=True
    )

    option_roulette = Roulette(
        "Ruleta de Opciones",
        OPTION_ROULETTE.copy(),
        remove_on_spin=False
    )

    # =========================
    # EJECUTAR TORNEO
    # =========================

    assign_teams_by_turns(tournament, team_roulette)
    assign_diamond_captains(tournament, diamond_roulette)
    assign_option_spins(tournament, option_roulette)

    execute_option_results(
        tournament,
        diamond_roulette,
        gold_roulette,
        silver_roulette,
        bronze_roulette
    )

    resolve_manual_actions(tournament)

    # =========================
    # GUARDAR TORNEO
    # =========================

    save_tournament_to_json(tournament)


# =========================
# MOSTRAR RESULTADO
# =========================

print("\n--- EQUIPOS FINALES ---")
tournament.show_teams()

print("\n--- PLANTILLAS ---")
for team in tournament.teams:
    team.show_squad()

print("\n--- RESULTADO DE RULETA DE OPCIONES ---")
for team in tournament.teams:
    print(f"\n{team.name}:")
    for result in team.option_results:
        print(f"- {result}")

print("\n--- CAMBIOS MANUALES EN PLANTILLA BASE ---")
for team in tournament.teams:
    if team.base_changes:
        print(f"\n{team.name}:")
        for change in team.base_changes:
            print(f"- {change}")
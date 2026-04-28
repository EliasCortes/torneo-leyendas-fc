from models import Team, LegendPlayer


def assign_teams_by_turns(tournament, team_roulette, max_teams_per_player=8):
    players = tournament.human_players

    if not players:
        print("No hay jugadores en el torneo")
        return

    print("\n--- SORTEO DE EQUIPOS ---")
    print(f"Máximo de equipos por jugador: {max_teams_per_player}")

    round_number = 1

    while any(len(player.teams) < max_teams_per_player for player in players):
        print(f"\nRONDA {round_number}")

        for player in players:
            if len(player.teams) >= max_teams_per_player:
                continue

            team_name = team_roulette.spin()

            if not team_name:
                print("No quedan más equipos en la ruleta")
                return

            team = Team(team_name, player)
            tournament.add_team(team)

            print(f"{player.name} recibe: {team_name}")

        round_number += 1


def assign_diamond_captains(tournament, diamond_roulette):
    print("\n--- ASIGNACIÓN DE CAPITANES DIAMANTE ---")

    for team in tournament.teams:
        if team.captain is not None:
            continue

        captain_name = diamond_roulette.spin()

        if captain_name:
            captain = LegendPlayer(captain_name, "Diamante")
            team.set_captain(captain)

            print(f"{team.name} recibe como capitán a: {captain_name}")
        else:
            print(f"No quedan Diamantes para {team.name}")


def assign_option_spins(tournament, option_roulette, spins_per_team=3):
    print("\n--- TIRADAS DE RULETA DE OPCIONES ---")

    for team in tournament.teams:
        print(f"\n{team.name} tira {spins_per_team} veces:")

        for spin_number in range(spins_per_team):
            result = option_roulette.spin()

            if result:
                team.option_results.append(result)
                print(f"Tirada {spin_number + 1}: {result}")
            else:
                print("La ruleta de opciones no tiene resultados.")
                return



def execute_option_results(tournament, diamond_roulette, gold_roulette, silver_roulette, bronze_roulette):
    print("\n--- EJECUTANDO RESULTADOS DE RULETA DE OPCIONES ---")

    manual_option_types = [
        "Comodín Bronce",
        "Comodín Plata",
        "Comodín Oro",
        "Comodín Diamante",
        "Fichar jugador equipo 5*",
        "Fichar jugador equipo 4.5*",
        "Fichar un Medio",
        "Fichar un Atacante",
        "Fichar un Def/Portero",
        "Fichar un jugador Normal",
        "Quitar un Medio",
        "Quitar un Atacante",
        "Quitar un Def/Portero",
        "Quitar un jugador Normal"
    ]

    for team in tournament.teams:
        print(f"\nProcesando {team.name}...")

        for result in team.option_results:
            if result == "Tirar Ruleta Diamante":
                player_name = diamond_roulette.spin()
                if player_name:
                    legend = LegendPlayer(player_name, "Diamante")
                    team.add_legend(legend)
                    print(f"  + {team.name} ficha Diamante: {player_name}")

            elif result == "Tirar Ruleta Oro":
                player_name = gold_roulette.spin()
                if player_name:
                    legend = LegendPlayer(player_name, "Oro")
                    team.add_legend(legend)
                    print(f"  + {team.name} ficha Oro: {player_name}")

            elif result == "Tirar Ruleta Plata":
                player_name = silver_roulette.spin()
                if player_name:
                    legend = LegendPlayer(player_name, "Plata")
                    team.add_legend(legend)
                    print(f"  + {team.name} ficha Plata: {player_name}")

            elif result == "Tirar Ruleta Bronce":
                player_name = bronze_roulette.spin()
                if player_name:
                    legend = LegendPlayer(player_name, "Bronce")
                    team.add_legend(legend)
                    print(f"  + {team.name} ficha Bronce: {player_name}")

            elif result in manual_option_types:
                team.manual_actions.append(result)
                print(f"  ⚠ ACCIÓN MANUAL para {team.name}: {result}")

            else:
                print(f"  - {team.name}: '{result}' no reconocida")

def resolve_manual_actions(tournament):
    print("\n--- RESOLUCIÓN MANUAL DE ACCIONES ---")

    for team in tournament.teams:
        if not team.manual_actions:
            continue

        print(f"\nResolviendo acciones de {team.name}...")

        for action in team.manual_actions:
            print(f"\n⚠ Acción: {action}")

            # =========================
            # ACCIONES DE FICHAJE MANUAL
            # =========================
            if action in [
                "Comodín Bronce",
                "Comodín Plata",
                "Comodín Oro",
                "Comodín Diamante",
                "Fichar jugador equipo 5*",
                "Fichar jugador equipo 4.5*",
                "Fichar un Medio",
                "Fichar un Atacante",
                "Fichar un Def/Portero",
                "Fichar un jugador Normal"
            ]:
                player_name = input(f"¿Qué jugador base has fichado para {team.name}? ").strip()

                if player_name:
                    team.base_changes.append(f"Fichado: {player_name}")
                    print(f"  ✅ Registrado fichaje: {player_name}")

            # =========================
            # ACCIONES DE ELIMINACIÓN MANUAL
            # =========================
            elif action in [
                "Quitar un Medio",
                "Quitar un Atacante",
                "Quitar un Def/Portero",
                "Quitar un jugador Normal"
            ]:
                player_name = input(f"¿Qué jugador base ha sido eliminado de {team.name}? ").strip()

                if player_name:
                    team.base_changes.append(f"Eliminado: {player_name}")
                    print(f"  ❌ Registrada eliminación: {player_name}")

            else:
                print(f"No se reconoce cómo resolver: {action}")

        # Una vez resueltas, vaciamos la lista
        team.manual_actions.clear()
import json


def save_tournament_to_json(tournament, filename="torneo_leyendas.json"):
    data = {
        "name": tournament.name,
        "human_players": [],
        "teams": []
    }

    # Guardar jugadores humanos
    for player in tournament.human_players:
        data["human_players"].append({
            "name": player.name
        })

    # Guardar equipos
    for team in tournament.teams:
        team_data = {
            "name": team.name,
            "owner": team.owner.name,
            "captain": team.captain.name if team.captain else None,
            "captain_category": team.captain.category if team.captain else None,
            "legends": [],
            "option_results": team.option_results,
            "base_changes": team.base_changes
        }

        for legend in team.squad:
            team_data["legends"].append({
                "name": legend.name,
                "category": legend.category,
                "position": legend.position
            })

        data["teams"].append(team_data)

    with open(filename, "w", encoding="utf-8") as file:
        json.dump(data, file, indent=4, ensure_ascii=False)

    print(f"\n💾 Torneo guardado correctamente en '{filename}'")

import json
from models import Tournament, HumanPlayer, Team, LegendPlayer


def load_tournament_from_json(filename="torneo_leyendas.json"):
    with open(filename, "r", encoding="utf-8") as file:
        data = json.load(file)

    # Crear torneo
    tournament = Tournament(data["name"])

    # Crear jugadores humanos
    players_dict = {}
    for player_data in data["human_players"]:
        player = HumanPlayer(player_data["name"])
        tournament.add_human_player(player)
        players_dict[player.name] = player

    # Crear equipos
    for team_data in data["teams"]:
        owner = players_dict[team_data["owner"]]
        team = Team(team_data["name"], owner)

        # Cargar capitán
        if team_data["captain"]:
            captain = LegendPlayer(
                team_data["captain"],
                team_data["captain_category"]
            )
            team.set_captain(captain)

        # Cargar leyendas
        for legend_data in team_data["legends"]:
            # Evitar duplicar el capitán si ya está en squad
            if team.captain and legend_data["name"] == team.captain.name:
                continue

            legend = LegendPlayer(
                legend_data["name"],
                legend_data["category"],
                legend_data["position"]
            )
            team.add_legend(legend)

        # Cargar tiradas y cambios manuales
        team.option_results = team_data["option_results"]
        team.base_changes = team_data["base_changes"]

        tournament.add_team(team)

    print(f"\n📂 Torneo cargado correctamente desde '{filename}'")
    return tournament
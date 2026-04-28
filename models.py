class HumanPlayer:
    def __init__(self, name):
        self.name = name
        self.teams = []

    def add_team(self, team):
        self.teams.append(team)

    def __str__(self):
        return f"Jugador humano: {self.name}"


class LegendPlayer:
    def __init__(self, name, category, position="Sin definir"):
        self.name = name
        self.category = category
        self.position = position

    def __str__(self):
        return f"{self.name} ({self.category} - {self.position})"


class Team:
    def __init__(self, name, owner):
        self.name = name
        self.owner = owner
        self.squad = []             # leyendas
        self.captain = None
        self.option_results = []
        self.manual_actions = []
        self.base_changes = []      # fichajes/eliminaciones manuales

    def add_legend(self, legend):
        if isinstance(legend, LegendPlayer):
            self.squad.append(legend)
        else:
            print("Error: solo puedes añadir objetos del tipo LegendPlayer")

    def set_captain(self, legend):
        if not isinstance(legend, LegendPlayer):
            print("Error: el capitán debe ser un LegendPlayer")
            return

        if legend.category != "Diamante":
            print(f"Error: {legend.name} no es Diamante y no puede ser capitán")
            return

        self.captain = legend
        self.add_legend(legend)

    def show_squad(self):
        print(f"\nPlantilla de {self.name}:")
        if self.captain:
            print(f"Capitán: {self.captain}")
        for player in self.squad:
            print(f"- {player}")

    def __str__(self):
        captain_name = self.captain.name if self.captain else "Sin capitán"
        return f"Equipo: {self.name} | Dueño: {self.owner.name} | Capitán: {captain_name}"


class Tournament:
    def __init__(self, name):
        self.name = name
        self.human_players = []
        self.teams = []
        self.matches = []

    def add_human_player(self, player):
        self.human_players.append(player)

    def add_team(self, team):
        self.teams.append(team)
        team.owner.add_team(team)

    def show_teams(self):
        print(f"\nEquipos en {self.name}:")
        for team in self.teams:
            print(team)

    def __str__(self):
        return f"Torneo: {self.name}"
   









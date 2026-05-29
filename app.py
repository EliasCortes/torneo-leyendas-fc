import os
import json
import re
from flask import Flask, request, jsonify
from flask_cors import CORS
from datetime import datetime

app = Flask(__name__)
# Enable CORS for all routes so the React frontend (running on another port, e.g., 5173) can communicate with it
CORS(app)

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DATA_DIR = os.path.join(BASE_DIR, 'data')

# Ensure the data directory exists
if not os.path.exists(DATA_DIR):
    os.makedirs(DATA_DIR)

# Helper to slugify tournament names into valid filenames
def slugify(text):
    text = text.lower()
    text = re.sub(r'[^\w\s-]', '', text)
    text = re.sub(r'[-\s]+', '_', text)
    return text.strip('_')

@app.route("/api/constants", methods=["GET"])
def get_constants():
    # Import constants dynamically to avoid circular import issues
    import constants
    return jsonify({
        "teams": constants.TOURNAMENT_TEAMS,
        "teams_5_stars": constants.TEAMS_5_STARS,
        "teams_4_5_stars": constants.TEAMS_4_5_STARS,
        "diamond_legends": constants.DIAMOND_LEGENDS,
        "gold_legends": constants.GOLD_LEGENDS,
        "silver_legends": constants.SILVER_LEGENDS,
        "bronze_legends": constants.BRONZE_LEGENDS,
        "options_roulette": constants.OPTION_ROULETTE
    })

@app.route("/api/tournaments", methods=["GET"])
def list_tournaments():
    tournaments = []
    
    # List all json files in data folder
    for file in os.listdir(DATA_DIR):
        if file.endswith(".json"):
            filepath = os.path.join(DATA_DIR, file)
            try:
                with open(filepath, "r", encoding="utf-8") as f:
                    data = json.load(f)
                    
                # Extract metadata
                mtime = os.path.getmtime(filepath)
                updated_at = datetime.fromtimestamp(mtime).strftime('%Y-%m-%d %H:%M:%S')
                
                tournaments.append({
                    "filename": file,
                    "name": data.get("name", file[:-5]),
                    "status": data.get("status", "En curso"),
                    "players": [p.get("name") if isinstance(p, dict) else p for p in data.get("human_players", [])],
                    "teams_count": len(data.get("teams", [])),
                    "champion": data.get("champion", None),
                    "winner_owner": data.get("winner_owner", None),
                    "updated_at": updated_at
                })
            except Exception as e:
                print(f"Error reading {file}: {e}")
                
    # Sort by modification time descending (newest first)
    tournaments.sort(key=lambda x: x["updated_at"], reverse=True)
    return jsonify(tournaments)

@app.route("/api/tournaments/<filename>", methods=["GET"])
def get_tournament(filename):
    if not filename.endswith(".json"):
        filename += ".json"
        
    filepath = os.path.join(DATA_DIR, filename)
    if not os.path.exists(filepath):
        return jsonify({"error": f"Tournament {filename} not found"}), 404
        
    try:
        with open(filepath, "r", encoding="utf-8") as f:
            data = json.load(f)
        return jsonify(data)
    except Exception as e:
        return jsonify({"error": f"Failed to read tournament: {str(e)}"}), 500

def get_player_category(player_name):
    import constants
    p_name = player_name.strip().lower()
    for name in constants.DIAMOND_LEGENDS:
        if name.lower() == p_name:
            return "Diamante"
    for name in constants.GOLD_LEGENDS:
        if name.lower() == p_name:
            return "Oro"
    for name in constants.SILVER_LEGENDS:
        if name.lower() == p_name:
            return "Plata"
    for name in constants.BRONZE_LEGENDS:
        if name.lower() == p_name:
            return "Bronce"
    return "Actual"

@app.route("/api/tournaments/new", methods=["POST"])
def create_tournament():
    req_data = request.json or {}
    name = req_data.get("name", "Torneo Sin Nombre").strip()
    players = req_data.get("players", []) # list of strings
    format_type = req_data.get("format", "16 equipos")
    teams_per_player = req_data.get("teamsPerPlayer", 8)
    advantages = req_data.get("advantages", {})
    
    # Generate unique filename
    base_slug = slugify(name)
    filename = f"{base_slug}.json"
    counter = 1
    while os.path.exists(os.path.join(DATA_DIR, filename)):
        filename = f"{base_slug}_{counter}.json"
        counter += 1
        
    # Pre-populate previous champion team if configured
    teams = []
    if advantages.get("hasPrevChampion"):
        champ_team_name = advantages.get("prevChampTeam")
        champ_owner = advantages.get("prevChampOwner")
        champ_captain = advantages.get("prevCaptain")
        retained_player_names = advantages.get("retainedPlayers", [])
        
        legends = []
        if champ_captain:
            legends.append({
                "name": champ_captain,
                "category": "Diamante",
                "position": "Sin definir"
            })
        for p in retained_player_names:
            cat = get_player_category(p)
            legends.append({
                "name": p,
                "category": cat,
                "position": "Sin definir"
            })
            
        champ_team = {
            "name": champ_team_name,
            "owner": champ_owner,
            "captain": champ_captain or "",
            "captain_category": "Diamante" if champ_captain else "",
            "legends": legends,
            "option_results": [],
            "base_changes": [],
            "spins": [],
            "wildcards": {
                "Bronce": 0,
                "Plata": 0,
                "Oro": 0,
                "Diamante": 0
            },
            "group": None,
            "stats": {
                "played": 0,
                "won": 0,
                "drawn": 0,
                "lost": 0,
                "gf": 0,
                "ga": 0,
                "pts": 0
            }
        }
        teams.append(champ_team)

    # Build default structure
    tournament_data = {
        "name": name,
        "format": format_type,
        "teams_per_player": teams_per_player,
        "human_players": [{"name": p} for p in players],
        "teams": teams,
        "matches": [],
        "champion": None,
        "winner_owner": None,
        "status": "Configuración",
        "advantages": advantages,
        "created_at": datetime.now().strftime('%Y-%m-%d %H:%M:%S')
    }
    
    filepath = os.path.join(DATA_DIR, filename)
    try:
        with open(filepath, "w", encoding="utf-8") as f:
            json.dump(tournament_data, f, indent=4, ensure_ascii=False)
            
        tournament_data["filename"] = filename
        return jsonify(tournament_data), 201
    except Exception as e:
        return jsonify({"error": f"Failed to create tournament: {str(e)}"}), 500

@app.route("/api/tournaments/<filename>/save", methods=["POST"])
def save_tournament(filename):
    if not filename.endswith(".json"):
        filename += ".json"
        
    filepath = os.path.join(DATA_DIR, filename)
    req_data = request.json or {}
    
    try:
        # Save exact JSON received
        with open(filepath, "w", encoding="utf-8") as f:
            json.dump(req_data, f, indent=4, ensure_ascii=False)
        return jsonify({"success": True, "message": f"Tournament {filename} saved successfully"})
    except Exception as e:
        return jsonify({"error": f"Failed to save tournament: {str(e)}"}), 500

@app.route("/api/tournaments/<filename>", methods=["DELETE"])
def delete_tournament(filename):
    if not filename.endswith(".json"):
        filename += ".json"
        
    filepath = os.path.join(DATA_DIR, filename)
    if not os.path.exists(filepath):
        return jsonify({"error": f"Tournament {filename} not found"}), 404
        
    try:
        os.remove(filepath)
        return jsonify({"success": True, "message": f"Tournament {filename} deleted successfully"})
    except Exception as e:
        return jsonify({"error": f"Failed to delete tournament: {str(e)}"}), 500

if __name__ == "__main__":
    # Run on port 5000 by default
    app.run(host="0.0.0.0", port=5000, debug=True)
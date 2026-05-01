from flask import Flask, request
import json
import os

app = Flask(__name__)


@app.route("/")
def home():
    # 📁 Elegir archivo (por defecto el principal)
    archivo = request.args.get("torneo", "torneo_leyendas.json")

    # 🚫 Seguridad básica
    if not archivo.endswith(".json"):
        return "Archivo no válido"

    ruta = os.path.join(os.getcwd(), archivo)

    if not os.path.exists(ruta):
        return f"No existe el archivo: {archivo}"

    # 📖 Cargar JSON
    with open(ruta, "r", encoding="utf-8") as f:
        data = json.load(f)

    # 🧱 HTML base
    html = f"<h1>{data.get('name', 'Torneo Leyendas')}</h1>"

    # 🔁 Recorrer equipos
    for team in data.get("teams", []):
        html += f"<h2>{team.get('name', 'Sin nombre')}</h2>"
        html += f"<p><b>Dueño:</b> {team.get('owner', 'Sin definir')}</p>"
        html += f"<p><b>Capitán:</b> {team.get('captain', 'Sin definir')}</p>"

        # ⚽ Plantilla (opcional)
        if team.get("legends"):
            html += "<p><b>Leyendas:</b></p><ul>"
            for player in team["legends"]:
                html += f"<li>{player['name']} ({player['category']})</li>"
            html += "</ul>"

        # 🎰 Tiradas (lo importante)
        if team.get("spins"):
            html += "<p><b>Tiradas:</b></p><ul>"

            for i, spin in enumerate(team["spins"], start=1):
                accion = spin.get("accion", "Sin acción")
                resultado = spin.get("resultado", "Pendiente")

                html += f"<li>Tirada {i}: {accion} ➜ {resultado}</li>"

            html += "</ul>"

        else:
            html += "<p><i>Sin tiradas</i></p>"

        html += "<hr>"

    return html


if __name__ == "__main__":
    app.run(debug=True)
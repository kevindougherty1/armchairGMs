import json
import os
from flask import Flask, jsonify, render_template, request

app = Flask(__name__)

ADMIN_KEY = os.environ.get('ADMIN_KEY', '')

def _players_path():
    return os.path.join(app.root_path, 'data', 'players.json')

def _load_players():
    with open(_players_path(), encoding='utf-8-sig') as f:
        return json.load(f)

@app.route('/')
def index():
    return render_template('index.html', players=_load_players())

@app.route('/api/players')
def api_players():
    return jsonify(_load_players())

@app.route('/api/players', methods=['PUT'])
def update_players():
    if not ADMIN_KEY or request.headers.get('X-Admin-Key') != ADMIN_KEY:
        return jsonify({'error': 'Unauthorized'}), 401
    data = request.get_json()
    if not isinstance(data, list):
        return jsonify({'error': 'Expected a JSON array'}), 400
    with open(_players_path(), 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
    return jsonify({'updated': len(data)})

if __name__ == '__main__':
    debug = os.environ.get('FLASK_DEBUG', 'false').lower() == 'true'
    app.run(debug=debug)
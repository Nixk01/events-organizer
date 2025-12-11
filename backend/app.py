from flask import Flask, jsonify, request, g
from flask_cors import CORS
import sqlite3

DATABASE = 'events.db'

app = Flask(__name__)
CORS(app)

def get_db():
    db = getattr(g, '_database', None)
    if db is None:
        db = g._database = sqlite3.connect(DATABASE)
        db.row_factory = sqlite3.Row
    return db

@app.teardown_appcontext
def close_connection(exception):
    db = getattr(g, '_database', None)
    if db is not None:
        db.close()

def init_db():
    db = get_db()
    db.executescript('''
    CREATE TABLE IF NOT EXISTS orgs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        tagline TEXT,
        contact TEXT,
        email TEXT,
        description TEXT,
        logo TEXT
    );
    CREATE TABLE IF NOT EXISTS events (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL,
        date TEXT NOT NULL,
        venue TEXT,
        description TEXT,
        org_id INTEGER,
        FOREIGN KEY(org_id) REFERENCES orgs(id)
    );
    ''')
    db.commit()

@app.route('/api/orgs', methods=['GET'])
def list_orgs():
    db = get_db()
    cur = db.execute('SELECT * FROM orgs ORDER BY id DESC')
    rows = cur.fetchall()
    return jsonify([dict(r) for r in rows])

@app.route('/api/events', methods=['GET'])
def list_events():
    db = get_db()
    cur = db.execute('''SELECT e.*, o.name as org_name FROM events e LEFT JOIN orgs o ON e.org_id=o.id ORDER BY datetime(e.date) DESC''')
    rows = cur.fetchall()
    return jsonify([dict(r) for r in rows])

@app.route('/api/events', methods=['POST'])
def create_event():
    db = get_db()
    body = request.json or {}
    db.execute('INSERT INTO events (title, date, venue, description, org_id) VALUES (?, ?, ?, ?, ?)',
               (body.get('title'), body.get('date'), body.get('venue'), body.get('description'), body.get('org_id')))
    db.commit()
    eid = db.execute('SELECT last_insert_rowid()').fetchone()[0]
    cur = db.execute('SELECT e.*, o.name as org_name FROM events e LEFT JOIN orgs o ON e.org_id=o.id WHERE e.id=?', (eid,))
    row = cur.fetchone()
    return jsonify(dict(row)), 201

@app.route('/api/events/<int:event_id>', methods=['PUT'])
def update_event(event_id):
    db = get_db()
    body = request.json or {}
    db.execute('UPDATE events SET title=?, date=?, venue=?, description=?, org_id=? WHERE id=?',
               (body.get('title'), body.get('date'), body.get('venue'), body.get('description'), body.get('org_id'), event_id))
    db.commit()
    cur = db.execute('SELECT e.*, o.name as org_name FROM events e LEFT JOIN orgs o ON e.org_id=o.id WHERE e.id=?', (event_id,))
    row = cur.fetchone()
    return jsonify(dict(row))

@app.route('/api/events/<int:event_id>', methods=['DELETE'])
def delete_event(event_id):
    db = get_db()
    db.execute('DELETE FROM events WHERE id=?', (event_id,))
    db.commit()
    return ('', 204)

if __name__ == '__main__':
    with app.app_context():
        init_db()
        # seed example org if empty
        db = get_db()
        cur = db.execute('SELECT COUNT(*) as c FROM orgs')
        if cur.fetchone()['c'] == 0:
            db.execute('INSERT INTO orgs (name, tagline, contact, email, description, logo) VALUES (?, ?, ?, ?, ?, ?)',
                       ('Example Org', 'We run cool events', '+91-99999-99999', 'hello@example.org', 'Community-first events', 'https://via.placeholder.com/128'))
            db.commit()
    app.run(debug=True)

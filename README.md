Events Organizer (CRA frontend + Flask backend)

Frontend (React - Create React App)
  - cd frontend
  - npm install
  - npm start

Backend (Flask)
  - cd backend
  - python -m venv venv
  - source venv/bin/activate   (Linux/macOS) or venv\Scripts\activate (Windows)
  - pip install -r requirements.txt
  - python app.py

The frontend expects the backend at: http://localhost:5000/api (set in frontend/.env)

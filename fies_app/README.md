# FIES Analytics — Philippine Income Inequality System
## CS ELEC 01 — Computational Science | University of Southern Mindanao

### Project Structure
```
fies_app/
├── app.py                          ← Flask backend (Python API)
├── requirements.txt                ← Python dependencies
├── Family_Income_and_Expenditure.csv ← PSA FIES 2015 dataset
├── templates/
│   └── index.html                  ← Main HTML frontend
├── static/
│   ├── css/style.css               ← All styles
│   └── js/main.js                  ← All frontend JavaScript
└── README.md                       ← This file
```

### How to Run Locally
```bash
# 1. Install dependencies
pip install -r requirements.txt

# 2. Make sure the CSV is in the same folder as app.py

# 3. Run the Flask server
python app.py

# 4. Open your browser at:
http://localhost:5000
```

### API Endpoints
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/summary | Dataset summary stats |
| GET | /api/national | National expenditure data |
| GET | /api/regions | List of 17 regions |
| GET | /api/region/<name> | Full regional profile |
| GET | /api/burden?category=food | Ranked burden by category |
| GET | /api/all_burdens | All regions, all categories |
| GET | /api/cdf?f_prev=&f_next=&h= | Central Difference computation |
| POST | /api/trapezoidal | Trapezoidal Rule computation |
| GET | /api/export/csv | Download burden CSV |
| GET | /api/export/rates | Download rates CSV |
| GET | /api/health | Server health check |

### Deploy to Render (Free)
1. Push this folder to a GitHub repository
2. Go to https://render.com → New Web Service
3. Connect your GitHub repo
4. Set Build Command: `pip install -r requirements.txt`
5. Set Start Command: `gunicorn app:app`
6. Deploy — done!

### Numerical Methods Used
- **Central Difference Formula**: f'(xi) ≈ [f(xi+1) - f(xi-1)] / (2h)
- **Trapezoidal Rule**: ∫f(x)dx ≈ Σ (h/2)[f(xj) + f(xj+1)]

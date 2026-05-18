# FIES Analytics — Philippine Income Inequality System
## CS ELEC 01 — Computational Science | University of Southern Mindanao

## Guleng, Rico, Hadjinor

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

### Numerical Methods Used
- **Central Difference Formula**: f'(xi) ≈ [f(xi+1) - f(xi-1)] / (2h)
- **Trapezoidal Rule**: ∫f(x)dx ≈ Σ (h/2)[f(xj) + f(xj+1)]

## Live Website
[FIES Analytics Website](https://fies-aanalytics-website-1.onrender.com/)
